import api from "@src/utils/axiosSetup";

export const familyService = {
  initFamily: async (payload) => {
    const res = await api.post("/api/users/family/init", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  getFamilyFlat: async (params = {}) => {
    const { page, limit } = params;
    const query = new URLSearchParams();
    if (page != null) query.set("page", String(page));
    if (limit != null) query.set("limit", String(limit));
    const qs = query.toString();
    const url = qs ? `/api/users/family/flat?${qs}` : "/api/users/family/flat";
    const res = await api.get(url);
    return res.data;
  },
  getFamilyTree: async () => {
    const res = await api.get("/api/users/family/tree");
    return res.data;
  },
  createMember: async (payload) => {
    const res = await api.post("/api/users/family/members", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  updateMember: async (memberId, payload) => {
    const res = await api.put(`/api/users/family/members/${memberId}`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  createMarriage: async (payload) => {
    const res = await api.post("/api/users/family/marriages", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  updateMarriage: async (marriageId, payload) => {
    const res = await api.patch(`/api/users/family/marriages/${marriageId}`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  addChildToMarriage: async (marriageId, payload) => {
    const res = await api.post(`/api/users/family/marriages/${marriageId}/children`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
  updateChildOrder: async (marriageId, childId, payload) => {
    const res = await api.patch(
      `/api/users/family/marriages/${marriageId}/children/${childId}`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },
  getMemberDeletionPreview: async (memberId) => {
    const res = await api.get(`/api/users/family/members/${memberId}/deletion-preview`);
    return res.data;
  },
  getEligibleSpouses: async (memberId) => {
    const res = await api.get(`/api/users/family/members/${memberId}/eligible-spouses`);
    return res.data;
  },
  getEligibleChildren: async (marriageId) => {
    const res = await api.get(`/api/users/family/marriages/${marriageId}/eligible-children`);
    return res.data;
  },
  deleteMember: async (memberId, options = {}) => {
    const { mode } = options;
    const url =
      mode === "strict"
        ? `/api/users/family/members/${memberId}?mode=strict`
        : `/api/users/family/members/${memberId}`;
    const res = await api.delete(url);
    return res.data;
  },
};

