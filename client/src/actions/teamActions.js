import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import {
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
  memberListRequest,
  memberListSuccess,
  memberListError,
} from "@src/reducers/teamReducer";

export const getTeamDashboard = () => async (dispatch) => {
  dispatch(teamDashboardRequest());
  try {
    const res = await api.get("/api/users/team/dashboard");
    if (res.data?.status && res.data?.response) {
      dispatch(teamDashboardSuccess(res.data.response));
    } else {
      dispatch(teamDashboardSuccess({ directCount: 0, totalDownlineCount: 0 }));
    }
  } catch (err) {
    dispatch(teamDashboardError(err?.message));
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch team dashboard", "danger"));
  }
};

const teamParamsSerializer = {
  serialize: (params) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined) {
        if (key === "query" && typeof params[key] === "object") {
          searchParams.append(key, JSON.stringify(params[key]));
        } else if (key === "filters" && Array.isArray(params[key])) {
          searchParams.append(key, params[key].join(","));
        } else {
          searchParams.append(key, params[key]);
        }
      }
    });
    return searchParams.toString();
  },
};

export const getDirectTeam = (params = {}) => async (dispatch) => {
  dispatch(directTeamRequest());
  try {
    const requestParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending && { ascending: params.ascending }),
      ...(params.filters && params.filters.length && { filters: params.filters }),
      ...(params.query && Object.keys(params.query).length && { query: params.query }),
    };
    const res = await api.get("/api/users/team/direct", {
      params: requestParams,
      paramsSerializer: teamParamsSerializer,
    });
    if (res.data?.status && res.data?.response) {
      dispatch(directTeamSuccess(res.data.response));
    } else {
      dispatch(directTeamSuccess({ users: [], pagination: {} }));
    }
  } catch (err) {
    dispatch(directTeamError(err?.message));
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch direct team", "danger"));
  }
};

export const getAllTeam = (params = {}) => async (dispatch) => {
  dispatch(allTeamRequest());
  try {
    const requestParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending && { ascending: params.ascending }),
      ...(params.level && { level: params.level }),
      ...(params.filters && params.filters.length && { filters: params.filters }),
      ...(params.query && Object.keys(params.query).length && { query: params.query }),
    };
    const res = await api.get("/api/users/team/all", {
      params: requestParams,
      paramsSerializer: teamParamsSerializer,
    });
    if (res.data?.status && res.data?.response) {
      dispatch(allTeamSuccess(res.data.response));
    } else {
      dispatch(allTeamSuccess({ users: [], pagination: {} }));
    }
  } catch (err) {
    dispatch(allTeamError(err?.message));
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch team", "danger"));
  }
};

export const getTeamByLevel = (level, params = {}) => async (dispatch) => {
  dispatch(levelTeamRequest());
  try {
    const requestParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending && { ascending: params.ascending }),
      ...(params.filters && params.filters.length && { filters: params.filters }),
      ...(params.query && Object.keys(params.query).length && { query: params.query }),
    };
    const res = await api.get(`/api/users/team/level/${level}`, {
      params: requestParams,
      paramsSerializer: teamParamsSerializer,
    });
    if (res.data?.status && res.data?.response) {
      dispatch(levelTeamSuccess(res.data.response));
    } else {
      dispatch(levelTeamSuccess({ users: [], pagination: {}, level }));
    }
  } catch (err) {
    dispatch(levelTeamError(err?.message));
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch level team", "danger"));
  }
};

export const getMemberDirectTeam = (userId, params = {}) => async (dispatch) => {
  dispatch(memberListRequest());
  try {
    const requestParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending && { ascending: params.ascending }),
      ...(params.filters && params.filters.length && { filters: params.filters }),
      ...(params.query && Object.keys(params.query).length && { query: params.query }),
    };
    const res = await api.get(`/api/users/team/member/${userId}/direct`, {
      params: requestParams,
      paramsSerializer: teamParamsSerializer,
    });
    if (res.data?.status && res.data?.response) {
      dispatch(memberListSuccess(res.data.response));
    } else {
      dispatch(memberListSuccess({ users: [], pagination: {} }));
    }
  } catch (err) {
    dispatch(memberListError(err?.message));
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch member direct team", "danger"));
  }
};

export const getMemberAllTeam = (userId, params = {}) => async (dispatch) => {
  dispatch(memberListRequest());
  try {
    const requestParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending && { ascending: params.ascending }),
      ...(params.filters && params.filters.length && { filters: params.filters }),
      ...(params.query && Object.keys(params.query).length && { query: params.query }),
    };
    const res = await api.get(`/api/users/team/member/${userId}/all`, {
      params: requestParams,
      paramsSerializer: teamParamsSerializer,
    });
    if (res.data?.status && res.data?.response) {
      dispatch(memberListSuccess(res.data.response));
    } else {
      dispatch(memberListSuccess({ users: [], pagination: {} }));
    }
  } catch (err) {
    dispatch(memberListError(err?.message));
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch member downline", "danger"));
  }
};
