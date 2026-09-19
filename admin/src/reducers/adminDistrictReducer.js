import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  districtList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentDistrict: null,
  loadingDistrictsList: false,
  loadingDistrict: false,
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

const districtSlice = createSlice({
  name: "adminDistrict",
  initialState: initialState,
  reducers: {
    districtCreated(state) {
      state.loadingDistrictsList = false;
      state.loadingDistrict = false;
    },
    resetDistrict(state) {
      return {
        ...initialState,
      };
    },
    districtUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingDistrictsList: false,
      };
    },
    districtError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingDistrictsList: false,
        loadingDistrict: false,
      };
    },
    districtDeleted(state, action) {
      const currentCount = state.districtList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.districtList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        districtList: {
          data: state.districtList.data.filter(
            (district) => district._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingDistrictsList: false,
      };
    },
    districtListUpdated(state, action) {
      return {
        ...state,
        districtList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingDistrictsList: false,
      };
    },
    districtDetailsById(state, action) {
      return {
        ...state,
        currentDistrict: action.payload,
        loadingDistrict: false,
      };
    },
    districtSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingDistrictsList: false,
      };
    },
    loadingOnDistrictSubmit(state) {
      return {
        ...state,
        loadingDistrictsList: true,
        loadingDistrict: true,
      };
    },
    loadingDistrictsList(state) {
      return {
        ...state,
        loadingDistrictsList: true,
      };
    },
    loadingDistrict(state) {
      return {
        ...state,
        loadingDistrict: true,
      };
    },
    districtStatusToggled(state, action) {
      return {
        ...state,
        districtList: {
          ...state.districtList,
          data: state.districtList.data.map((district) =>
            district._id === action.payload._id
              ? { ...district, isActive: action.payload.isActive }
              : district
          ),
        },
      };
    },
  },
});

export const {
  districtCreated,
  resetDistrict,
  districtUpdated,
  districtError,
  districtDeleted,
  districtListUpdated,
  districtDetailsById,
  districtSearchParameterUpdate,
  loadingOnDistrictSubmit,
  loadingDistrictsList,
  loadingDistrict,
  districtStatusToggled,
} = districtSlice.actions;
export default districtSlice.reducer;
