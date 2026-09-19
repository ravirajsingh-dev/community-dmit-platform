import {
  FETCH_MATRIMONIAL_APPLICATIONS_START,
  FETCH_MATRIMONIAL_APPLICATIONS_SUCCESS,
  FETCH_MATRIMONIAL_APPLICATIONS_FAIL,
  FETCH_MATRIMONIAL_PROFILE_START,
  FETCH_MATRIMONIAL_PROFILE_SUCCESS,
  FETCH_MATRIMONIAL_PROFILE_FAIL,
  UPDATE_MATRIMONIAL_START,
  UPDATE_MATRIMONIAL_SUCCESS,
  UPDATE_MATRIMONIAL_FAIL,
  DELETE_MATRIMONIAL_START,
  DELETE_MATRIMONIAL_SUCCESS,
  DELETE_MATRIMONIAL_FAIL,
} from "@actions/adminMatrimonialActions";

const initialState = {
  list: [],
  pagination: {},
  statistics: {},
  selectedProfile: null,
  loading: false,
  loadingProfile: false,
  updating: false,
  deleting: false,
  error: null,
};

const updateItemInList = (list, id, updates) =>
  list.map((item) => (item._id === id ? { ...item, ...updates } : item));

const adminMatrimonialReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_MATRIMONIAL_APPLICATIONS_START:
      return { ...state, loading: true, error: null };

    case FETCH_MATRIMONIAL_APPLICATIONS_SUCCESS:
      return {
        ...state,
        list: action.payload.list || [],
        pagination: action.payload.pagination || {},
        statistics: action.payload.statistics || {},
        loading: false,
        error: null,
      };

    case FETCH_MATRIMONIAL_APPLICATIONS_FAIL:
      return { ...state, loading: false, error: action.payload || "Failed to fetch" };

    case FETCH_MATRIMONIAL_PROFILE_START:
      return { ...state, loadingProfile: true };

    case FETCH_MATRIMONIAL_PROFILE_SUCCESS:
      return { ...state, loadingProfile: false, selectedProfile: action.payload };

    case FETCH_MATRIMONIAL_PROFILE_FAIL:
      return { ...state, loadingProfile: false, selectedProfile: null };

    case UPDATE_MATRIMONIAL_START:
      return { ...state, updating: true };

    case UPDATE_MATRIMONIAL_SUCCESS:
      return {
        ...state,
        updating: false,
        list: updateItemInList(state.list, action.payload._id, action.payload),
        selectedProfile: state.selectedProfile?._id === action.payload._id ? action.payload : state.selectedProfile,
      };

    case UPDATE_MATRIMONIAL_FAIL:
      return { ...state, updating: false };

    case DELETE_MATRIMONIAL_START:
      return { ...state, deleting: true };

    case DELETE_MATRIMONIAL_SUCCESS:
      return {
        ...state,
        deleting: false,
        list: state.list.filter((item) => item._id !== action.payload),
        selectedProfile: state.selectedProfile?._id === action.payload ? null : state.selectedProfile,
      };

    case DELETE_MATRIMONIAL_FAIL:
      return { ...state, deleting: false };

    default:
      return state;
  }
};

export default adminMatrimonialReducer;
