import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  newsList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentNews: null,
  loadingNewsList: true,
  loadingNews: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "displayOrder",
    ascending: "asc",
    query: "",
  },
};

const newsSlice = createSlice({
  name: "adminNews",
  initialState: initialState,
  reducers: {
    newsCreated(state) {
      state.loadingNewsList = false;
    },
    resetNews(state) {
      return {
        ...initialState,
      };
    },
    newsUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingNewsList: false,
      };
    },
    newsError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingNewsList: false,
        loadingNews: false,
      };
    },
    newsDeleted(state, action) {
      const currentCount = state.newsList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.newsList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        newsList: {
          data: state.newsList.data.filter(
            (news) => news._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingNewsList: false,
      };
    },
    newsListUpdated(state, action) {
      return {
        ...state,
        newsList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingNewsList: false,
      };
    },
    newsDetailsById(state, action) {
      return {
        ...state,
        currentNews: action.payload,
        loadingNews: false,
      };
    },
    newsSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingNewsList: false,
      };
    },
    loadingOnNewsSubmit(state) {
      return {
        ...state,
        loadingNewsList: true,
      };
    },
    loadingNewsList(state) {
      return {
        ...state,
        loadingNewsList: true,
      };
    },
    loadingNews(state) {
      return {
        ...state,
        loadingNews: true,
      };
    },
  },
});

export const {
  newsCreated,
  resetNews,
  newsUpdated,
  newsError,
  newsDeleted,
  newsListUpdated,
  newsDetailsById,
  newsSearchParameterUpdate,
  loadingOnNewsSubmit,
  loadingNewsList,
  loadingNews,
} = newsSlice.actions;
export default newsSlice.reducer;
