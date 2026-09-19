import {
  MATRIMONIAL_APPLY_START,
  MATRIMONIAL_APPLY_SUCCESS,
  MATRIMONIAL_APPLY_FAIL,
  MATRIMONIAL_FETCH_ME_START,
  MATRIMONIAL_FETCH_ME_SUCCESS,
  MATRIMONIAL_FETCH_ME_FAIL,
  MATRIMONIAL_UPDATE_START,
  MATRIMONIAL_UPDATE_SUCCESS,
  MATRIMONIAL_UPDATE_FAIL,
  MATRIMONIAL_ACTIVATE_START,
  MATRIMONIAL_ACTIVATE_SUCCESS,
  MATRIMONIAL_ACTIVATE_FAIL,
  MATRIMONIAL_DEACTIVATE_START,
  MATRIMONIAL_DEACTIVATE_SUCCESS,
  MATRIMONIAL_DEACTIVATE_FAIL,
  MATRIMONIAL_DELETE_START,
  MATRIMONIAL_DELETE_SUCCESS,
  MATRIMONIAL_DELETE_FAIL,
  MATRIMONIAL_LIST_START,
  MATRIMONIAL_LIST_SUCCESS,
  MATRIMONIAL_LIST_FAIL,
  MATRIMONIAL_PROFILE_START,
  MATRIMONIAL_PROFILE_SUCCESS,
  MATRIMONIAL_PROFILE_FAIL,
  MATRIMONIAL_MATCHES_START,
  MATRIMONIAL_MATCHES_SUCCESS,
  MATRIMONIAL_MATCHES_FAIL,
} from "@src/actions/matrimonialActions";

const initialState = {
  myProfile: null,
  list: [],
  listPagination: {},
  profile: null,
  matches: [],
  matchesPagination: {},
  loading: false,
  loadingMe: false,
  loadingList: false,
  loadingProfile: false,
  loadingMatches: false,
  applying: false,
  updating: false,
  activating: false,
  deactivating: false,
  deleting: false,
  error: null,
};

const matrimonialReducer = (state = initialState, action) => {
  switch (action.type) {
    case MATRIMONIAL_APPLY_START:
      return { ...state, applying: true, error: null };
    case MATRIMONIAL_APPLY_SUCCESS:
      return { ...state, applying: false, myProfile: action.payload };
    case MATRIMONIAL_APPLY_FAIL:
      return { ...state, applying: false };

    case MATRIMONIAL_FETCH_ME_START:
      return { ...state, loadingMe: true };
    case MATRIMONIAL_FETCH_ME_SUCCESS:
      return { ...state, loadingMe: false, myProfile: action.payload };
    case MATRIMONIAL_FETCH_ME_FAIL:
      return { ...state, loadingMe: false, myProfile: null };

    case MATRIMONIAL_UPDATE_START:
      return { ...state, updating: true };
    case MATRIMONIAL_UPDATE_SUCCESS:
      return { ...state, updating: false, myProfile: action.payload };
    case MATRIMONIAL_UPDATE_FAIL:
      return { ...state, updating: false };

    case MATRIMONIAL_ACTIVATE_START:
      return { ...state, activating: true };
    case MATRIMONIAL_ACTIVATE_SUCCESS:
      return { ...state, activating: false, myProfile: action.payload };
    case MATRIMONIAL_ACTIVATE_FAIL:
      return { ...state, activating: false };

    case MATRIMONIAL_DEACTIVATE_START:
      return { ...state, deactivating: true };
    case MATRIMONIAL_DEACTIVATE_SUCCESS:
      return { ...state, deactivating: false, myProfile: action.payload };
    case MATRIMONIAL_DEACTIVATE_FAIL:
      return { ...state, deactivating: false };

    case MATRIMONIAL_DELETE_START:
      return { ...state, deleting: true };
    case MATRIMONIAL_DELETE_SUCCESS:
      return { ...state, deleting: false, myProfile: null };
    case MATRIMONIAL_DELETE_FAIL:
      return { ...state, deleting: false };

    case MATRIMONIAL_LIST_START:
      return { ...state, loadingList: true };
    case MATRIMONIAL_LIST_SUCCESS:
      return {
        ...state,
        loadingList: false,
        list: action.payload?.list ?? [],
        listPagination: action.payload?.pagination ?? {},
      };
    case MATRIMONIAL_LIST_FAIL:
      return { ...state, loadingList: false, list: [], listPagination: {} };

    case MATRIMONIAL_PROFILE_START:
      return { ...state, loadingProfile: true, profile: null };
    case MATRIMONIAL_PROFILE_SUCCESS:
      return { ...state, loadingProfile: false, profile: action.payload };
    case MATRIMONIAL_PROFILE_FAIL:
      return { ...state, loadingProfile: false, profile: null };

    case MATRIMONIAL_MATCHES_START:
      return { ...state, loadingMatches: true };
    case MATRIMONIAL_MATCHES_SUCCESS:
      return {
        ...state,
        loadingMatches: false,
        matches: action.payload?.list ?? [],
        matchesPagination: action.payload?.pagination ?? {},
        list: action.payload?.list ?? [],
        listPagination: action.payload?.pagination ?? {},
      };
    case MATRIMONIAL_MATCHES_FAIL:
      return { ...state, loadingMatches: false, matches: [], matchesPagination: {} };

    default:
      return state;
  }
};

export default matrimonialReducer;
