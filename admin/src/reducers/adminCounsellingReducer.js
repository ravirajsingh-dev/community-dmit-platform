import {
  ADMIN_COUNSELLING_REQUEST,
  ADMIN_COUNSELLING_SUCCESS,
  ADMIN_COUNSELLING_ERROR,
  ADMIN_COUNSELLING_CONFIRM_REQUEST,
  ADMIN_COUNSELLING_CONFIRM_SUCCESS,
  ADMIN_COUNSELLING_CONFIRM_ERROR,
} from "@src/actions/adminCounsellingActions";

const initialState = {
  sessions: [],
  pagination: {},
  loading: false,
  processing: false,
};

export default function adminCounsellingReducer(state = initialState, action) {
  switch (action.type) {
    case ADMIN_COUNSELLING_REQUEST:
      return { ...state, loading: true };
    case ADMIN_COUNSELLING_SUCCESS:
      return {
        ...state,
        loading: false,
        sessions: action.payload?.sessions || [],
        pagination: action.payload?.pagination || {},
      };
    case ADMIN_COUNSELLING_ERROR:
      return { ...state, loading: false };

    case ADMIN_COUNSELLING_CONFIRM_REQUEST:
      return { ...state, processing: true };
    case ADMIN_COUNSELLING_CONFIRM_SUCCESS:
    case ADMIN_COUNSELLING_CONFIRM_ERROR:
      return { ...state, processing: false };

    default:
      return state;
  }
}
