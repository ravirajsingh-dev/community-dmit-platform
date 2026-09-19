import api from "@src/utils/axiosSetup";
import {
  setCommunities,
  setVanshes,
  setKuls,
  setKhamps,
  setGotras,
  loadingCommunities,
  loadingVanshes,
  loadingKuls,
  loadingKhamps,
  loadingGotras,
} from "@reducers/masterDataDropdownReducer";

export const fetchCommunities = () => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingCommunities) return;
  if (state.masterDataDropdown.communities.length > 0) return;
  dispatch(loadingCommunities());
  try {
    const res = await api.get("/api/admin/communities?limit=1000&page=1");
    if (
      res.data?.status === true &&
      res.data.response &&
      res.data.response[0]
    ) {
      const communities = res.data.response[0].data || [];
      const formatted = communities
        .filter((c) => !c.isDeleted && c.isActive)
        .map((c) => ({
          value: c._id.toString(),
          label: c.name,
          status: c.status || "active",
        }));
      dispatch(setCommunities(formatted));
    } else {
      dispatch(setCommunities([]));
    }
  } catch (err) {
    dispatch(setCommunities([]));
  }
};

export const fetchVanshes = (communityId) => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingVanshes[communityId]) return;
  if (state.masterDataDropdown.vanshes[communityId]) return;
  dispatch(loadingVanshes(communityId));
  try {
    const res = await api.get(
      `/api/admin/vansh?limit=1000&page=1&communityId=${communityId}`,
    );
    if (
      res.data?.status === true &&
      res.data.response &&
      res.data.response[0]
    ) {
      const vanshes = res.data.response[0].data || [];
      const formatted = vanshes
        .filter((v) => !v.isDeleted && v.isActive)
        .map((v) => ({
          value: v._id.toString(),
          label: v.name,
          status: v.status || "active",
        }));
      dispatch(setVanshes({ communityId, data: formatted }));
    } else {
      dispatch(setVanshes({ communityId, data: [] }));
    }
  } catch (err) {
    dispatch(setVanshes({ communityId, data: [] }));
  }
};

export const fetchKuls = (vanshId) => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingKuls[vanshId]) return;
  if (state.masterDataDropdown.kuls[vanshId]) return;
  dispatch(loadingKuls(vanshId));
  try {
    const res = await api.get(
      `/api/admin/kul?limit=1000&page=1&vanshId=${vanshId}`,
    );
    if (
      res.data?.status === true &&
      res.data.response &&
      res.data.response[0]
    ) {
      const kuls = res.data.response[0].data || [];
      const formatted = kuls
        .filter((k) => !k.isDeleted && k.isActive)
        .map((k) => ({
          value: k._id.toString(),
          label: k.name,
          status: k.status || "active",
        }));
      dispatch(setKuls({ vanshId, data: formatted }));
    } else {
      dispatch(setKuls({ vanshId, data: [] }));
    }
  } catch (err) {
    dispatch(setKuls({ vanshId, data: [] }));
  }
};

export const fetchKhamps = (kulId) => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingKhamps[kulId]) return;
  if (state.masterDataDropdown.khamps[kulId]) return;
  dispatch(loadingKhamps(kulId));
  try {
    const res = await api.get(
      `/api/admin/khamp?limit=1000&page=1&kulId=${kulId}`,
    );
    if (
      res.data?.status === true &&
      res.data.response &&
      res.data.response[0]
    ) {
      const khamps = res.data.response[0].data || [];
      const formatted = khamps
        .filter((k) => !k.isDeleted && k.isActive)
        .map((k) => ({
          value: k._id.toString(),
          label: k.name,
          status: k.status || "active",
        }));
      dispatch(setKhamps({ kulId, data: formatted }));
    } else {
      dispatch(setKhamps({ kulId, data: [] }));
    }
  } catch (err) {
    dispatch(setKhamps({ kulId, data: [] }));
  }
};

export const fetchGotras = (khampId) => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingGotras[khampId]) return;
  if (state.masterDataDropdown.gotras[khampId]) return;
  dispatch(loadingGotras(khampId));
  try {
    const res = await api.get(
      `/api/admin/gotra?limit=1000&page=1&khampId=${khampId}`,
    );
    if (
      res.data?.status === true &&
      res.data.response &&
      res.data.response[0]
    ) {
      const gotras = res.data.response[0].data || [];
      const formatted = gotras
        .filter((g) => !g.isDeleted && g.isActive)
        .map((g) => ({
          value: g._id.toString(),
          label: g.name,
          status: g.status || "active",
        }));
      dispatch(setGotras({ khampId, data: formatted }));
    } else {
      dispatch(setGotras({ khampId, data: [] }));
    }
  } catch (err) {
    dispatch(setGotras({ khampId, data: [] }));
  }
};
