import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  khampList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentKhamp: null,
  loadingKhampList: false,
  loadingKhamp: false,
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
  },
};

const khampSlice = createSlice({
  name: "adminKhamp",
  initialState: initialState,
  reducers: {
    khampCreated(state) {
      state.loadingKhampList = false;
      state.loadingKhamp = false;
    },
    resetKhamp(state) {
      return {
        ...initialState,
      };
    },
    khampUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingKhampList: false,
      };
    },
    khampError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingKhampList: false,
        loadingKhamp: false,
      };
    },
    khampDeleted(state, action) {
      const currentCount = state.khampList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.khampList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        khampList: {
          data: state.khampList.data.filter(
            (khamp) => khamp._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingKhampList: false,
      };
    },
    khampListUpdated(state, action) {
      return {
        ...state,
        khampList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingKhampList: false,
      };
    },
    khampDetailsById(state, action) {
      return {
        ...state,
        currentKhamp: action.payload,
        loadingKhamp: false,
      };
    },
    khampSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingKhampList: false,
      };
    },
    loadingOnKhampSubmit(state) {
      return {
        ...state,
        loadingKhampList: true,
        loadingKhamp: true,
      };
    },
    loadingKhampList(state) {
      return {
        ...state,
        loadingKhampList: true,
      };
    },
    loadingKhamp(state) {
      return {
        ...state,
        loadingKhamp: true,
      };
    },
    khampStatusToggled(state, action) {
      return {
        ...state,
        khampList: {
          ...state.khampList,
          data: state.khampList.data.map((khamp) =>
            khamp._id === action.payload._id
              ? { ...khamp, isActive: action.payload.isActive }
              : khamp
          ),
        },
      };
    },
  },
});

export const {
  khampCreated,
  resetKhamp,
  khampUpdated,
  khampError,
  khampDeleted,
  khampListUpdated,
  khampDetailsById,
  khampSearchParameterUpdate,
  loadingOnKhampSubmit,
  loadingKhampList,
  loadingKhamp,
  khampStatusToggled,
} = khampSlice.actions;
export default khampSlice.reducer;
