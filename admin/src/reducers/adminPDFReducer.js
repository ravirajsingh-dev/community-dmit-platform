import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  pdfList: {
    page: 1,
    data: [],
    count: 0,
  },
  loadingPDFList: true,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "displayOrder",
    ascending: "asc",
    query: "",
  },
};

const pdfSlice = createSlice({
  name: "adminPDF",
  initialState: initialState,
  reducers: {
    pdfDocumentCreated(state) {
      state.loadingPDFList = false;
    },
    resetPDF(state) {
      return {
        ...initialState,
      };
    },
    pdfUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingPDFList: false,
      };
    },
    pdfError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingPDFList: false,
      };
    },
    pdfDeleted(state, action) {
      const currentCount = state.pdfList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.pdfList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        pdfList: {
          data: state.pdfList.data.filter(
            (pdf) => pdf._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingPDFList: false,
      };
    },
    pdfListUpdated(state, action) {
      return {
        ...state,
        pdfList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingPDFList: false,
      };
    },
    pdfSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingPDFList: false,
      };
    },
    loadingOnPDFSubmit(state) {
      return {
        ...state,
        loadingPDFList: true,
      };
    },
    loadingPDFList(state) {
      return {
        ...state,
        loadingPDFList: true,
      };
    },
  },
});

export const {
  pdfDocumentCreated,
  resetPDF,
  pdfUpdated,
  pdfError,
  pdfDeleted,
  pdfListUpdated,
  pdfSearchParameterUpdate,
  loadingOnPDFSubmit,
  loadingPDFList,
} = pdfSlice.actions;
export default pdfSlice.reducer;
