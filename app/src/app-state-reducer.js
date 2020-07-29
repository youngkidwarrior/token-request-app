import { hasLoadedtokenRequestSettings } from './lib/token-request-settings'
import { compareDesc } from 'date-fns'

function appStateReducer(state) {
  const ready = hasLoadedtokenRequestSettings(state)
  if (!ready) {
    return { ...state, ready }
  }
  const {
    requests = [],
    acceptedTokens = [],
    nftTokens = [
      {
        address: '0x29D7d1dd5B6f9C864d9db560D72a247c178aE86B',
        tokenId: 0,
        symbol: 'DUM',
        name: 'DO NOT SEND 1',
        uri: 'https://i.imgur.com/0MkDli1.jpeg',
      },
      {
        address: '0x29D7d1dd5B6f9C864d9db560D72a247c178aE86B',
        tokenId: 1,
        symbol: 'DUM2',
        name: 'DO NOT SEND 2',
        uri: '',
      },
    ],
    auctionStatus = false
  } = state

  return {
    ...state,
    acceptedTokens,
    ready,
    requests: requests.sort(({ date: dateLeft }, { date: dateRight }) =>
      // Sort by date descending
      compareDesc(dateLeft, dateRight)
    ),
    nftTokens,
    auctionStatus
  }
}

export default appStateReducer
