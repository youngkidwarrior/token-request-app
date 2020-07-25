import React, { useState, useEffect } from 'react'
import { Box, Text, Card, CardLayout } from '@aragon/ui'
import { evaluateNFTPrice } from '../lib/token-utils'
import { useApi } from '@aragon/api-react'
// import { useConnectedAccount } from '@aragon/api-react'
// import { addressesEqual } from '../lib/web3-utils'
const BASE_NFT_VALUE = 1

const NFTGallery = React.memo(
  ({ nftTokens, lastSoldBlock, totalSoldNFT, tokens, onSubmit, onWithdraw, ownRequests, onSelectRequest }) => {
    console.log('nftTokens: ', nftTokens);
    const [nftPrice, setNFTPrice] = useState(0)
    const [valueDepreciated, setValueDepreciation] = useState(0)
    const [blockNumber, setBlockNumber] = useState(0)
    const api = useApi()

    useEffect(() => {
      api.web3Eth('getBlockNumber').subscribe(setBlockNumber)
      console.log('blockNumber: ', blockNumber)
      function calculateNFTPrice() {
        const { evaluatedPrice, timeDepreciation } = evaluateNFTPrice(
          BASE_NFT_VALUE,
          blockNumber,
          lastSoldBlock,
          totalSoldNFT
        )
        setNFTPrice(evaluatedPrice)
        setValueDepreciation(timeDepreciation)
      }
      calculateNFTPrice()
    }, [api, blockNumber, totalSoldNFT])

    return (
      <>
        <Box style={{}}>
          <Text>Current NFT Price: {nftPrice} </Text>
          <Text>Depreciation Since Last Sale: {valueDepreciated}</Text>
        </Box>
        <CardLayout>
          {nftTokens.map((nft) => (
            <Card>
              <Text>NFT</Text>
            </Card>
          ))}
        </CardLayout>
      </>
    )
  }
)

export default NFTGallery
