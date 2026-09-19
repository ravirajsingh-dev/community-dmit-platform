const initialState = {
  summary: [],
  pagination: {},
  stats: {
    total: 0,
    active: 0,
    inactive: 0,
    newUsers: 0,
  },
  loading: false,
  error: null,
};

const adminReferralReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_REFERRAL_SUMMARY_LOADING":
      return {
        ...state,
        loading: true,
        error: null,
      };

    case "FETCH_REFERRAL_SUMMARY_SUCCESS":
      return {
        ...state,
        summary: action.payload.summary,
        pagination: action.payload.pagination,
        stats: action.payload.stats ?? state.stats,
        loading: false,
        error: null,
      };

    case "FETCH_REFERRAL_SUMMARY_ERROR":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default adminReferralReducer;
