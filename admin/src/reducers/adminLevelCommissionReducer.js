import {
  ADMIN_LEVEL_COMMISSION_STATS_REQUEST,
  ADMIN_LEVEL_COMMISSION_STATS_SUCCESS,
  ADMIN_LEVEL_COMMISSION_STATS_ERROR,
  ADMIN_LEVEL_COMMISSION_HISTORY_REQUEST,
  ADMIN_LEVEL_COMMISSION_HISTORY_SUCCESS,
  ADMIN_LEVEL_COMMISSION_HISTORY_ERROR,
} from "@src/actions/adminLevelCommissionActions";

const initialState = {
  stats: {
    totalDistributed: "0",
    totalBurned: "0",
    recordCount: 0,
  },
  records: [],
  pagination: {},
  loadingStats: false,
  loadingHistory: false,
  error: null,
};

const adminLevelCommissionReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADMIN_LEVEL_COMMISSION_STATS_REQUEST:
      return { ...state, loadingStats: true };
    case ADMIN_LEVEL_COMMISSION_STATS_SUCCESS:
      return {
        ...state,
        loadingStats: false,
        stats: {
          totalDistributed: action.payload?.totalDistributed ?? "0",
          totalBurned: action.payload?.totalBurned ?? "0",
          recordCount: action.payload?.recordCount ?? 0,
        },
      };
    case ADMIN_LEVEL_COMMISSION_STATS_ERROR:
      return { ...state, loadingStats: false };
    case ADMIN_LEVEL_COMMISSION_HISTORY_REQUEST:
      return { ...state, loadingHistory: true };
    case ADMIN_LEVEL_COMMISSION_HISTORY_SUCCESS:
      return {
        ...state,
        loadingHistory: false,
        records: action.payload?.records ?? [],
        pagination: action.payload?.pagination ?? {},
      };
    case ADMIN_LEVEL_COMMISSION_HISTORY_ERROR:
      return { ...state, loadingHistory: false };
    default:
      return state;
  }
};

export default adminLevelCommissionReducer;
