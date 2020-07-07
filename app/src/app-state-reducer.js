import { hasLoadedtokenRequestSettings } from './lib/token-request-settings'
import { compareDesc } from 'date-fns'

function appStateReducer(state) {
  const ready = hasLoadedtokenRequestSettings(state)

  if (!ready) {
    return { ...state, ready }
  }

  const { requests = [], acceptedTokens = [], nftList = [] } = state

  return {
    ...state,
    acceptedTokens,
    ready,
    requests: requests.sort(({ date: dateLeft }, { date: dateRight }) =>
      // Sort by date descending
      compareDesc(dateLeft, dateRight)
    ),
    nftList: nftList.sort(({ date: dateLeft }, { date: dateRight }) =>
      // Sort by date descending
      compareDesc(dateLeft, dateRight)
    ),
  }
}

export default appStateReducer
