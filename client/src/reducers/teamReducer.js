import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dashboardCounts: null,
  loadingDashboard: false,
  directTeam: [],
  directPagination: {},
  loadingDirect: false,
  appliedParamsDirect: null,
  allTeam: [],
  allPagination: {},
  loadingAll: false,
  appliedParamsMyTeam: null,
  levelTeam: [],
  levelPagination: {},
  level: null,
  loadingLevel: false,
  appliedParamsLevelTeam: null,
  // Member list (for viewing another member's direct/downline)
  memberList: [],
  memberListPagination: {},
  loadingMemberList: false,
  error: null,
};

const teamSlice = createSlice({
  name: "team",
  initialState,
  reducers: {
    teamDashboardRequest(state) {
      state.loadingDashboard = true;
      state.error = null;
    },
    teamDashboardSuccess(state, action) {
      state.dashboardCounts = action.payload;
      state.loadingDashboard = false;
    },
    teamDashboardError(state, action) {
      state.loadingDashboard = false;
      state.error = action.payload;
    },
    directTeamRequest(state) {
      state.loadingDirect = true;
      state.error = null;
    },
    directTeamSuccess(state, action) {
      state.directTeam = action.payload.users || [];
      state.directPagination = action.payload.pagination || {};
      state.loadingDirect = false;
    },
    directTeamError(state, action) {
      state.loadingDirect = false;
      state.error = action.payload;
    },
    allTeamRequest(state) {
      state.loadingAll = true;
      state.error = null;
    },
    allTeamSuccess(state, action) {
      state.allTeam = action.payload.users || [];
      state.allPagination = action.payload.pagination || {};
      state.loadingAll = false;
    },
    allTeamError(state, action) {
      state.loadingAll = false;
      state.error = action.payload;
    },
    levelTeamRequest(state) {
      state.loadingLevel = true;
      state.error = null;
    },
    levelTeamSuccess(state, action) {
      state.levelTeam = action.payload.users || [];
      state.levelPagination = action.payload.pagination || {};
      state.level = action.payload.level;
      state.loadingLevel = false;
    },
    levelTeamError(state, action) {
      state.loadingLevel = false;
      state.error = action.payload;
    },
    resetTeamState(state) {
      return initialState;
    },
    setAppliedParamsDirect(state, action) {
      state.appliedParamsDirect = action.payload;
    },
    setAppliedParamsMyTeam(state, action) {
      state.appliedParamsMyTeam = action.payload;
    },
    setAppliedParamsLevelTeam(state, action) {
      state.appliedParamsLevelTeam = action.payload;
    },
    memberListRequest(state) {
      state.loadingMemberList = true;
      state.error = null;
    },
    memberListSuccess(state, action) {
      state.memberList = action.payload.users || [];
      state.memberListPagination = action.payload.pagination || {};
      state.loadingMemberList = false;
    },
    memberListError(state, action) {
      state.loadingMemberList = false;
      state.error = action.payload;
    },
  },
});

export const {
  teamDashboardRequest,
  teamDashboardSuccess,
  teamDashboardError,
  directTeamRequest,
  directTeamSuccess,
  directTeamError,
  allTeamRequest,
  allTeamSuccess,
  allTeamError,
  levelTeamRequest,
  levelTeamSuccess,
  levelTeamError,
  resetTeamState,
  setAppliedParamsDirect,
  setAppliedParamsMyTeam,
  setAppliedParamsLevelTeam,
  memberListRequest,
  memberListSuccess,
  memberListError,
} = teamSlice.actions;
export default teamSlice.reducer;
