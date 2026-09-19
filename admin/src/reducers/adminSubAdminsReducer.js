import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  subAdminsList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentSubAdmin: null,
  loadingSubAdminsList: true,
  loadingSubAdmin: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
    filters: [],
  },
};

const subAdminSlice = createSlice({
  name: "adminSubAdmins",
  initialState: initialState,
  reducers: {
    subAdminCreated(state) {
      state.loadingSubAdmin = false;
    },
    resetSubAdmin(state) {
      return {
        ...initialState,
      };
    },
    loadSubAdminPage(state) {
      return {
        ...state,
        loadingSubAdmin: false,
      };
    },
    subAdminUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingSubAdmin: false,
      };
    },
    subAdminError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingSubAdmin: false,
        loadingSubAdminsList: false,
      };
    },
    subAdminDeleted(state, action) {
      const currentCount = state.subAdminsList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.subAdminsList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        subAdminsList: {
          data: state.subAdminsList.data.filter(
            (subAdmin) => subAdmin._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingSubAdminsList: false,
      };
    },
    subAdminDetailsById(state, action) {
      return {
        ...state,
        currentSubAdmin: action.payload,
        loadingSubAdmin: false,
      };
    },
    subAdminListUpdated(state, action) {
      return {
        ...state,
        subAdminsList: {
          data: action.payload.subAdmins || [],
          page: action.payload.pagination?.currentPage || 1,
          count: action.payload.pagination?.totalCount || 0,
        },
        loadingSubAdminsList: false,
      };
    },
    subAdminSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
      };
    },
    loadingOnSubAdminSubmit(state) {
      return {
        ...state,
        loadingSubAdmin: true,
      };
    },
    loadingSubAdminsList(state) {
      return {
        ...state,
        loadingSubAdminsList: true,
      };
    },
    subAdminStatusToggled(state, action) {
      const { id, isActive, status } = action.payload;
      return {
        ...state,
        subAdminsList: {
          ...state.subAdminsList,
          data: state.subAdminsList.data.map((subAdmin) =>
            subAdmin._id === id
              ? { ...subAdmin, isActive, status }
              : subAdmin
          ),
        },
      };
    },
  },
});

export const {
  subAdminCreated,
  resetSubAdmin,
  loadSubAdminPage,
  subAdminUpdated,
  subAdminError,
  subAdminDeleted,
  subAdminDetailsById,
  subAdminListUpdated,
  subAdminSearchParameterUpdate,
  loadingOnSubAdminSubmit,
  loadingSubAdminsList,
  subAdminStatusToggled,
} = subAdminSlice.actions;

export default subAdminSlice.reducer;
