import { hasLoadedtokenRequestSettings } from './lib/token-request-settings'
import { compareDesc } from 'date-fns'

async function appStateReducer(state) {
  const ready = hasLoadedtokenRequestSettings(state)
  if (!ready) {
    return { ...state, ready }
  }
  console.log('state: ', state);
  const { requests = [], acceptedTokens = []} = state

  return {
    ...state,
    acceptedTokens,
    ready,
    requests: requests.sort(({ date: dateLeft }, { date: dateRight }) =>
      // Sort by date descending
      compareDesc(dateLeft, dateRight)
    ),
  }
}

export default appStateReducer
