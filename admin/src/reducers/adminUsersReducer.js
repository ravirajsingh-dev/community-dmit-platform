import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  usersList: {
    page: 1,
    data: [],
    count: 0,
    summary: {
      active: 0,
      paid: 0,
      inactive: 0,
      newUsers: 0,
    },
  },
  currentUser: [],
  loadingUsersList: true,
  loadingUser: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
    isAll: 1,
  },
};

const userSlice = createSlice({
  name: "adminUsers",
  initialState: initialState,
  reducers: {
    userCreated(state) {
      state.loadingUser = false;
    },
    resetUser(state) {
      return {
        ...initialState,
      };
    },
    loadUserPage(state) {
      return {
        ...state,
        loadingUser: false,
      };
    },
    userUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingUser: false,
      };
    },
    userError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingUser: false,
        loadingUsersList: false,
      };
    },
    userDeleted(state, action) {
      const currentCount = state.usersList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.usersList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        usersList: {
          data: state.usersList.data.filter(
            (user) => user._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingUsersList: false,
      };
    },
    userDetailsById(state, action) {
      return {
        ...state,
        currentUser: action.payload,
        loadingUser: false,
      };
    },
    userListUpdated(state, action) {
      return {
        ...state,
        usersList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
          summary: action.payload.summary?.[0] || {
            active: 0,
            paid: 0,
            inactive: 0,
            newUsers: 0,
          },
        },
        loadingUsersList: false,
      };
    },

    userSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingUsersList: false,
      };
    },
    loadingOnUserSubmit(state) {
      return {
        ...state,
        loadingUser: true,
      };
    },
    loadingUsersList(state) {
      return {
        ...state,
        loadingUsersList: true,
      };
    },
  },
});

export const {
  userCreated,
  resetUser,
  loadUserPage,
  userUpdated,
  userError,
  userDeleted,
  userDetailsById,
  userListUpdated,
  userSearchParameterUpdate,
  loadingOnUserSubmit,
  loadingUsersList,
} = userSlice.actions;
export default userSlice.reducer;
