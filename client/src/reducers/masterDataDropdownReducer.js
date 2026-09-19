import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  communities: [],
  /** After first successful/failed list fetch; avoids refetching when list is empty. */
  communitiesFetchedOnce: false,
  vanshes: {},
  kuls: {},
  khamps: {},
  gotras: {},
  loadingCommunities: false,
  loadingVanshes: {},
  loadingKuls: {},
  loadingKhamps: {},
  loadingGotras: {},
};

const masterDataDropdownSlice = createSlice({
  name: "masterDataDropdown",
  initialState: initialState,
  reducers: {
    setCommunities(state, action) {
      state.communities = action.payload;
      state.loadingCommunities = false;
      state.communitiesFetchedOnce = true;
    },
    invalidateCommunitiesDropdown(state) {
      state.communities = [];
      state.communitiesFetchedOnce = false;
      state.loadingCommunities = false;
    },
    setVanshes(state, action) {
      const { communityId, data } = action.payload;
      state.vanshes[communityId] = data;
      state.loadingVanshes[communityId] = false;
    },
    setKuls(state, action) {
      const { vanshId, data } = action.payload;
      state.kuls[vanshId] = data;
      state.loadingKuls[vanshId] = false;
    },
    setKhamps(state, action) {
      const { kulId, data } = action.payload;
      state.khamps[kulId] = data;
      state.loadingKhamps[kulId] = false;
    },
    setGotras(state, action) {
      const { khampId, data } = action.payload;
      state.gotras[khampId] = data;
      state.loadingGotras[khampId] = false;
    },
    loadingCommunities(state) {
      state.loadingCommunities = true;
    },
    loadingVanshes(state, action) {
      state.loadingVanshes[action.payload] = true;
    },
    loadingKuls(state, action) {
      state.loadingKuls[action.payload] = true;
    },
    loadingKhamps(state, action) {
      state.loadingKhamps[action.payload] = true;
    },
    loadingGotras(state, action) {
      state.loadingGotras[action.payload] = true;
    },
    resetMasterDataDropdown(state) {
      return initialState;
    },
  },
});

export const {
  setCommunities,
  invalidateCommunitiesDropdown,
  setVanshes,
  setKuls,
  setKhamps,
  setGotras,
  loadingCommunities,
  loadingVanshes,
  loadingKuls,
  loadingKhamps,
  loadingGotras,
  resetMasterDataDropdown,
} = masterDataDropdownSlice.actions;
export default masterDataDropdownSlice.reducer;
