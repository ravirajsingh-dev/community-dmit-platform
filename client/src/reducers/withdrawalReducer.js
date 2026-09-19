import {
  WITHDRAWAL_SETTINGS_REQUEST,
  WITHDRAWAL_SETTINGS_SUCCESS,
  WITHDRAWAL_SETTINGS_ERROR,
  WITHDRAWAL_REQUESTS_REQUEST,
  WITHDRAWAL_REQUESTS_SUCCESS,
  WITHDRAWAL_REQUESTS_ERROR,
  WITHDRAWAL_HISTORY_REQUEST,
  WITHDRAWAL_HISTORY_SUCCESS,
  WITHDRAWAL_HISTORY_ERROR,
  WITHDRAWAL_CREATE_REQUEST,
  WITHDRAWAL_CREATE_SUCCESS,
  WITHDRAWAL_CREATE_ERROR,
  WITHDRAWAL_CANCEL_REQUEST,
  WITHDRAWAL_CANCEL_SUCCESS,
  WITHDRAWAL_CANCEL_ERROR,
} from "@src/actions/withdrawalActions";

const initialState = {
  settings: null,
  requests: [],
  pendingRequest: null,
  pagination: null,
  historyItems: [],
  historyPagination: null,
  loadingSettings: false,
  loadingRequests: false,
  loadingHistory: false,
  loadingCreate: false,
  loadingCancel: false,
  error: null,
};

const withdrawalReducer = (state = initialState, action) => {
  switch (action.type) {
    case WITHDRAWAL_SETTINGS_REQUEST:
      return { ...state, loadingSettings: true, error: null };
    case WITHDRAWAL_SETTINGS_SUCCESS:
      return { ...state, loadingSettings: false, settings: action.payload || {} };
    case WITHDRAWAL_SETTINGS_ERROR:
      return { ...state, loadingSettings: false };

    case WITHDRAWAL_REQUESTS_REQUEST:
      return { ...state, loadingRequests: true, error: null };
    case WITHDRAWAL_REQUESTS_SUCCESS: {
      const items = action.payload?.items ?? [];
      return {
        ...state,
        loadingRequests: false,
        requests: items,
        pendingRequest: (action.payload?.pendingRequest ?? items?.[0] ?? null) || null,
        pagination: action.payload?.pagination ?? null,
      };
    }
    case WITHDRAWAL_REQUESTS_ERROR:
      return { ...state, loadingRequests: false };

    case WITHDRAWAL_HISTORY_REQUEST:
      return { ...state, loadingHistory: true, error: null };
    case WITHDRAWAL_HISTORY_SUCCESS: {
      const items = action.payload?.items ?? [];
      return {
        ...state,
        loadingHistory: false,
        historyItems: items,
        historyPagination: action.payload?.pagination ?? null,
      };
    }
    case WITHDRAWAL_HISTORY_ERROR:
      return { ...state, loadingHistory: false };

    case WITHDRAWAL_CREATE_REQUEST:
      return { ...state, loadingCreate: true, error: null };
    case WITHDRAWAL_CREATE_SUCCESS:
      return { ...state, loadingCreate: false };
    case WITHDRAWAL_CREATE_ERROR:
      return { ...state, loadingCreate: false };

    case WITHDRAWAL_CANCEL_REQUEST:
      return { ...state, loadingCancel: true, error: null };
    case WITHDRAWAL_CANCEL_SUCCESS:
      return { ...state, loadingCancel: false };
    case WITHDRAWAL_CANCEL_ERROR:
      return { ...state, loadingCancel: false };

    default:
      return state;
  }
};

export default withdrawalReducer;

