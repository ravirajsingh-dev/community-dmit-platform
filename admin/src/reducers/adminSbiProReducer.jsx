import {
  ADMIN_SBI_PRO_LIST_REQUEST,
  ADMIN_SBI_PRO_LIST_SUCCESS,
  ADMIN_SBI_PRO_LIST_ERROR,
  ADMIN_SBI_PRO_COMPLETE_REQUEST,
  ADMIN_SBI_PRO_COMPLETE_SUCCESS,
  ADMIN_SBI_PRO_COMPLETE_ERROR,
} from "@src/actions/adminSbiProActions";

const initialState = {
  sessions: [],
  pagination: {},
  loading: false,
  completing: false,
};

export default function adminSbiProReducer(state = initialState, action) {
  switch (action.type) {
    case ADMIN_SBI_PRO_LIST_REQUEST:
      return { ...state, loading: true };
    case ADMIN_SBI_PRO_LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        sessions: action.payload?.sessions || [],
        pagination: action.payload?.pagination || {},
      };
    case ADMIN_SBI_PRO_LIST_ERROR:
      return { ...state, loading: false };

    case ADMIN_SBI_PRO_COMPLETE_REQUEST:
      return { ...state, completing: true };
    case ADMIN_SBI_PRO_COMPLETE_SUCCESS:
    case ADMIN_SBI_PRO_COMPLETE_ERROR:
      return { ...state, completing: false };

    default:
      return state;
  }
}
