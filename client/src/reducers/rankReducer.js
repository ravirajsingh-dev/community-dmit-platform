import {
  RANK_INFO_REQUEST,
  RANK_INFO_SUCCESS,
  RANK_INFO_ERROR,
} from "@src/constants/rankActionTypes";

const initialState = {
  currentRank: null,
  nextRank: null,
  ranks: [],
  rankBenefitCalculation: null,
  commissionEarnedThisMonth: "0.00",
  levels: [],
  metrics: {
    currentRankCode: 0,
    directCount: 0,
    totalDownlineCount: 0,
    monthlyNewActiveCount: 0,
  },
  loading: false,
  error: null,
};

export default function rankReducer(state = initialState, action) {
  switch (action.type) {
    case RANK_INFO_REQUEST:
      return { ...state, loading: true, error: null };
    case RANK_INFO_SUCCESS: {
      const payload = action.payload || {};
      return {
        ...state,
        loading: false,
        currentRank: payload.currentRank ?? null,
        nextRank: payload.nextRank ?? null,
        ranks: payload.ranks ?? [],
        rankBenefitCalculation: payload.rankBenefitCalculation ?? null,
        commissionEarnedThisMonth: payload.commissionEarnedThisMonth ?? "0.00",
        levels: payload.levels ?? [],
        metrics: payload.metrics ?? state.metrics,
      };
    }
    case RANK_INFO_ERROR:
      return { ...state, loading: false, error: action.payload ?? null };
    default:
      return state;
  }
}
