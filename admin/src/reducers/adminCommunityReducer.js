import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  communityList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentCommunity: null,
  loadingCommunitiesList: false,
  loadingCommunity: false,
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

const communitySlice = createSlice({
  name: "adminCommunity",
  initialState: initialState,
  reducers: {
    communityCreated(state) {
      state.loadingCommunitiesList = false;
      state.loadingCommunity = false;
    },
    resetCommunity(state) {
      return {
        ...initialState,
      };
    },
    communityUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingCommunitiesList: false,
      };
    },
    communityError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingCommunitiesList: false,
        loadingCommunity: false,
      };
    },
    communityDeleted(state, action) {
      const currentCount = state.communityList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.communityList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        communityList: {
          data: state.communityList.data.filter(
            (community) => community._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingCommunitiesList: false,
      };
    },
    communityListUpdated(state, action) {
      return {
        ...state,
        communityList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingCommunitiesList: false,
      };
    },
    communityDetailsById(state, action) {
      return {
        ...state,
        currentCommunity: action.payload,
        loadingCommunity: false,
      };
    },
    communitySearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingCommunitiesList: false,
      };
    },
    loadingOnCommunitySubmit(state) {
      return {
        ...state,
        loadingCommunitiesList: true,
        loadingCommunity: true,
      };
    },
    loadingCommunitiesList(state) {
      return {
        ...state,
        loadingCommunitiesList: true,
      };
    },
    loadingCommunity(state) {
      return {
        ...state,
        loadingCommunity: true,
      };
    },
    communityStatusToggled(state, action) {
      return {
        ...state,
        communityList: {
          ...state.communityList,
          data: state.communityList.data.map((community) =>
            community._id === action.payload._id
              ? { ...community, isActive: action.payload.isActive }
              : community
          ),
        },
      };
    },
  },
});

export const {
  communityCreated,
  resetCommunity,
  communityUpdated,
  communityError,
  communityDeleted,
  communityListUpdated,
  communityDetailsById,
  communitySearchParameterUpdate,
  loadingOnCommunitySubmit,
  loadingCommunitiesList,
  loadingCommunity,
  communityStatusToggled,
} = communitySlice.actions;
export default communitySlice.reducer;
