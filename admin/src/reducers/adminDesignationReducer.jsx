import {
  ADMIN_DESIGNATION_APPLICATIONS_REQUEST,
  ADMIN_DESIGNATION_APPLICATIONS_SUCCESS,
  ADMIN_DESIGNATION_APPLICATIONS_ERROR,
  ADMIN_DESIGNATION_DECISION_REQUEST,
  ADMIN_DESIGNATION_DECISION_SUCCESS,
  ADMIN_DESIGNATION_DECISION_ERROR,
} from "@src/actions/adminDesignationActions";

const initialState = {
  applications: [],
  pagination: {},
  summary: null,
  currentStatus: "pending",
  lastRequestId: null,
  loading: false,
  processing: false,
};

export default function adminDesignationReducer(state = initialState, action) {
  switch (action.type) {
    case ADMIN_DESIGNATION_APPLICATIONS_REQUEST:
      return { ...state, loading: true, lastRequestId: action.payload?.requestId ?? null };
    case ADMIN_DESIGNATION_APPLICATIONS_SUCCESS:
      if (
        action.payload?.requestId &&
        action.payload.requestId !== state.lastRequestId
      ) {
        // Ignore stale responses from previous requests.
        return state;
      }
      return {
        ...state,
        loading: false,
        applications: action.payload.applications || [],
        pagination: action.payload.pagination || {},
        summary: action.payload.summary ?? null,
        currentStatus: action.payload.status || state.currentStatus,
      };
    case ADMIN_DESIGNATION_APPLICATIONS_ERROR:
      return { ...state, loading: false };

    case ADMIN_DESIGNATION_DECISION_REQUEST:
      return { ...state, processing: true };
    case ADMIN_DESIGNATION_DECISION_SUCCESS:
    case ADMIN_DESIGNATION_DECISION_ERROR:
      return { ...state, processing: false };

    default:
      return state;
  }
}
