import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loading: false,
  loadingTree: false,
  targetUser: null,
  family: null,
  members: [],
  marriages: [],
  tree: null,
  error: {},
};

const adminFamilySlice = createSlice({
  name: "adminFamily",
  initialState,
  reducers: {
    adminFamilyRequest(state) {
      return { ...state, loading: true, error: {} };
    },
    adminFamilyTreeRequest(state) {
      return { ...state, loadingTree: true, error: {} };
    },
    adminFamilyError(state, action) {
      return { ...state, loading: false, loadingTree: false, error: action.payload || {} };
    },
    adminFamilyTargetUserSet(state, action) {
      return { ...state, targetUser: action.payload || null };
    },
    adminFamilyFlatSet(state, action) {
      const { family, members, marriages } = action.payload || {};
      return {
        ...state,
        loading: false,
        family: family || state.family,
        members: members || [],
        marriages: marriages || [],
      };
    },
    adminFamilyTreeSet(state, action) {
      return { ...state, loadingTree: false, tree: action.payload || null };
    },
    adminFamilyReset() {
      return { ...initialState };
    },
  },
});

export const {
  adminFamilyRequest,
  adminFamilyTreeRequest,
  adminFamilyError,
  adminFamilyTargetUserSet,
  adminFamilyFlatSet,
  adminFamilyTreeSet,
  adminFamilyReset,
} = adminFamilySlice.actions;

export default adminFamilySlice.reducer;

