import api from "@src/utils/axiosSetup";
import {
  setCountries,
  setStates,
  setDistricts,
  setVillages,
  loadingCountries,
  loadingStates,
  loadingDistricts,
  loadingVillages,
} from "@reducers/locationDropdownReducer";

export const fetchCountries = () => async (dispatch, getState) => {
  const state = getState();
  if (state.locationDropdown.loadingCountries) return;
  if (state.locationDropdown.countries.length > 0) return;
  dispatch(loadingCountries());
  try {
    const res = await api.get("/api/admin/countries?limit=1000&page=1");
    if (res.data?.status === true && res.data.response && res.data.response[0]) {
      const countries = res.data.response[0].data || [];
      const formatted = countries
        .filter((c) => !c.isDeleted && c.isActive)
        .map((c) => ({
          value: c._id.toString(),
          label: c.name,
          status: c.status || "active",
        }));
      dispatch(setCountries(formatted));
    } else {
      dispatch(setCountries([]));
    }
  } catch (err) {
    dispatch(setCountries([]));
  }
};

export const fetchStates = (countryId) => async (dispatch, getState) => {
  const state = getState();
  if (state.locationDropdown.loadingStates[countryId]) return;
  if (state.locationDropdown.states[countryId]) return;
  dispatch(loadingStates(countryId));
  try {
    const res = await api.get(`/api/admin/states?limit=1000&page=1&countryId=${countryId}`);
    if (res.data?.status === true && res.data.response && res.data.response[0]) {
      const states = res.data.response[0].data || [];
      const formatted = states
        .filter((s) => !s.isDeleted && s.isActive)
        .map((s) => ({
          value: s._id.toString(),
          label: s.name,
          status: s.status || "active",
        }));
      dispatch(setStates({ countryId, data: formatted }));
    } else {
      dispatch(setStates({ countryId, data: [] }));
    }
  } catch (err) {
    dispatch(setStates({ countryId, data: [] }));
  }
};

export const fetchDistricts = (stateId) => async (dispatch, getState) => {
  const state = getState();
  if (state.locationDropdown.loadingDistricts[stateId]) return;
  if (state.locationDropdown.districts[stateId]) return;
  dispatch(loadingDistricts(stateId));
  try {
    const res = await api.get(`/api/admin/districts?limit=1000&page=1&stateId=${stateId}`);
    if (res.data?.status === true && res.data.response && res.data.response[0]) {
      const districts = res.data.response[0].data || [];
      const formatted = districts
        .filter((d) => !d.isDeleted && d.isActive)
        .map((d) => ({
          value: d._id.toString(),
          label: d.name,
          status: d.status || "active",
        }));
      dispatch(setDistricts({ stateId, data: formatted }));
    } else {
      dispatch(setDistricts({ stateId, data: [] }));
    }
  } catch (err) {
    dispatch(setDistricts({ stateId, data: [] }));
  }
};

export const fetchVillages = (districtId) => async (dispatch, getState) => {
  const state = getState();
  if (state.locationDropdown.loadingVillages[districtId]) return;
  if (state.locationDropdown.villages[districtId]) return;
  dispatch(loadingVillages(districtId));
  try {
    const res = await api.get(`/api/admin/villages?limit=1000&page=1&districtId=${districtId}`);
    if (res.data?.status === true && res.data.response && res.data.response[0]) {
      const villages = res.data.response[0].data || [];
      const formatted = villages
        .filter((v) => !v.isDeleted && v.isActive)
        .map((v) => ({
          value: v._id.toString(),
          label: v.name,
          status: v.status || "active",
        }));
      dispatch(setVillages({ districtId, data: formatted }));
    } else {
      dispatch(setVillages({ districtId, data: [] }));
    }
  } catch (err) {
    dispatch(setVillages({ districtId, data: [] }));
  }
};
