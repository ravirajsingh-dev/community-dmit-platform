import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  gotraList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentGotra: null,
  loadingGotraList: false,
  loadingGotra: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
    search: "",
    communityId: "",
    vanshId: "",
    kulId: "",
    khampId: "",
  },
};

const gotraSlice = createSlice({
  name: "adminGotra",
  initialState: initialState,
  reducers: {
    gotraCreated(state) {
      state.loadingGotraList = false;
      state.loadingGotra = false;
    },
    resetGotra(state) {
      return {
        ...initialState,
      };
    },
    gotraUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingGotraList: false,
      };
    },
    gotraError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingGotraList: false,
        loadingGotra: false,
      };
    },
    gotraDeleted(state, action) {
      const currentCount = state.gotraList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.gotraList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        gotraList: {
          data: state.gotraList.data.filter(
            (gotra) => gotra._id !== action.payload,
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingGotraList: false,
      };
    },
    gotraListUpdated(state, action) {
      return {
        ...state,
        gotraList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingGotraList: false,
      };
    },
    gotraDetailsById(state, action) {
      return {
        ...state,
        currentGotra: action.payload,
        loadingGotra: false,
      };
    },
    gotraSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingGotraList: false,
      };
    },
    loadingOnGotraSubmit(state) {
      return {
        ...state,
        loadingGotraList: true,
        loadingGotra: true,
      };
    },
    loadingGotraList(state) {
      return {
        ...state,
        loadingGotraList: true,
      };
    },
    loadingGotra(state) {
      return {
        ...state,
        loadingGotra: true,
      };
    },
    gotraStatusToggled(state, action) {
      return {
        ...state,
        gotraList: {
          ...state.gotraList,
          data: state.gotraList.data.map((gotra) =>
            gotra._id === action.payload._id
              ? { ...gotra, isActive: action.payload.isActive }
              : gotra,
          ),
        },
      };
    },
  },
});

export const {
  gotraCreated,
  resetGotra,
  gotraUpdated,
  gotraError,
  gotraDeleted,
  gotraListUpdated,
  gotraDetailsById,
  gotraSearchParameterUpdate,
  loadingOnGotraSubmit,
  loadingGotraList,
  loadingGotra,
  gotraStatusToggled,
} = gotraSlice.actions;
export default gotraSlice.reducer;
