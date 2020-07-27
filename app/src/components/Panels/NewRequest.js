import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import {
  Button,
  Field,
  Text,
  TextInput,
  theme,
  GU,
  IconCross,
  useTheme,
  textStyle,
  Info,
  Link,
  unselectable,
} from '@aragon/ui'
import { useAppState, useNetwork } from '@aragon/api-react'
import { useAragonApi, useApi } from '@aragon/api-react'
import TokenSelector from '../TokenSelector'
import { addressesEqual, isAddress } from '../../lib/web3-utils'
import { fromDecimals, toDecimals } from '../../lib/math-utils'
import { ETHER_TOKEN_FAKE_ADDRESS, tokenDataFallback, getTokenSymbol } from '../../lib/token-utils'
import tokenBalanceOfAbi from '../../abi/token-balanceof.json'
import tokenDecimalsAbi from '../../abi/token-decimals.json'
import tokenSymbolAbi from '../../abi/token-symbol.json'
import { BN } from 'bn.js'

const TOKEN_ALLOWANCE_WEBSITE = 'https://tokenallowance.io/'
const NO_ERROR = Symbol('NO_ERROR')
const BALANCE_NOT_ENOUGH_ERROR = Symbol('BALANCE_NOT_ENOUGH_ERROR')
const DECIMALS_TOO_MANY_ERROR = Symbol('DECIMALS_TOO_MANY_ERROR')

const tokenAbi = [].concat(tokenBalanceOfAbi, tokenDecimalsAbi, tokenSymbolAbi)

const initialState = {
  amount: {
    error: NO_ERROR,
    value: '',
  },
  selectedToken: {
    coerced: false, // whether the token was coerced from a symbol to an address
    error: NO_ERROR,
    index: -1,
    value: '',
    data: {},
  },
  selectedOrgToken: {
    coerced: false, // whether the token was coerced from a symbol to an address
    error: NO_ERROR,
    index: -1,
    value: '',
    data: {},
  },
  reference: '',
  depositErrorMessage: '',
  submitButtonDisabled: false,
  isTokenSelected: false,
  orgToken: [],
}

const NewRequest = React.memo(({ panelOpened, acceptedTokens, onRequest, connectedAccount, selectedNFT, selectNFT }) => {
  const { orgTokens, nftTokens } = useAppState()
  const network = useNetwork()
  const api = useApi()
  const requestTokenId = 0
  const isMainnet = network.type === 'main'
  const [selectedToken, setSelectedToken] = useState({ ...initialState.selectedToken })
  const [selectedOrgToken, setSelectedOrgToken] = useState({ ...initialState.selectedOrgToken })
  const [depositedAmount, setDepositedAmount] = useState({ ...initialState.amount })
  const [reference, setReference] = useState(initialState.reference)
  const [requestedAmount, setRequestedAmount] = useState('')
  const [tokenBalanceMessage, setTokenBalanceMessage] = useState('')
  const [depositErrorMessage, setDepositErrorMessage] = useState(initialState.depositErrorMessage)
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(initialState.submitButtonDisabled)
  const [isTokenSelected, setIsTokenSelected] = useState(initialState.isTokenSelected)
  const [orgToken, setOrgToken] = useState(initialState.orgToken)
  const [combinedOrgTokens, setCombinedOrgToken] = useState([])

  useEffect(() => {
    setCombinedOrgToken([...orgTokens, ...nftTokens])
  }, [orgTokens, nftTokens])

  useEffect(() => {
    if (acceptedTokens && acceptedTokens.length > 0) {
      if (selectedToken.index === -1) {
        setSelectedToken({
          ...initialState.selectedToken,
          index: 0,
          value: acceptedTokens[0].address,
        })
      }
    }
  }, [acceptedTokens])

  useEffect(() => {
    if (combinedOrgTokens && combinedOrgTokens.length > 0) {
      if (selectedOrgToken.index === -1) {
        const index = selectedNFT.address
          ? combinedOrgTokens.findIndex(
              (token) => token.address === selectedNFT.address && token.tokenId === selectedNFT.tokenId
            )
          : 0
        const value = selectedNFT.address ? selectedNFT.address : combinedOrgTokens[0].address
        
        setSelectedOrgToken({
          ...initialState.selectedOrgToken,
          index,
          value,
        })
      }
    }
  }, [combinedOrgTokens, selectedNFT])

  useEffect(() => {
    async function getTokenData() {
      const selectedTokenData = await loadTokenData(selectedToken.value)

      setSelectedToken({ ...selectedToken, data: { ...selectedTokenData } })
      setTokenBalanceMessage(renderBalanceForSelectedToken(selectedTokenData))

      const orgTokenData = await loadTokenData(selectedOrgToken.value)
      setSelectedOrgToken({ ...selectedOrgToken, data: { ...orgTokenData } })
    }
    if (selectedToken.index != -1 && selectedOrgToken.index != -1) {
      getTokenData()
      const ethSelected =
        isAddress(selectedToken.value) && addressesEqual(selectedToken.value, ETHER_TOKEN_FAKE_ADDRESS)
      const tokenSelected = selectedToken.value && !ethSelected && !selectedNFT.address
      setIsTokenSelected(tokenSelected)
    }
  }, [selectedToken.index, selectedOrgToken.index, combinedOrgTokens])

  useEffect(() => {
    if (!panelOpened) {
      if (acceptedTokens.length > 0) {
        setSelectedToken((token) => ({
          ...initialState.selectedToken,
          data: { ...token.data },
          index: 0,
          value: acceptedTokens[0].address,
        }))
      }
      setDepositedAmount({ ...initialState.amount })
      setRequestedAmount('')
      setReference(initialState.reference)
    }
  }, [panelOpened])

  useEffect(() => {
    let tokens = []

    for (let token of combinedOrgTokens) {
      if (
        combinedOrgTokens &&
        !orgToken.find((element) => {
          return element.address === token.address
        })
      ) {
        tokens = orgToken.concat(token)
      }
    }
    setOrgToken(tokens)
  }, [combinedOrgTokens])

  useEffect(() => {
    let errorMessage
    if (depositedAmount.error === BALANCE_NOT_ENOUGH_ERROR) {
      errorMessage = 'Amount is greater than balance held'
    } else if (depositedAmount.error === DECIMALS_TOO_MANY_ERROR) {
      errorMessage = 'Amount contains too many decimal places'
    }
    const disabled = !!errorMessage || !(selectedToken.value && !selectedToken.data.loading)
    setDepositErrorMessage(errorMessage)
    setSubmitButtonDisabled(disabled)
  }, [depositedAmount, selectedToken])

  const renderBalanceForSelectedToken = (selectedToken) => {
    const { decimals, loading, symbol, userBalance } = selectedToken

    if (loading || !userBalance) {
      return ''
    }
    return userBalance === '-1'
      ? `Your balance could not be found for ${symbol}`
      : `You have ${userBalance === '0' ? 'no' : fromDecimals(userBalance, decimals)} ${symbol} available`
  }

  const handleFormSubmit = useCallback(
    (e) => {
      e.preventDefault()
      const depositAmount = toDecimals(depositedAmount.value, selectedToken.data.decimals)
      // hard coded need to get tokenId from smart contract or somewhere
      const requestTokenId = selectedNFT.address ? selectedNFT.tokenId : 0
      const requested = toDecimals(requestedAmount, Number(selectedOrgToken.data.decimals))
      onRequest(selectedToken.value, depositAmount, selectedOrgToken.value, requested, requestTokenId, reference)
    },
    [onRequest, selectedToken, depositedAmount, selectedOrgToken, requestedAmount, requestTokenId, reference]
  )

  const handleRequestedAmountUpdate = useCallback((e) => {
    setRequestedAmount(e.target.value)
  })

  const handleAmountUpdate = useCallback(
    (e) => {
      validateInputs({
        amount: {
          value: e.target.value,
        },
      })
    },
    [depositedAmount]
  )

  const handleReferenceUpdate = useCallback((e) => {
    setReference(e.target.value)
  })

  const handleSelectedToken = useCallback(({ address, index, value }) => {
    const tokenIsAddress = isAddress(address)
    const token = {
      index,
      coerced: tokenIsAddress && address !== value,
      value: address,
      data: { loading: true },
    }
    if (!tokenIsAddress) {
      return
    }
    setSelectedToken(token)
  })

  const handleSelectedOrgToken = useCallback(({ address, index, value, tokenId }) => {
    const tokenIsAddress = isAddress(address)
    const token = {
      index,
      coerced: tokenIsAddress && address !== value,
      value: address,
      data: { loading: true },
    }
    if (!tokenIsAddress) {
      return
    }
    if (tokenId) {
      const nftToken = nftTokens.find((token) => token.address === address && token.tokenId == tokenId)
      selectNFT(nftToken)
    }

    setSelectedOrgToken(token)
  })

  const loadTokenData = async (address) => {
    // ETH
    if (addressesEqual(address, ETHER_TOKEN_FAKE_ADDRESS)) {
      const userBalance = await api
        .web3Eth('getBalance', connectedAccount)
        .toPromise()
        .catch(() => '-1')

      return {
        decimals: 18,
        loading: false,
        symbol: 'ETH',
        userBalance,
      }
    }

    // Tokens
    const token = api.external(address, tokenAbi)

    const userBalance = await token
      .balanceOf(connectedAccount)
      .toPromise()
      .catch(() => '-1')

    const decimalsFallback = tokenDataFallback(address, 'decimals', network.type) || '0'
    const symbolFallback = tokenDataFallback(address, 'symbol', network.type) || ''

    const tokenData = {
      userBalance,
      decimals: parseInt(decimalsFallback, 10),
      loading: false,
      symbol: symbolFallback,
    }

    const [tokenSymbol, tokenDecimals] = await Promise.all([
      getTokenSymbol(api, address).catch(() => ''),
      token
        .decimals()
        .toPromise()
        .then((decimals) => parseInt(decimals, 10))
        .catch(() => ''),
    ])

    // If symbol or decimals are resolved, overwrite the fallbacks
    if (tokenSymbol) {
      tokenData.symbol = tokenSymbol
    }
    if (tokenDecimals) {
      tokenData.decimals = tokenDecimals
    }

    return tokenData
  }

  const validateInputs = ({ amount, token } = {}) => {
    amount = amount || depositedAmount
    token = token || selectedToken.data
    if (token) {
      if (amount.value && token.decimals) {
        // Adjust but without truncation in case the user entered a value with more
        // decimals than possible
        const adjustedAmount = toDecimals(amount.value, token.decimals, {
          truncate: false,
        })

        if (adjustedAmount.indexOf('.') !== -1) {
          setDepositedAmount({ ...amount, error: DECIMALS_TOO_MANY_ERROR })
          return false
        }

        if (token.userBalance && new BN(adjustedAmount).gt(new BN(token.userBalance))) {
          setDepositedAmount({ ...amount, error: BALANCE_NOT_ENOUGH_ERROR })
          return false
        }
      }
    }

    setDepositedAmount({ ...amount, error: NO_ERROR })
    return true
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      css={`
        margin-top: ${3 * GU}px;
      `}
    >
      <Field label="Requested amount" required>
        <CombinedInput>
          <TextInput.Number
            value={requestedAmount}
            onChange={handleRequestedAmountUpdate}
            min={0}
            max={selectedNFT.address ? 1 : null}
            step="any"
            required
            wide
          />
          <TokenSelector
            activeIndex={combinedOrgTokens.length === 1 ? 0 : selectedOrgToken.index}
            onChange={handleSelectedOrgToken}
            tokens={combinedOrgTokens}
            disabled={combinedOrgTokens.length === 1}
          />
        </CombinedInput>
      </Field>

      <Field label="Offered amount" required>
        <CombinedInput>
          <TextInput.Number
            value={depositedAmount.value}
            onChange={handleAmountUpdate}
            min={0}
            step="any"
            required
            wide
          />
          <TokenSelector
            activeIndex={acceptedTokens.length === 1 ? 0 : selectedToken.index}
            onChange={handleSelectedToken}
            tokens={acceptedTokens}
            disabled={acceptedTokens.length === 1}
          />
        </CombinedInput>
      </Field>
      <TokenBalance>
        <Text size="small" color={theme.textSecondary}>
          {tokenBalanceMessage}
        </Text>
      </TokenBalance>
      <Field label="Reference (optional)">
        <TextInput onChange={handleReferenceUpdate} value={reference} wide />
      </Field>
      <ButtonWrapper>
        <Button wide mode="strong" type="submit" disabled={submitButtonDisabled}>
          Create request
        </Button>
      </ButtonWrapper>
      {depositErrorMessage && <ValidationError message={depositErrorMessage} />}
      <VSpace size={3} />
      <Info>
        {isMainnet && (
          <p>
            Remember, Mainnet organizations use <strong>real tokens</strong>.
          </p>
        )}
        <p>
          Configure your request above, and sign the transaction with your wallet after clicking “Create request”. It
          will then show up in your Token request app once processed. It will need to be submitted by someone with
          permission to create proposals, you will be able to withdraw your funds from the request at any time before
          the proposal is approved.
        </p>
        {isTokenSelected && (
          <React.Fragment>
            <p
              css={`
                margin-top: ${1 * GU}px;
              `}
            >
              Tokens may require a pretransaction to approve the Token request app for your deposit.{' '}
              <Link href={TOKEN_ALLOWANCE_WEBSITE} target="_blank">
                Find out why.
              </Link>{' '}
            </p>
          </React.Fragment>
        )}
      </Info>
    </form>
  )
})

const ButtonWrapper = styled.div`
  padding-top: 10px;
`
const CombinedInput = styled.div`
  display: flex;
  input[type='text'] {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 0;
  }
  input[type='text'] + div > div:first-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
`
const TokenBalance = styled.div`
  margin: 10px 0 20px;
`

const VSpace = styled.div`
  height: ${(p) => (p.size || 1) * 5}px;
`

const ValidationError = ({ message }) => {
  const theme = useTheme()
  return (
    <div>
      <VSpace size={2} />
      <div
        css={`
          display: flex;
          align-items: center;
        `}
      >
        <IconCross
          size="tiny"
          css={`
            color: ${theme.negative};
            margin-right: ${1 * GU}px;
          `}
        />
        <span
          css={`
            ${textStyle('body3')}
          `}
        >
          {message}
        </span>
      </div>
    </div>
  )
}

export default (props) => {
  const { api, connectedAccount, network } = useAragonApi()
  return network && api ? (
    <NewRequest api={api} connectedAccount={connectedAccount} network={network} {...props} />
  ) : null
}
