import api from "@src/utils/axiosSetup";

export const resolveUserByMemberId = async (memberId) => {
  const res = await api.get("/api/admin/team/resolve", {
    params: { memberId: String(memberId).trim().toUpperCase() },
  });
  if (res.data?.status && res.data?.response) {
    return res.data.response;
  }
  throw new Error(res.data?.message || "Failed to resolve user");
};

export const getAdminDirectTeam = async (userId, params = {}) => {
  const res = await api.get(`/api/admin/team/${userId}/direct`, {
    params: {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending && { ascending: params.ascending }),
    },
  });
  if (res.data?.status && res.data?.response) return res.data.response;
  throw new Error(res.data?.message || "Failed to fetch direct team");
};

export const getAdminAllTeam = async (userId, params = {}) => {
  const res = await api.get(`/api/admin/team/${userId}/all`, {
    params: {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending && { ascending: params.ascending }),
    },
  });
  if (res.data?.status && res.data?.response) return res.data.response;
  throw new Error(res.data?.message || "Failed to fetch team");
};

export const getAdminTeamByLevel = async (userId, level, params = {}) => {
  const res = await api.get(`/api/admin/team/${userId}/level/${level}`, {
    params: {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending && { ascending: params.ascending }),
    },
  });
  if (res.data?.status && res.data?.response) return res.data.response;
  throw new Error(res.data?.message || "Failed to fetch level team");
};

export const getAdminStructureChildren = async (userId, nodeId) => {
  if (!nodeId) return [];
  const res = await api.get(`/api/admin/team/${userId}/structure/${nodeId}`);
  if (res.data?.status && res.data?.response?.children) {
    return res.data.response.children;
  }
  return [];
};
