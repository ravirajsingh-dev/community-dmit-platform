import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  countryList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentCountry: null,
  loadingCountriesList: false,
  loadingCountry: false,
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

const countrySlice = createSlice({
  name: "adminCountry",
  initialState: initialState,
  reducers: {
    countryCreated(state) {
      state.loadingCountriesList = false;
      state.loadingCountry = false;
    },
    resetCountry(state) {
      return {
        ...initialState,
      };
    },
    countryUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingCountriesList: false,
      };
    },
    countryError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingCountriesList: false,
        loadingCountry: false,
      };
    },
    countryDeleted(state, action) {
      const currentCount = state.countryList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.countryList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        countryList: {
          data: state.countryList.data.filter(
            (country) => country._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingCountriesList: false,
      };
    },
    countryListUpdated(state, action) {
      return {
        ...state,
        countryList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingCountriesList: false,
      };
    },
    countryDetailsById(state, action) {
      return {
        ...state,
        currentCountry: action.payload,
        loadingCountry: false,
      };
    },
    countrySearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingCountriesList: false,
      };
    },
    loadingOnCountrySubmit(state) {
      return {
        ...state,
        loadingCountriesList: true,
        loadingCountry: true,
      };
    },
    loadingCountriesList(state) {
      return {
        ...state,
        loadingCountriesList: true,
      };
    },
    loadingCountry(state) {
      return {
        ...state,
        loadingCountry: true,
      };
    },
    countryStatusToggled(state, action) {
      return {
        ...state,
        countryList: {
          ...state.countryList,
          data: state.countryList.data.map((country) =>
            country._id === action.payload._id
              ? { ...country, isActive: action.payload.isActive }
              : country
          ),
        },
      };
    },
  },
});

export const {
  countryCreated,
  resetCountry,
  countryUpdated,
  countryError,
  countryDeleted,
  countryListUpdated,
  countryDetailsById,
  countrySearchParameterUpdate,
  loadingOnCountrySubmit,
  loadingCountriesList,
  loadingCountry,
  countryStatusToggled,
} = countrySlice.actions;
export default countrySlice.reducer;
