import React from 'react'
import { Box, Text, Card, CardLayout } from '@aragon/ui'
// import { useConnectedAccount } from '@aragon/api-react'
// import { addressesEqual } from '../lib/web3-utils'

const NFT = React.memo(({ nftList, token, onSubmit, onWithdraw, ownRequests, onSelectRequest }) => {
  //   const filteredRequests = ownRequests
  //     ? requests && requests.filter((r) => addressesEqual(r.requesterAddress, useConnectedAccount()))
  //     : requests
  return (
    <>
      {/* {nftList.map((nft) => ( */}
        <Box style={{ textAlign: 'center' }}>
          <CardLayout>
            <Card><Text>NFT</Text></Card>
            <Card><Text>NFT</Text></Card>
            <Card><Text>NFT</Text></Card>
            <Card><Text>NFT</Text></Card>
          </CardLayout>
        </Box>
      {/* ))} */}
    </>
  )
})

export default NFT
