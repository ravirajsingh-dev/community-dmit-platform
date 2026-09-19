import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loading: false,
  loadingTree: false,
  family: null,
  members: [],
  marriages: [],
  totalMembers: null,
  flatPage: null,
  flatLimit: null,
  tree: null,
  error: null,
};

const familySlice = createSlice({
  name: "family",
  initialState,
  reducers: {
    FAMILY_REQUEST(state) {
      return { ...state, loading: true, error: null };
    },
    FAMILY_TREE_REQUEST(state) {
      return { ...state, loadingTree: true, error: null };
    },
    FAMILY_SET(state, action) {
      return { ...state, loading: false, family: action.payload, error: null };
    },
    FAMILY_FLAT_SET(state, action) {
      const { family, members, marriages, totalMembers, page, limit } = action.payload || {};
      const hasPagination = page !== undefined && limit !== undefined;
      return {
        ...state,
        loading: false,
        family: family || state.family,
        members: members || [],
        marriages: marriages || [],
        totalMembers: totalMembers !== undefined ? totalMembers : (members?.length != null && !hasPagination ? members.length : state.totalMembers),
        flatPage: hasPagination ? page : null,
        flatLimit: hasPagination ? limit : null,
        error: null,
      };
    },
    FAMILY_TREE_SET(state, action) {
      return { ...state, loadingTree: false, tree: action.payload, error: null };
    },
    FAMILY_FAIL(state, action) {
      return { ...state, loading: false, loadingTree: false, error: action.payload || "Error" };
    },
    FAMILY_RESET() {
      return { ...initialState };
    },
  },
});

export const {
  FAMILY_REQUEST,
  FAMILY_TREE_REQUEST,
  FAMILY_SET,
  FAMILY_FLAT_SET,
  FAMILY_TREE_SET,
  FAMILY_FAIL,
  FAMILY_RESET,
} = familySlice.actions;

export default familySlice.reducer;

