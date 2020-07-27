import React, { useState, useEffect } from 'react'
import { Box, Tag, Text, Card, CardLayout, Button, TokenBadge, useTheme, GU, Split } from '@aragon/ui'
import { evaluateNFTPrice } from '../lib/token-utils'
import { useApi, useNetwork } from '@aragon/api-react'
// import { useConnectedAccount } from '@aragon/api-react'
// import { addressesEqual } from '../lib/web3-utils'
import erc721Logo from '../assets/721_cover.gif'
const BASE_NFT_VALUE = 1
const DEPRECIATE_BLOCK_INTERVAL = 1000

const NFTGallery = React.memo(
  ({ nftTokens, lastSoldBlock, totalSoldNFT, selectNFT, setPrice, nftPrice, openPanel }) => {
    const [nextBlockDepreciation, setNextBlockDepreciation] = useState(0)
    const [blockNumber, setBlockNumber] = useState(0)

    const api = useApi()
    const network = useNetwork()
    const theme = useTheme()
    nftTokens = [
      {
        address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
        tokenId: '0',
        name: 'First Token Made by Victor to support cancer ',
        symbol: 'FRST',
      },
      { address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', tokenId: '0', name: 'Second Token', symbol: 'SCND' },
      { address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', tokenId: '0', name: 'Third Token', symbol: 'THRD' },
      { address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', tokenId: '0', name: 'Fourth Token', symbol: 'FRTH' },

      { address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', tokenId: '0', name: 'Fifth Token', symbol: 'FFTH' },

      { address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', tokenId: '0', name: 'Sixth Token', symbol: 'SXTH' },

      { address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', tokenId: '0', name: 'Seventh Token', symbol: 'SVTH' },

      { address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', tokenId: '0', name: 'Eight Token', symbol: 'EIGTH' },

      { address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', tokenId: '0', name: 'Ninth Token', symbol: 'NINTH' },
      { address: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', tokenId: '0', name: 'Tenth Token', symbol: 'TENTH' },
    ]

    useEffect(() => {
      api.web3Eth('getBlockNumber').subscribe(setBlockNumber)
      function calculateNFTPrice() {
        const { evaluatedPrice, timeDepreciation } = evaluateNFTPrice(
          BASE_NFT_VALUE,
          blockNumber,
          lastSoldBlock,
          totalSoldNFT
        )
        setPrice(evaluatedPrice)
      }
      calculateNFTPrice()
      const timeTillNextDepreciation = DEPRECIATE_BLOCK_INTERVAL - ((blockNumber - lastSoldBlock) % 1000)
      setNextBlockDepreciation(timeTillNextDepreciation)
    }, [api, blockNumber, totalSoldNFT])

    function handleSelectNFT(token) {
      selectNFT(token)
      openPanel()
    }

    return (
      <>
        <Split
          invert={'horizontal'}
          primary={
            <CardLayout
              css={`
                margin-top: 1rem;
              `}
            >
              {nftTokens.map((token, index) => (
                <Card
                  css={`
                    text-align: center;
                    padding: 0.5rem 0.5rem 1rem 0.5rem;
                  `}
                  width="500px"
                  height="500px"
                  onClick={handleSelectNFT}
                  key={index}
                >
                  <div
                    css={`
                      flex-shrink: 0;
                      position: absolute;
                      top: 0.5rem;
                      left: 0.5rem;
                    `}
                  >
                    {<Tag mode="identifier">{index + 1}</Tag>}
                  </div>
                  <div
                    css={`
                      flex-shrink: 0;
                      position: absolute;
                      top: 0.5rem;
                      right: 0.5rem;
                    `}
                  >
                    {token.symbol && <Tag mode="identifier">{token.symbol}</Tag>}
                  </div>
                  {/* <Text>{token.name}</Text> */}

                  <img
                    css={`
                      max-width: 100%;
                      max-height: 100%;
                    `}
                    src={erc721Logo}
                  />
                  {/* <Text>{token.name}</Text> */}
                  <Button
                    href={'http://etherscan.io/token/' + token.address}
                    onClick={(e) => e.stopPropagation()}
                    label="View On Etherscan"
                    wide
                    css={`
                      margin: 0 1rem;
                    `}
                  ></Button>
                </Card>
              ))}
            </CardLayout>
          }
          secondary={
            <>
              <Box heading="Price">
                <ul>
                  <li
                    css={`
                      display: flex;
                      justify-content: space-between;
                      list-style: none;
                    `}
                  >
                    <Text>Current Price: {nftPrice} ETH </Text>
                  </li>
                  <li
                    css={`
                      display: flex;
                      justify-content: space-between;
                      list-style: none;
                    `}
                  >
                    <Text>Blocks Till Discount: {nextBlockDepreciation}</Text>
                  </li>
                </ul>
              </Box>
              <Box heading="Tokens">
                <ul>
                  {nftTokens.map((token, index) => (
                    <li
                      key={index}
                      css={`
                        display: flex;
                        justify-content: space-between;
                        list-style: none;
                        color: ${theme.surfaceContent};
                        & + & {
                          margin-top: ${2 * GU}px;
                        }
                        > span:nth-child(1) {
                          color: ${theme.surfaceContentSecondary};
                        }
                        > span:nth-child(2) {
                          // “:” is here for accessibility reasons, we can hide it
                          opacity: 0;
                          width: 10px;
                        }
                        > span:nth-child(3) {
                          flex-shrink: 1;
                        }
                        > strong {
                          text-transform: uppercase;
                        }
                      `}
                    >
                      <span>{index + 1}</span>
                      <span>.</span>
                      <TokenBadge
                        address={token.address}
                        name={token.name}
                        symbol={token.symbol}
                        networkType={network && network.type}
                      />
                    </li>
                  ))}
                </ul>
              </Box>
            </>
          }
        />
      </>
    )
  }
)

export default NFTGallery
