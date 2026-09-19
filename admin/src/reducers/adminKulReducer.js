import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  kulList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentKul: null,
  loadingKulList: false,
  loadingKul: false,
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
  },
};

const kulSlice = createSlice({
  name: "adminKul",
  initialState: initialState,
  reducers: {
    kulCreated(state) {
      state.loadingKulList = false;
      state.loadingKul = false;
    },
    resetKul(state) {
      return {
        ...initialState,
      };
    },
    kulUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingKulList: false,
        loadingKul: false,
      };
    },
    kulError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingKulList: false,
        loadingKul: false,
      };
    },
    kulDeleted(state, action) {
      const currentCount = state.kulList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.kulList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        kulList: {
          data: state.kulList.data.filter(
            (kul) => kul._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingKulList: false,
      };
    },
    kulListUpdated(state, action) {
      return {
        ...state,
        kulList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingKulList: false,
      };
    },
    kulDetailsById(state, action) {
      return {
        ...state,
        currentKul: action.payload,
        loadingKul: false,
      };
    },
    kulSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingKulList: false,
      };
    },
    loadingOnKulSubmit(state) {
      return {
        ...state,
        loadingKulList: true,
        loadingKul: true,
      };
    },
    loadingKulList(state) {
      return {
        ...state,
        loadingKulList: true,
      };
    },
    loadingKul(state) {
      return {
        ...state,
        loadingKul: true,
      };
    },
    kulStatusToggled(state, action) {
      return {
        ...state,
        kulList: {
          ...state.kulList,
          data: state.kulList.data.map((kul) =>
            kul._id === action.payload._id
              ? { ...kul, isActive: action.payload.isActive }
              : kul
          ),
        },
      };
    },
  },
});

export const {
  kulCreated,
  resetKul,
  kulUpdated,
  kulError,
  kulDeleted,
  kulListUpdated,
  kulDetailsById,
  kulSearchParameterUpdate,
  loadingOnKulSubmit,
  loadingKulList,
  loadingKul,
  kulStatusToggled,
} = kulSlice.actions;
export default kulSlice.reducer;
