import {
  COUNSELLING_LIST_REQUEST,
  COUNSELLING_LIST_SUCCESS,
  COUNSELLING_LIST_ERROR,
  COUNSELLING_CONFIRM_REQUEST,
  COUNSELLING_CONFIRM_SUCCESS,
  COUNSELLING_CONFIRM_ERROR,
  COUNSELLING_PENDING_COUNT_SUCCESS,
  SET_APPLIED_PARAMS_MY_COUNSELLING,
} from "@src/actions/counsellingActions";

const initialState = {
  sessions: [],
  pagination: {},
  loading: false,
  confirming: false,
  pendingCount: 0,
  appliedParamsMyCounselling: null,
};

export default function counsellingReducer(state = initialState, action) {
  switch (action.type) {
    case COUNSELLING_LIST_REQUEST:
      return { ...state, loading: true };
    case COUNSELLING_LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        sessions: action.payload?.sessions || [],
        pagination: action.payload?.pagination || {},
      };
    case COUNSELLING_LIST_ERROR:
      return { ...state, loading: false };

    case COUNSELLING_CONFIRM_REQUEST:
      return { ...state, confirming: true };
    case COUNSELLING_CONFIRM_SUCCESS:
    case COUNSELLING_CONFIRM_ERROR:
      return { ...state, confirming: false };

    case COUNSELLING_PENDING_COUNT_SUCCESS:
      return { ...state, pendingCount: action.payload?.count ?? 0 };

    case SET_APPLIED_PARAMS_MY_COUNSELLING:
      return { ...state, appliedParamsMyCounselling: action.payload };

    default:
      return state;
  }
}
