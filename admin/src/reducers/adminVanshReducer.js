import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  vanshList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentVansh: null,
  loadingVanshList: false,
  loadingVansh: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
    search: "",
    communityId: "",
  },
};

const vanshSlice = createSlice({
  name: "adminVansh",
  initialState: initialState,
  reducers: {
    vanshCreated(state) {
      state.loadingVanshList = false;
      state.loadingVansh = false;
    },
    resetVansh(state) {
      return {
        ...initialState,
      };
    },
    vanshUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingVanshList: false,
        loadingVansh: false,
      };
    },
    vanshError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingVanshList: false,
        loadingVansh: false,
      };
    },
    vanshDeleted(state, action) {
      const currentCount = state.vanshList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.vanshList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        vanshList: {
          data: state.vanshList.data.filter(
            (vansh) => vansh._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingVanshList: false,
      };
    },
    vanshListUpdated(state, action) {
      return {
        ...state,
        vanshList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingVanshList: false,
      };
    },
    vanshDetailsById(state, action) {
      return {
        ...state,
        currentVansh: action.payload,
        loadingVansh: false,
      };
    },
    vanshSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingVanshList: false,
      };
    },
    loadingOnVanshSubmit(state) {
      return {
        ...state,
        loadingVanshList: true,
        loadingVansh: true,
      };
    },
    loadingVanshList(state) {
      return {
        ...state,
        loadingVanshList: true,
      };
    },
    loadingVansh(state) {
      return {
        ...state,
        loadingVansh: true,
      };
    },
    vanshStatusToggled(state, action) {
      return {
        ...state,
        vanshList: {
          ...state.vanshList,
          data: state.vanshList.data.map((vansh) =>
            vansh._id === action.payload._id
              ? { ...vansh, isActive: action.payload.isActive }
              : vansh
          ),
        },
      };
    },
  },
});

export const {
  vanshCreated,
  resetVansh,
  vanshUpdated,
  vanshError,
  vanshDeleted,
  vanshListUpdated,
  vanshDetailsById,
  vanshSearchParameterUpdate,
  loadingOnVanshSubmit,
  loadingVanshList,
  loadingVansh,
  vanshStatusToggled,
} = vanshSlice.actions;
export default vanshSlice.reducer;
