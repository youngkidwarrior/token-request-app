pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "./openzeppelin/ERC721Full.sol";
import "./lib/UintArrayLib.sol";
import "./lib/AddressArrayLib.sol";
import "openzeppelin-solidity/contracts/introspection/ERC165Checker.sol";

/**
 * The expected use of this app requires the FINALISE_TOKEN_REQUEST_ROLE permission be given exclusively to a forwarder.
 * A user can then request tokens by calling createTokenRequest() to deposit funds and then calling finaliseTokenRequest()
 * which will be called via the forwarder if forwarding is successful, minting the user tokens.
 */

contract TokenRequest is AragonApp {
    using SafeERC20 for ERC20;
    using UintArrayLib for uint256[];
    using AddressArrayLib for address[];
    using ERC165Checker for address;

    bytes32 public constant SET_TOKEN_MANAGER_ROLE = keccak256(
        "SET_TOKEN_MANAGER_ROLE"
    );
    bytes32 public constant SET_VAULT_ROLE = keccak256("SET_VAULT_ROLE");
    bytes32 public constant FINALISE_TOKEN_REQUEST_ROLE = keccak256(
        "FINALISE_TOKEN_REQUEST_ROLE"
    );
    bytes32 public constant MODIFY_TOKENS_ROLE = keccak256(
        "MODIFY_TOKENS_ROLE"
    );

    bytes32 public constant TOGGLE_AUCTION_ROLE = keccak256(
        "TOGGLE_AUCTION_ROLE"
    );

    string
        private constant ERROR_TOO_MANY_ACCEPTED_TOKENS = "TOKEN_REQUEST_TOO_MANY_ACCEPTED_TOKENS";
    string
        private constant ERROR_ADDRESS_NOT_CONTRACT = "TOKEN_REQUEST_ADDRESS_NOT_CONTRACT";
    string
        private constant ERROR_ACCEPTED_TOKENS_MALFORMED = "TOKEN_REQUEST_ACCEPTED_TOKENS_MALFORMED";
    string
        private constant ERROR_TOKEN_ALREADY_ACCEPTED = "TOKEN_REQUEST_TOKEN_ALREADY_ACCEPTED";
    string
        private constant ERROR_TOKEN_NOT_ACCEPTED = "TOKEN_REQUEST_TOKEN_NOT_ACCEPTED";
    string private constant ERROR_NOT_OWNER = "TOKEN_REQUEST_NOT_OWNER";
    string private constant ERROR_NOT_PENDING = "TOKEN_REQUEST_NOT_PENDING";
    string
        private constant ERROR_ETH_VALUE_MISMATCH = "TOKEN_REQUEST_ETH_VALUE_MISMATCH";
    string
        private constant ERROR_ETH_TRANSFER_FAILED = "TOKEN_REQUEST_ETH_TRANSFER_FAILED";
    string
        private constant ERROR_TOKEN_TRANSFER_REVERTED = "TOKEN_REQUEST_TOKEN_TRANSFER_REVERTED";
    string private constant ERROR_NO_REQUEST = "TOKEN_REQUEST_NO_REQUEST";

    string
        private constant ERROR_REQUESTED_MORE_THAN_ONE_NFT = "ERROR_REQUESTED_MORE_THAN_ONE_NFT";

    uint256 public constant MAX_ACCEPTED_DEPOSIT_TOKENS = 100;

    enum Status {Pending, Refunded, Finalised}

    enum Request {RequestNFT, DepositNFT, Default}

    struct TokenRequest {
        address requesterAddress;
        address depositToken;
        uint256 depositAmount;
        address requestToken;
        uint256 requestAmount;
        uint256 tokenId;
        Request isNFT;
        Status status;
    }

    TokenManager[] public tokenManagers;
    address public agentOrVault;

    address[] public acceptedDepositTokens;

    uint256 public nextTokenRequestId;

    uint256 public lastSoldBlock;

    uint256 public totalSoldNFT;

    bool public auctionStatus;

    mapping(uint256 => TokenRequest) public tokenRequests; // ID => TokenRequest

    event AddTokenManager(address tokenManager);
    event SetAgentOrVault(address agentOrVault);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event TokenRequestCreated(
        uint256 requestId,
        address requesterAddress,
        address depositToken,
        uint256 depositAmount,
        address requestToken,
        uint256 requestAmount,
        uint256 tokenId,
        string reference
    );
    event TokenRequestRefunded(
        uint256 requestId,
        address refundToAddress,
        address refundToken,
        uint256 refundAmount
    );
    event TokenRequestFinalised(
        uint256 requestId,
        address requester,
        address requestToken,
        address depositToken,
        uint256 depositAmount,
        uint256 requestAmount
    );
    event NFTSold(
        address requestToken,
        uint256 tokenId,
        uint256 totalSoldNFT,
        uint256 lastSoldBlock
    );

    event AuctionToggle(bool auctionStatus, uint256 lastSoldBlock);

    modifier tokenRequestExists(uint256 _tokenRequestId) {
        require(_tokenRequestId < nextTokenRequestId, ERROR_NO_REQUEST);
        _;
    }

    /**
     * @notice Initialize TokenRequest app contract
     * @param _tokenManagers TokenManager array
     * @param _agentOrVault Agent Or Vault address
     * @param _acceptedDepositTokens Unique list of redeemable tokens is ascending order
     */
    function initialize(
        TokenManager[] _tokenManagers,
        address _agentOrVault,
        address[] _acceptedDepositTokens
    ) external onlyInit {
        for (uint256 i = 0; i < _tokenManagers.length; i++) {
            require(isContract(_tokenManagers[i]), ERROR_ADDRESS_NOT_CONTRACT);
        }
        require(
            _acceptedDepositTokens.length <= MAX_ACCEPTED_DEPOSIT_TOKENS,
            ERROR_TOO_MANY_ACCEPTED_TOKENS
        );

        for (i = 0; i < _acceptedDepositTokens.length; i++) {
            address acceptedDepositToken = _acceptedDepositTokens[i];
            if (acceptedDepositToken != ETH) {
                require(
                    isContract(acceptedDepositToken),
                    ERROR_ADDRESS_NOT_CONTRACT
                );
            }
            if (i >= 1) {
                require(
                    _acceptedDepositTokens[i - 1] < _acceptedDepositTokens[i],
                    ERROR_ACCEPTED_TOKENS_MALFORMED
                );
            }
        }
        tokenManagers = _tokenManagers;
        agentOrVault = _agentOrVault;
        acceptedDepositTokens = _acceptedDepositTokens;
        lastSoldBlock = block.number;
        totalSoldNFT = 0;
        auctionStatus = false;

        initialized();
    }

    /**
     * @notice Add Token Manager to `_tokenManager`.
     * @param _tokenManager The new token manager address
     */
    function addTokenManager(address _tokenManager)
        external
        auth(SET_TOKEN_MANAGER_ROLE)
    {
        require(isContract(_tokenManager), ERROR_ADDRESS_NOT_CONTRACT);

        tokenManagers.push(TokenManager(_tokenManager));
        emit AddTokenManager(_tokenManager);
    }

    /**
     * @notice Set the Agent or Vault to `_agentOrVault`.
     * @param _agentOrVault The new vault address
     */
    function setAgentOrVault(address _agentOrVault)
        external
        auth(SET_VAULT_ROLE)
    {
        agentOrVault = _agentOrVault;
        emit SetAgentOrVault(_agentOrVault);
    }

    /**
     * @notice Add `_token.symbol(): string` to the accepted deposit token request tokens
     * @param _token token address
     */
    function addToken(address _token) external auth(MODIFY_TOKENS_ROLE) {
        require(
            !acceptedDepositTokens.contains(_token),
            ERROR_TOKEN_ALREADY_ACCEPTED
        );
        require(
            acceptedDepositTokens.length < MAX_ACCEPTED_DEPOSIT_TOKENS,
            ERROR_TOO_MANY_ACCEPTED_TOKENS
        );

        if (_token != ETH) {
            require(isContract(_token), ERROR_ADDRESS_NOT_CONTRACT);
        }

        acceptedDepositTokens.push(_token);

        emit TokenAdded(_token);
    }

    /**
     * @notice Remove `_token.symbol(): string` from the accepted deposit token request tokens
     * @param _token token address
     */
    function removeToken(address _token) external auth(MODIFY_TOKENS_ROLE) {
        require(
            acceptedDepositTokens.deleteItem(_token),
            ERROR_TOKEN_NOT_ACCEPTED
        );

        emit TokenRemoved(_token);
    }

    /**
     * @notice Create a token request depositing `@tokenAmount(_depositToken, _depositAmount, true)` in exchange for `@tokenAmount(_requestToken, _requestAmount,_requestTokenId true)`
     * @param _depositToken Address of the token being deposited
     * @param _depositAmount Amount of the token being deposited
     * @param _requestToken Address of the token being requested
     * @param _requestAmount Amount of the token being requested
     * @param _requestTokenId ID of the token being requested (only applies to NFTs)
     * @param _reference String detailing request reason
     */
    function createTokenRequest(
        address _depositToken,
        uint256 _depositAmount,
        address _requestToken,
        uint256 _requestAmount,
        uint256 _requestTokenId,
        string _reference
    ) external payable returns (uint256) {
        require(
            acceptedDepositTokens.contains(_depositToken),
            ERROR_TOKEN_NOT_ACCEPTED
        );
        if (_depositToken == ETH) {
            require(msg.value == _depositAmount, ERROR_ETH_VALUE_MISMATCH);
        } else {
            require(
                ERC20(_depositToken).safeTransferFrom(
                    msg.sender,
                    address(this),
                    _depositAmount
                ),
                ERROR_TOKEN_TRANSFER_REVERTED
            );
        }

        uint256 tokenRequestId = nextTokenRequestId;
        nextTokenRequestId++;
        Request isNFT;
        if (requestNFT(_requestToken)) {
            isNFT = Request.RequestNFT;
        } else if (requestNFT(_depositToken)) {
            isNFT = Request.DepositNFT;
        } else {
            isNFT = Request.Default;
        }

        if (isNFT == Request.RequestNFT) {
            require(_requestAmount == 1, ERROR_REQUESTED_MORE_THAN_ONE_NFT);
        } else if (isNFT == Request.DepositNFT) {
            require(_depositAmount == 1, ERROR_REQUESTED_MORE_THAN_ONE_NFT);
        }

        tokenRequests[tokenRequestId] = TokenRequest(
            msg.sender,
            _depositToken,
            _depositAmount,
            _requestToken,
            _requestAmount,
            _requestTokenId,
            isNFT,
            Status.Pending
        );

        emit TokenRequestCreated(
            tokenRequestId,
            msg.sender,
            _depositToken,
            _depositAmount,
            _requestToken,
            _requestAmount,
            _requestTokenId,
            _reference
        );

        return tokenRequestId;
    }

    /**
     * @notice Refund `@tokenAmount(self.getTokenRequest(_tokenRequestId): (address, <address>), self.getTokenRequest(_tokenRequestId): (address, address, <uint>, uint))` to `self.getTokenRequest(_tokenRequestId): address`, this will invalidate the request for `@tokenAmount(self.getToken(): address, self.getTokenRequest(_tokenRequestId): (address, address, uint, <uint>))`
     * @param _tokenRequestId ID of the Token Request
     */
    function refundTokenRequest(uint256 _tokenRequestId)
        external
        nonReentrant
        tokenRequestExists(_tokenRequestId)
    {
        TokenRequest storage tokenRequest = tokenRequests[_tokenRequestId];
        require(tokenRequest.requesterAddress == msg.sender, ERROR_NOT_OWNER);
        require(tokenRequest.status == Status.Pending, ERROR_NOT_PENDING);

        tokenRequest.status = Status.Refunded;

        address refundToAddress = tokenRequest.requesterAddress;
        address refundToken = tokenRequest.depositToken;
        uint256 refundAmount = tokenRequest.depositAmount;
        uint256 tokenId = tokenRequest.tokenId;

        if (refundAmount > 0) {
            if (refundToken == ETH) {
                (bool success, ) = refundToAddress.call.value(refundAmount)();
                require(success, ERROR_ETH_TRANSFER_FAILED);
            } else {
                require(
                    ERC20(refundToken).safeTransfer(
                        refundToAddress,
                        refundAmount
                    ),
                    ERROR_TOKEN_TRANSFER_REVERTED
                );
            }
        }

        emit TokenRequestRefunded(
            _tokenRequestId,
            refundToAddress,
            refundToken,
            refundAmount
        );
    }

    /**
     * @notice Approve  `self.getTokenRequest(_tokenRequestId): address`'s request for `@tokenAmount(self.getToken(): address, self.getTokenRequest(_tokenRequestId): (address, address, uint, <uint>))` in exchange for `@tokenAmount(self.getTokenRequest(_tokenRequestId): (address, <address>), self.getTokenRequest(_tokenRequestId): (address, address, <uint>, uint))`
     * @dev This function's FINALISE_TOKEN_REQUEST_ROLE permission is typically given exclusively to a forwarder.
     *      This function requires the MINT_ROLE permission on the TokenManager specified.
     * @param _tokenRequestId ID of the Token Request
     */
    function finaliseTokenRequest(uint256 _tokenRequestId)
        external
        nonReentrant
        tokenRequestExists(_tokenRequestId)
        auth(FINALISE_TOKEN_REQUEST_ROLE)
    {
        TokenRequest storage tokenRequest = tokenRequests[_tokenRequestId];
        require(tokenRequest.status == Status.Pending, ERROR_NOT_PENDING);

        tokenRequest.status = Status.Finalised;

        address requesterAddress = tokenRequest.requesterAddress;
        address requestToken = tokenRequest.requestToken;
        address depositToken = tokenRequest.depositToken;
        uint256 depositAmount = tokenRequest.depositAmount;
        uint256 requestAmount = tokenRequest.requestAmount;
        uint256 tokenId = tokenRequest.tokenId;
        Request isNFT = tokenRequest.isNFT;

        if (depositAmount > 0) {
            if (depositToken == ETH) {
                (bool success, ) = agentOrVault.call.value(depositAmount)();
                require(success, ERROR_ETH_TRANSFER_FAILED);
            } else {
                require(
                    ERC20(depositToken).safeTransfer(
                        agentOrVault,
                        depositAmount
                    ),
                    ERROR_TOKEN_TRANSFER_REVERTED
                );
            }
        }

        if (isNFT == Request.RequestNFT) {
            ERC721(requestToken).safeTransferFrom(
                agentOrVault,
                requesterAddress,
                tokenId
            );
            totalSoldNFT++;
            lastSoldBlock = now;
            emit NFTSold(requestToken, tokenId, totalSoldNFT, lastSoldBlock);
        } else if (isNFT == Request.DepositNFT) {
            ERC721(requestToken).safeTransferFrom(
                requesterAddress,
                agentOrVault,
                tokenId
            );
        } else {
            TokenManager tokenManager;
            for (uint256 i = 0; i < tokenManagers.length; i++) {
                if (requestToken == address(tokenManagers[i].token)) {
                    tokenManager = tokenManagers[i];
                }
            }
            tokenManager.mint(requesterAddress, requestAmount);
        }

        emit TokenRequestFinalised(
            _tokenRequestId,
            requesterAddress,
            requestToken,
            depositToken,
            depositAmount,
            requestAmount
        );
    }

    function toggleAuction() external auth(TOGGLE_AUCTION_ROLE) {
        auctionStatus = !auctionStatus;
        if (auctionStatus) {
            lastSoldBlock = block.number;
        }
        emit AuctionToggle(auctionStatus, lastSoldBlock);
    }

    function getAcceptedDepositTokens() public view returns (address[]) {
        return acceptedDepositTokens;
    }

    function getTokenRequest(uint256 _tokenRequestId)
        public
        view
        returns (
            address requesterAddress,
            address requestToken,
            address depositToken,
            uint256 depositAmount,
            uint256 requestAmount
        )
    {
        TokenRequest storage tokenRequest = tokenRequests[_tokenRequestId];

        requesterAddress = tokenRequest.requesterAddress;
        requestToken = tokenRequest.requestToken;
        depositToken = tokenRequest.depositToken;
        depositAmount = tokenRequest.depositAmount;
        requestAmount = tokenRequest.requestAmount;
    }

    function getTokenManagers() public view returns (TokenManager[]) {
        return tokenManagers;
    }

    /**
     * @dev Convenience function for getting the token request token in a radspec string
     */
    function getTokens() public returns (address[]) {
        address[] memory tokens;
        for (uint256 i = 0; i < tokenManagers.length; i++) {
            tokens[i] = tokenManagers[i].token();
        }
        return tokens;
    }

    /**
     * @dev Disable recovery escape hatch, as it could be used
     *      maliciously to transfer funds away from TokenRequest
     */
    function allowRecoverability(address token) public view returns (bool) {
        return false;
    }

    function requestNFT(address _tokenAddress) internal returns (bool) {
        return _tokenAddress._supportsInterface(0x80ac58cd);
    }
}
