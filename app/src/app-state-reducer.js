import { hasLoadedtokenRequestSettings } from './lib/token-request-settings'
import { compareDesc } from 'date-fns'

function appStateReducer(state) {
  const ready = hasLoadedtokenRequestSettings(state)
  if (!ready) {
    return { ...state, ready }
  }
  const { requests = [], acceptedTokens = [], lastSoldBlock = 0, totalSoldNFT = 0 } = state

  return {
    ...state,
    acceptedTokens,
    ready,
    requests: requests.sort(({ date: dateLeft }, { date: dateRight }) =>
      // Sort by date descending
      compareDesc(dateLeft, dateRight)
    ),
    lastSoldBlock,
    totalSoldNFT,
  }
}

export default appStateReducer
