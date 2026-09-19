import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  videoList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentVideo: null,
  loadingVideoList: true,
  loadingVideo: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "displayOrder",
    ascending: "asc",
    query: "",
  },
};

const videoSlice = createSlice({
  name: "adminVideo",
  initialState: initialState,
  reducers: {
    videoCreated(state) {
      state.loadingVideoList = false;
    },
    resetVideo(state) {
      return {
        ...initialState,
      };
    },
    videoUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingVideoList: false,
      };
    },
    videoError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingVideoList: false,
        loadingVideo: false,
      };
    },
    videoDeleted(state, action) {
      const currentCount = state.videoList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.videoList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        videoList: {
          data: state.videoList.data.filter(
            (video) => video._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingVideoList: false,
      };
    },
    videoListUpdated(state, action) {
      return {
        ...state,
        videoList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingVideoList: false,
      };
    },
    videoDetailsById(state, action) {
      return {
        ...state,
        currentVideo: action.payload,
        loadingVideo: false,
      };
    },
    videoSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingVideoList: false,
      };
    },
    loadingOnVideoSubmit(state) {
      return {
        ...state,
        loadingVideoList: true,
      };
    },
    loadingVideoList(state) {
      return {
        ...state,
        loadingVideoList: true,
      };
    },
    loadingVideo(state) {
      return {
        ...state,
        loadingVideo: true,
      };
    },
  },
});

export const {
  videoCreated,
  resetVideo,
  videoUpdated,
  videoError,
  videoDeleted,
  videoListUpdated,
  videoDetailsById,
  videoSearchParameterUpdate,
  loadingOnVideoSubmit,
  loadingVideoList,
  loadingVideo,
} = videoSlice.actions;
export default videoSlice.reducer;
