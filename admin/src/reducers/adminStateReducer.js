import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  stateList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentState: null,
  loadingStatesList: false,
  loadingState: false,
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

const stateSlice = createSlice({
  name: "adminState",
  initialState: initialState,
  reducers: {
    stateCreated(state) {
      state.loadingStatesList = false;
      state.loadingState = false;
    },
    resetState(state) {
      return {
        ...initialState,
      };
    },
    stateUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingStatesList: false,
      };
    },
    stateError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingStatesList: false,
        loadingState: false,
      };
    },
    stateDeleted(state, action) {
      const currentCount = state.stateList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.stateList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        stateList: {
          data: state.stateList.data.filter(
            (state) => state._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingStatesList: false,
      };
    },
    stateListUpdated(state, action) {
      return {
        ...state,
        stateList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingStatesList: false,
      };
    },
    stateDetailsById(state, action) {
      return {
        ...state,
        currentState: action.payload,
        loadingState: false,
      };
    },
    stateSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingStatesList: false,
      };
    },
    loadingOnStateSubmit(state) {
      return {
        ...state,
        loadingStatesList: true,
        loadingState: true,
      };
    },
    loadingStatesList(state) {
      return {
        ...state,
        loadingStatesList: true,
      };
    },
    loadingState(state) {
      return {
        ...state,
        loadingState: true,
      };
    },
    stateStatusToggled(state, action) {
      return {
        ...state,
        stateList: {
          ...state.stateList,
          data: state.stateList.data.map((state) =>
            state._id === action.payload._id
              ? { ...state, isActive: action.payload.isActive }
              : state
          ),
        },
      };
    },
  },
});

export const {
  stateCreated,
  resetState,
  stateUpdated,
  stateError,
  stateDeleted,
  stateListUpdated,
  stateDetailsById,
  stateSearchParameterUpdate,
  loadingOnStateSubmit,
  loadingStatesList,
  loadingState,
  stateStatusToggled,
} = stateSlice.actions;
export default stateSlice.reducer;
