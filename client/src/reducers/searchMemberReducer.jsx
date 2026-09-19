import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  membersList: [],
  count: 0,
  loadingMembersList: false,
  error: null,
  memberDetails: null,
  loadingMemberDetails: false,
  memberDetailsError: null,
  appliedParams: null,
};

const searchMemberSlice = createSlice({
  name: "searchMember",
  initialState: initialState,
  reducers: {
    membersListUpdated(state, action) {
      return {
        ...state,
        membersList: action.payload.data || [],
        count: action.payload.count || 0,
        loadingMembersList: false,
        error: null,
      };
    },
    membersListError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingMembersList: false,
      };
    },
    loadingMembersList(state) {
      return {
        ...state,
        loadingMembersList: true,
        error: null,
      };
    },
    resetSearchMember(state) {
      return { ...initialState, appliedParams: state.appliedParams };
    },
    memberDetailsUpdated(state, action) {
      return {
        ...state,
        memberDetails: action.payload,
        loadingMemberDetails: false,
        memberDetailsError: null,
      };
    },
    memberDetailsError(state, action) {
      return {
        ...state,
        memberDetailsError: action.payload,
        loadingMemberDetails: false,
        memberDetails: null,
      };
    },
    loadingMemberDetails(state) {
      return {
        ...state,
        loadingMemberDetails: true,
        memberDetailsError: null,
      };
    },
    resetMemberDetails(state) {
      return {
        ...state,
        memberDetails: null,
        loadingMemberDetails: false,
        memberDetailsError: null,
      };
    },
    setAppliedParams(state, action) {
      state.appliedParams = action.payload;
    },
  },
});

export const {
  membersListUpdated,
  membersListError,
  loadingMembersList,
  resetSearchMember,
  memberDetailsUpdated,
  memberDetailsError,
  loadingMemberDetails,
  resetMemberDetails,
  setAppliedParams,
} = searchMemberSlice.actions;
export default searchMemberSlice.reducer;
