import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  trainingVideoList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentTrainingVideo: null,
  loadingTrainingVideoList: true,
  loadingTrainingVideo: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "displayOrder",
    ascending: "asc",
    query: "",
  },
};

const trainingVideoSlice = createSlice({
  name: "adminTrainingVideo",
  initialState,
  reducers: {
    trainingVideoCreated(state) {
      state.loadingTrainingVideoList = false;
    },
    resetTrainingVideo() {
      return {
        ...initialState,
      };
    },
    trainingVideoUpdated(state) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingTrainingVideoList: false,
      };
    },
    trainingVideoError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingTrainingVideoList: false,
        loadingTrainingVideo: false,
      };
    },
    trainingVideoDeleted(state, action) {
      const currentCount = state.trainingVideoList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.trainingVideoList.page, 10);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        trainingVideoList: {
          data: state.trainingVideoList.data.filter(
            (video) => video._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingTrainingVideoList: false,
      };
    },
    trainingVideoListUpdated(state, action) {
      return {
        ...state,
        trainingVideoList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingTrainingVideoList: false,
      };
    },
    trainingVideoDetailsById(state, action) {
      return {
        ...state,
        currentTrainingVideo: action.payload,
        loadingTrainingVideo: false,
      };
    },
    trainingVideoSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingTrainingVideoList: false,
      };
    },
    loadingOnTrainingVideoSubmit(state) {
      return {
        ...state,
        loadingTrainingVideoList: true,
      };
    },
    loadingTrainingVideoList(state) {
      return {
        ...state,
        loadingTrainingVideoList: true,
      };
    },
    loadingTrainingVideo(state) {
      return {
        ...state,
        loadingTrainingVideo: true,
      };
    },
  },
});

export const {
  trainingVideoCreated,
  resetTrainingVideo,
  trainingVideoUpdated,
  trainingVideoError,
  trainingVideoDeleted,
  trainingVideoListUpdated,
  trainingVideoDetailsById,
  trainingVideoSearchParameterUpdate,
  loadingOnTrainingVideoSubmit,
  loadingTrainingVideoList,
  loadingTrainingVideo,
} = trainingVideoSlice.actions;

export default trainingVideoSlice.reducer;

