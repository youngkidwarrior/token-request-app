import React, { useState, useEffect } from 'react'
import {
  Box,
  Tag,
  Text,
  Card,
  CardLayout,
  Button,
  TokenBadge,
  useTheme,
  GU,
  Split,
  DropDown,
  ContextMenu,
  ContextMenuItem,
  LoadingRing,
} from '@aragon/ui'
import { evaluateNFTPrice } from '../lib/token-utils'
import { useApi, useNetwork, useAppState } from '@aragon/api-react'
import erc721Logo from '../assets/721_cover.gif'
const BASE_NFT_VALUE = 1
const DEPRECIATE_BLOCK_INTERVAL = 10000

const NFTGallery = React.memo(({ nftTokens, lastSoldBlock, totalSoldNFT, selectNFT, openPanel, blockTicker }) => {
  const [nextPriceDepreciation, setNextPriceDepreciation] = useState(0)
  const [nftPrice, setNFTPrice] = useState(BASE_NFT_VALUE)
  const api = useApi()
  const network = useNetwork()
  const theme = useTheme()

  useEffect(() => {
    const [evaluatedPrice, timeDepreciation] = evaluateNFTPrice(
      BASE_NFT_VALUE,
      blockTicker,
      lastSoldBlock,
      totalSoldNFT
    )
    evaluatedPrice ? setNFTPrice(evaluatedPrice) : null
    const blocksTillNextDepreciation = DEPRECIATE_BLOCK_INTERVAL - blockTicker
    setNextPriceDepreciation(blocksTillNextDepreciation)
  }, [api, blockTicker, totalSoldNFT])

  function handleSelectNFT(token) {
    selectNFT(token)
    openPanel()
  }

  return (
    <>
      <Split
        invert={'horizontal'}
        primary={
          nftTokens ? (
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
                  onClick={() => handleSelectNFT(token)}
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

                  <img
                    css={`
                      max-width: 100%;
                      max-height: 100%;
                    `}
                    src={erc721Logo}
                  />
                  <div
                    css={`
                      flex-shrink: 0;
                      position: absolute;
                      bottom: 0.5rem;
                      right: 0.5rem;
                    `}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ContextMenu zIndex={100}>
                      <ContextMenuItem
                        onClick={({ event }) => event.stopPropagation()}
                        href={'http://etherscan.io/token/' + token.address}
                        key={1}
                      >
                        <span
                          css={`
                            margin-left: ${1 * GU}px;
                          `}
                        >
                          View on EtherScan
                        </span>
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => e.stopPropagation()} href={token.uri} key={2}>
                        <span
                          css={`
                            margin-left: ${1 * GU}px;
                          `}
                        >
                          View URI
                        </span>
                      </ContextMenuItem>
                    </ContextMenu>
                  </div>
                </Card>
              ))}
            </CardLayout>
          ) : (
            <Box style={{ textAlign: 'center' }}>
              <Text>No NFTs</Text>
            </Box>
          )
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
                  <span>Current Price</span>
                  {nftPrice ? <span> {nftPrice + ' ETH'} </span> : <LoadingRing />}
                </li>
                <li
                  css={`
                    display: flex;
                    justify-content: space-between;
                    list-style: none;
                    & + & {
                      margin-top: ${2 * GU}px;
                    }
                  `}
                >
                  <span>Blocks Till Discount</span>
                  <span>{nftTokens ? nextPriceDepreciation : 'N/A'}</span>
                </li>
              </ul>
            </Box>
            <Box heading="Tokens">
              {nftTokens ? (
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
              ) : (
                <Text>No NFTs</Text>
              )}
            </Box>
          </>
        }
      />
    </>
  )
})

export default NFTGallery
