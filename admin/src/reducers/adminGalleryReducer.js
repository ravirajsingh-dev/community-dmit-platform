import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  galleryList: {
    page: 1,
    data: [],
    count: 0,
  },
  categories: [],
  loadingGalleryList: true,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
    category: "",
  },
};

const gallerySlice = createSlice({
  name: "adminGallery",
  initialState: initialState,
  reducers: {
    galleryImageCreated(state) {
      state.loadingGalleryList = false;
    },
    resetGallery(state) {
      return {
        ...initialState,
      };
    },
    galleryUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingGalleryList: false,
      };
    },
    galleryError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingGalleryList: false,
      };
    },
    galleryDeleted(state, action) {
      const currentCount = state.galleryList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.galleryList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        galleryList: {
          data: state.galleryList.data.filter(
            (image) => image._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingGalleryList: false,
      };
    },
    galleryListUpdated(state, action) {
      return {
        ...state,
        galleryList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingGalleryList: false,
      };
    },
    galleryCategoriesUpdated(state, action) {
      return {
        ...state,
        categories: action.payload,
      };
    },
    gallerySearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingGalleryList: false,
      };
    },
    loadingOnGallerySubmit(state) {
      return {
        ...state,
        loadingGalleryList: true,
      };
    },
    loadingGalleryList(state) {
      return {
        ...state,
        loadingGalleryList: true,
      };
    },
  },
});

export const {
  galleryImageCreated,
  resetGallery,
  galleryUpdated,
  galleryError,
  galleryDeleted,
  galleryListUpdated,
  galleryCategoriesUpdated,
  gallerySearchParameterUpdate,
  loadingOnGallerySubmit,
  loadingGalleryList,
} = gallerySlice.actions;
export default gallerySlice.reducer;

