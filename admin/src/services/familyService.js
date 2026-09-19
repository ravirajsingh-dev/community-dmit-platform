import api from "@src/utils/axiosSetup";

export const adminFamilyService = {
  resolveUser: async (params) => {
    const res = await api.get("/api/admin/family/resolve-user", { params });
    return res.data;
  },
  initUserFamily: async (userId, payload) => {
    const res = await api.post(`/api/admin/family/users/${userId}/init`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  getUserFamilyFlat: async (userId) => {
    const res = await api.get(`/api/admin/family/users/${userId}/flat`);
    return res.data;
  },
  getUserFamilyTree: async (userId) => {
    const res = await api.get(`/api/admin/family/users/${userId}/tree`);
    return res.data;
  },
  createMember: async (userId, payload) => {
    const res = await api.post(`/api/admin/family/users/${userId}/members`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  updateMember: async (userId, memberId, payload) => {
    const res = await api.put(
      `/api/admin/family/users/${userId}/members/${memberId}`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },
  createMarriage: async (userId, payload) => {
    const res = await api.post(`/api/admin/family/users/${userId}/marriages`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  addChildToMarriage: async (userId, marriageId, payload) => {
    const res = await api.post(
      `/api/admin/family/users/${userId}/marriages/${marriageId}/children`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },
  updateChildOrder: async (userId, marriageId, childId, payload) => {
    const res = await api.patch(
      `/api/admin/family/users/${userId}/marriages/${marriageId}/children/${childId}`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },
  getDeletionPreview: async (userId, memberId) => {
    const res = await api.get(
      `/api/admin/family/users/${userId}/members/${memberId}/deletion-preview`
    );
    return res.data;
  },
  deleteMember: async (userId, memberId, options = {}) => {
    const { mode } = options;
    const url =
      mode === "strict"
        ? `/api/admin/family/users/${userId}/members/${memberId}?mode=strict`
        : `/api/admin/family/users/${userId}/members/${memberId}`;
    const res = await api.delete(url, {
      data: options.txn_password ? { txn_password: options.txn_password } : {},
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  updateMarriage: async (userId, marriageId, payload) => {
    const res = await api.patch(
      `/api/admin/family/users/${userId}/marriages/${marriageId}`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },
  getEligibleSpouses: async (userId, memberId) => {
    const res = await api.get(
      `/api/admin/family/users/${userId}/members/${memberId}/eligible-spouses`
    );
    return res.data;
  },
  getEligibleChildren: async (userId, marriageId) => {
    const res = await api.get(
      `/api/admin/family/users/${userId}/marriages/${marriageId}/eligible-children`
    );
    return res.data;
  },
};

