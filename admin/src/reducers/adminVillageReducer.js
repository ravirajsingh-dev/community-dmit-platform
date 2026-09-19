import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  villageList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentVillage: null,
  loadingVillagesList: false,
  loadingVillage: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
    search: "",
  },
};

const villageSlice = createSlice({
  name: "adminVillage",
  initialState: initialState,
  reducers: {
    villageCreated(state) {
      state.loadingVillagesList = false;
      state.loadingVillage = false;
    },
    resetVillage(state) {
      return {
        ...initialState,
      };
    },
    villageUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingVillagesList: false,
      };
    },
    villageError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingVillagesList: false,
        loadingVillage: false,
      };
    },
    villageDeleted(state, action) {
      const currentCount = state.villageList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.villageList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        villageList: {
          data: state.villageList.data.filter(
            (village) => village._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingVillagesList: false,
      };
    },
    villageListUpdated(state, action) {
      return {
        ...state,
        villageList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingVillagesList: false,
      };
    },
    villageDetailsById(state, action) {
      return {
        ...state,
        currentVillage: action.payload,
        loadingVillage: false,
      };
    },
    villageSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingVillagesList: false,
      };
    },
    loadingOnVillageSubmit(state) {
      return {
        ...state,
        loadingVillagesList: true,
        loadingVillage: true,
      };
    },
    loadingVillagesList(state) {
      return {
        ...state,
        loadingVillagesList: true,
      };
    },
    loadingVillage(state) {
      return {
        ...state,
        loadingVillage: true,
      };
    },
    villageStatusToggled(state, action) {
      return {
        ...state,
        villageList: {
          ...state.villageList,
          data: state.villageList.data.map((village) =>
            village._id === action.payload._id
              ? { ...village, isActive: action.payload.isActive }
              : village
          ),
        },
      };
    },
  },
});

export const {
  villageCreated,
  resetVillage,
  villageUpdated,
  villageError,
  villageDeleted,
  villageListUpdated,
  villageDetailsById,
  villageSearchParameterUpdate,
  loadingOnVillageSubmit,
  loadingVillagesList,
  loadingVillage,
  villageStatusToggled,
} = villageSlice.actions;
export default villageSlice.reducer;
