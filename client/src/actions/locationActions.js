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
} from "@src/reducers/locationDropdownReducer";
import { setAlert } from "./alert";

/**
 * Fetch countries for dropdown
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchCountries = () => async (dispatch, getState) => {
  const state = getState();
  if (state.locationDropdown.loadingCountries) {
    return { data: state.locationDropdown.countries };
  }
  if (state.locationDropdown.countries.length > 0) {
    return { data: state.locationDropdown.countries };
  }
  
  dispatch(loadingCountries());
  try {
    const res = await api.get("/api/users/location/countries");
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setCountries(formatted));
      return { data: formatted };
    } else {
      dispatch(setCountries([]));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching countries:", err);
    dispatch(setCountries([]));
    return { data: [] };
  }
};

/**
 * Fetch states for a country
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchStates = (countryId) => async (dispatch, getState) => {
  if (!countryId) return { data: [] };
  
  const state = getState();
  if (state.locationDropdown.loadingStates[countryId]) {
    return { data: state.locationDropdown.states[countryId] || [] };
  }
  if (state.locationDropdown.states[countryId]) {
    return { data: state.locationDropdown.states[countryId] };
  }
  
  dispatch(loadingStates(countryId));
  try {
    const res = await api.get(`/api/users/location/states?countryId=${countryId}`);
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setStates({ countryId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setStates({ countryId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching states:", err);
    dispatch(setStates({ countryId, data: [] }));
    return { data: [] };
  }
};

/**
 * Fetch districts for a state
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchDistricts = (stateId) => async (dispatch, getState) => {
  if (!stateId) return { data: [] };
  
  const state = getState();
  if (state.locationDropdown.loadingDistricts[stateId]) {
    return { data: state.locationDropdown.districts[stateId] || [] };
  }
  if (state.locationDropdown.districts[stateId]) {
    return { data: state.locationDropdown.districts[stateId] };
  }
  
  dispatch(loadingDistricts(stateId));
  try {
    const res = await api.get(`/api/users/location/districts?stateId=${stateId}`);
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setDistricts({ stateId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setDistricts({ stateId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching districts:", err);
    dispatch(setDistricts({ stateId, data: [] }));
    return { data: [] };
  }
};

/**
 * Fetch villages for a district
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchVillages = (districtId) => async (dispatch, getState) => {
  if (!districtId) return { data: [] };
  
  const state = getState();
  if (state.locationDropdown.loadingVillages[districtId]) {
    return { data: state.locationDropdown.villages[districtId] || [] };
  }
  if (state.locationDropdown.villages[districtId]) {
    return { data: state.locationDropdown.villages[districtId] };
  }
  
  dispatch(loadingVillages(districtId));
  try {
    const res = await api.get(`/api/users/location/villages?districtId=${districtId}`);
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setVillages({ districtId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setVillages({ districtId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching villages:", err);
    dispatch(setVillages({ districtId, data: [] }));
    return { data: [] };
  }
};

/**
 * Create a new state
 */
export const createState = (countryId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/location/states", {
      countryId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached states for this country
      dispatch(setStates({ countryId, data: [] }));
      dispatch(setAlert("State created successfully", "success"));
      return response.data;
    } else {
      dispatch(setAlert(response.data?.message || "Failed to create state", "danger"));
      return null;
    }
  } catch (error) {
    console.error("Error creating state:", error);
    dispatch(setAlert(error.response?.data?.message || "Failed to create state", "danger"));
    return null;
  }
};

/**
 * Create a new district
 */
export const createDistrict = (stateId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/location/districts", {
      stateId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached districts for this state
      dispatch(setDistricts({ stateId, data: [] }));
      dispatch(setAlert("District created successfully", "success"));
      return response.data;
    } else {
      dispatch(setAlert(response.data?.message || "Failed to create district", "danger"));
      return null;
    }
  } catch (error) {
    console.error("Error creating district:", error);
    dispatch(setAlert(error.response?.data?.message || "Failed to create district", "danger"));
    return null;
  }
};

/**
 * Create a new village
 */
export const createVillage = (districtId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/location/villages", {
      districtId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached villages for this district
      dispatch(setVillages({ districtId, data: [] }));
      dispatch(setAlert("Village created successfully", "success"));
      return response.data;
    } else {
      dispatch(setAlert(response.data?.message || "Failed to create village", "danger"));
      return null;
    }
  } catch (error) {
    console.error("Error creating village:", error);
    dispatch(setAlert(error.response?.data?.message || "Failed to create village", "danger"));
    return null;
  }
};
