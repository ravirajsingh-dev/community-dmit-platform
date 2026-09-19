const initialState = {
  epins: [],
  pagination: {},
  totalCount: 0,
  unusedCount: 0,
  usedCount: 0,
  transfers: [],
  transferPagination: {},
  loading: false,
  loadingTransfers: false,
  error: null,
};

const adminEPinReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_ADMIN_EPINS_LOADING":
      return { ...state, loading: true, error: null };
    case "FETCH_ADMIN_EPINS_SUCCESS":
      return {
        ...state,
        epins: action.payload.epins || [],
        pagination: action.payload.pagination || {},
        totalCount: action.payload.totalCount || 0,
        unusedCount: action.payload.unusedCount || 0,
        usedCount: action.payload.usedCount || 0,
        loading: false,
        error: null,
      };
    case "FETCH_ADMIN_EPINS_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "FETCH_ADMIN_EPIN_TRANSFERS_LOADING":
      return { ...state, loadingTransfers: true };
    case "FETCH_ADMIN_EPIN_TRANSFERS_SUCCESS":
      return {
        ...state,
        transfers: action.payload.transfers || [],
        transferPagination: action.payload.pagination || {},
        loadingTransfers: false,
      };
    case "FETCH_ADMIN_EPIN_TRANSFERS_ERROR":
      return { ...state, loadingTransfers: false };
    case "ADMIN_EPIN_CREATE_SUCCESS":
    case "ADMIN_EPIN_DELETE_SUCCESS":
    case "ADMIN_EPIN_DELETE_BULK_SUCCESS":
    case "ADMIN_EPIN_TRANSFER_BULK_SUCCESS":
      return { ...state, error: null };
    default:
      return state;
  }
};

export default adminEPinReducer;
