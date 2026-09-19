import api from "@src/utils/axiosSetup";
import {
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
} from "@src/reducers/masterDataDropdownReducer";
import { setAlert } from "./alert";

/**
 * Fetch communities for dropdown
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchCommunities = () => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingCommunities) {
    return { data: state.masterDataDropdown.communities };
  }
  if (state.masterDataDropdown.communitiesFetchedOnce) {
    return { data: state.masterDataDropdown.communities };
  }

  dispatch(loadingCommunities());
  try {
    const res = await api.get("/api/users/master-data/communities");
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setCommunities(formatted));
      return { data: formatted };
    } else {
      dispatch(setCommunities([]));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching communities:", err);
    dispatch(setCommunities([]));
    return { data: [] };
  }
};

/**
 * Fetch vanshes for a community
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchVanshes = (communityId) => async (dispatch, getState) => {
  if (!communityId) return { data: [] };

  const state = getState();
  if (state.masterDataDropdown.loadingVanshes[communityId]) {
    return { data: state.masterDataDropdown.vanshes[communityId] || [] };
  }
  if (state.masterDataDropdown.vanshes[communityId]) {
    return { data: state.masterDataDropdown.vanshes[communityId] };
  }

  dispatch(loadingVanshes(communityId));
  try {
    const res = await api.get(
      `/api/users/master-data/vanshes?communityId=${communityId}`,
    );
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setVanshes({ communityId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setVanshes({ communityId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching vanshes:", err);
    dispatch(setVanshes({ communityId, data: [] }));
    return { data: [] };
  }
};

/**
 * Fetch kuls for a vansh
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchKuls = (vanshId) => async (dispatch, getState) => {
  if (!vanshId) return { data: [] };

  const state = getState();
  if (state.masterDataDropdown.loadingKuls[vanshId]) {
    return { data: state.masterDataDropdown.kuls[vanshId] || [] };
  }
  if (state.masterDataDropdown.kuls[vanshId]) {
    return { data: state.masterDataDropdown.kuls[vanshId] };
  }

  dispatch(loadingKuls(vanshId));
  try {
    const res = await api.get(`/api/users/master-data/kuls?vanshId=${vanshId}`);
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setKuls({ vanshId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setKuls({ vanshId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching kuls:", err);
    dispatch(setKuls({ vanshId, data: [] }));
    return { data: [] };
  }
};

/**
 * Fetch khamps for a kul
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchKhamps = (kulId) => async (dispatch, getState) => {
  if (!kulId) return { data: [] };

  const state = getState();
  if (state.masterDataDropdown.loadingKhamps[kulId]) {
    return { data: state.masterDataDropdown.khamps[kulId] || [] };
  }
  if (state.masterDataDropdown.khamps[kulId]) {
    return { data: state.masterDataDropdown.khamps[kulId] };
  }

  dispatch(loadingKhamps(kulId));
  try {
    const res = await api.get(`/api/users/master-data/khamps?kulId=${kulId}`);
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setKhamps({ kulId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setKhamps({ kulId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching khamps:", err);
    dispatch(setKhamps({ kulId, data: [] }));
    return { data: [] };
  }
};

/**
 * Create a new community
 */
export const createCommunity = (name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/communities", {
      name,
    });
    if (response.data?.status === true) {
      dispatch(invalidateCommunitiesDropdown());
      dispatch(setAlert("Community created successfully", "success"));
      return response.data;
    } else {
      dispatch(
        setAlert(
          response.data?.message || "Failed to create community",
          "danger",
        ),
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating community:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create community",
        "danger",
      ),
    );
    return null;
  }
};

/**
 * Create a new vansh
 */
export const createVansh = (communityId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/vanshes", {
      communityId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached vanshes for this community
      dispatch(setVanshes({ communityId, data: [] }));
      dispatch(setAlert("Vansh created successfully", "success"));
      return response.data;
    } else {
      dispatch(
        setAlert(response.data?.message || "Failed to create vansh", "danger"),
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating vansh:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create vansh",
        "danger",
      ),
    );
    return null;
  }
};

/**
 * Create a new kul
 */
export const createKul = (vanshId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/kuls", {
      vanshId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached kuls for this vansh
      dispatch(setKuls({ vanshId, data: [] }));
      dispatch(setAlert("Kul created successfully", "success"));
      return response.data;
    } else {
      dispatch(
        setAlert(response.data?.message || "Failed to create kul", "danger"),
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating kul:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create kul",
        "danger",
      ),
    );
    return null;
  }
};

/**
 * Create a new khamp
 */
export const createKhamp = (kulId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/khamps", {
      kulId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached khamps for this kul
      dispatch(setKhamps({ kulId, data: [] }));
      dispatch(setAlert("Khamp created successfully", "success"));
      return response.data;
    } else {
      dispatch(
        setAlert(response.data?.message || "Failed to create khamp", "danger"),
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating khamp:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create khamp",
        "danger",
      ),
    );
    return null;
  }
};

/**
 * Fetch gotras for a khamp
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchGotras = (khampId) => async (dispatch, getState) => {
  if (!khampId) return { data: [] };

  const state = getState();
  if (state.masterDataDropdown.loadingGotras[khampId]) {
    return { data: state.masterDataDropdown.gotras[khampId] || [] };
  }
  if (state.masterDataDropdown.gotras[khampId]) {
    return { data: state.masterDataDropdown.gotras[khampId] };
  }

  dispatch(loadingGotras(khampId));
  try {
    const res = await api.get(
      `/api/users/master-data/gotras?khampId=${khampId}`,
    );
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setGotras({ khampId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setGotras({ khampId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching gotras:", err);
    dispatch(setGotras({ khampId, data: [] }));
    return { data: [] };
  }
};

/**
 * Create a new gotra
 */
export const createGotra = (khampId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/gotras", {
      khampId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached gotras for this khamp
      dispatch(setGotras({ khampId, data: [] }));
      dispatch(setAlert("Gotra created successfully", "success"));
      return response.data;
    } else {
      dispatch(
        setAlert(response.data?.message || "Failed to create gotra", "danger"),
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating gotra:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create gotra",
        "danger",
      ),
    );
    return null;
  }
};
