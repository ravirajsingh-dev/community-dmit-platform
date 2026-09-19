import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

export const ADMIN_DESIGNATION_APPLICATIONS_REQUEST =
  "ADMIN_DESIGNATION_APPLICATIONS_REQUEST";
export const ADMIN_DESIGNATION_APPLICATIONS_SUCCESS =
  "ADMIN_DESIGNATION_APPLICATIONS_SUCCESS";
export const ADMIN_DESIGNATION_APPLICATIONS_ERROR =
  "ADMIN_DESIGNATION_APPLICATIONS_ERROR";
export const ADMIN_DESIGNATION_DECISION_REQUEST =
  "ADMIN_DESIGNATION_DECISION_REQUEST";
export const ADMIN_DESIGNATION_DECISION_SUCCESS =
  "ADMIN_DESIGNATION_DECISION_SUCCESS";
export const ADMIN_DESIGNATION_DECISION_ERROR =
  "ADMIN_DESIGNATION_DECISION_ERROR";

/** GET /api/admin/designations?status=&designationCode=&page=&limit= */
export const getDesignationApplications =
  (status, params = {}) =>
  async (dispatch) => {
    const normalizedStatus = (status || "").toString().toUpperCase();
    const effectiveStatus = normalizedStatus || "ALL";

    const buildRequestId = (queryObj) => {
      try {
        return `rid:${normalizedStatus || "ALL"}|${JSON.stringify(queryObj)}`;
      } catch {
        return `rid:${normalizedStatus || "ALL"}|${String(Date.now())}`;
      }
    };

    try {
      const query = {
        status: effectiveStatus,
        page: params.page || 1,
        limit: Math.min(params.limit || 20, 100),
        // Always include summary in the same call to keep Redux/UI in sync.
        includeSummary: 1,
        ...(params.designationCode !== "" &&
          params.designationCode != null && {
            designationCode: Number(params.designationCode),
          }),
        ...(params.online != null && { online: params.online }),
        ...(params.memberId && { memberId: params.memberId }),
        ...(params.name && { name: params.name }),
        ...(params.phone && { phone: params.phone }),
        ...(params.email && { email: params.email }),
      ...(params.countryId && { countryId: params.countryId }),
      ...(params.stateId && { stateId: params.stateId }),
      ...(params.districtId && { districtId: params.districtId }),
      ...(params.villageId && { villageId: params.villageId }),
        ...(params.hasRemarks === true && { hasRemarks: true }),
        ...(params.hasReviews === true && { hasReviews: true }),
        ...(params.minAvgRating !== "" &&
          params.minAvgRating != null && {
            minAvgRating: Number(params.minAvgRating),
          }),
        ...(params.minTotalRatings !== "" &&
          params.minTotalRatings != null && {
            minTotalRatings: Number(params.minTotalRatings),
          }),
        ...(params.appliedFrom && { appliedFrom: params.appliedFrom }),
        ...(params.appliedTo && { appliedTo: params.appliedTo }),
        ...(params.decidedFrom && { decidedFrom: params.decidedFrom }),
        ...(params.decidedTo && { decidedTo: params.decidedTo }),
      };

      const requestId = buildRequestId(query);
      dispatch({ type: ADMIN_DESIGNATION_APPLICATIONS_REQUEST, payload: { requestId } });

      const res = await api.get("/api/admin/designations", {
        params: query,
      });
      if (res.data?.status && res.data?.response) {
        dispatch({
          type: ADMIN_DESIGNATION_APPLICATIONS_SUCCESS,
          payload: {
            applications: res.data.response.applications || [],
            pagination: res.data.response.pagination || {},
            summary: res.data.response.summary || null,
            status: effectiveStatus || "ALL",
            requestId,
          },
        });
      } else {
        dispatch({
          type: ADMIN_DESIGNATION_APPLICATIONS_SUCCESS,
          payload: {
            applications: [],
            pagination: {},
            summary: null,
            status: effectiveStatus || "ALL",
            requestId,
          },
        });
      }
    } catch (err) {
      dispatch({ type: ADMIN_DESIGNATION_APPLICATIONS_ERROR });
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to fetch applications",
          "danger"
        )
      );
    }
  };

export const getDesignationRatingReviews =
  (userId, designationCode, params = {}) =>
  async (dispatch) => {
    try {
      const res = await api.get("/api/admin/designations/reviews", {
        params: {
          userId,
          designationCode,
          page: params.page || 1,
          limit: Math.min(params.limit || 10, 100),
        },
      });

      if (res.data?.status && res.data?.response) {
        return { success: true, data: res.data.response };
      }

      return {
        success: false,
        data: { reviews: [], pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 } },
      };
    } catch (err) {
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to fetch ratings and reviews",
          "danger"
        )
      );
      return {
        success: false,
        data: { reviews: [], pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 } },
      };
    }
  };

export const processDesignationDecision =
  (userId, designationCode, designationEntryId, decision, remarks, onSuccess) =>
  async (dispatch) => {
    dispatch({ type: ADMIN_DESIGNATION_DECISION_REQUEST });
    try {
      const res = await api.post("/api/admin/designations/decision", {
        userId,
        designationCode,
        designationEntryId,
        decision: decision === "APPROVED" || decision === "approve" ? "approve" : "reject",
        remarks,
      });
      if (res.data?.status) {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_SUCCESS });
        dispatch(setAlert(res.data.message || "Decision processed", "success"));
        if (onSuccess) onSuccess();
      } else {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
        dispatch(
          setAlert(
            res.data?.message || "Failed to process decision",
            "danger"
          )
        );
      }
    } catch (err) {
      dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to process decision",
          "danger"
        )
      );
    }
  };

export const setDesignationInactive =
  (userId, designationCode, designationEntryId, remarks, onSuccess) =>
  async (dispatch) => {
    dispatch({ type: ADMIN_DESIGNATION_DECISION_REQUEST });
    try {
      const res = await api.post("/api/admin/designations/inactive", {
        userId,
        designationCode,
        designationEntryId,
        remarks,
      });
      if (res.data?.status) {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_SUCCESS });
        dispatch(setAlert(res.data.message || "Designation set inactive", "success"));
        if (onSuccess) onSuccess();
      } else {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
        dispatch(
          setAlert(
            res.data?.message || "Failed to set inactive",
            "danger"
          )
        );
      }
    } catch (err) {
      dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to set inactive",
          "danger"
        )
      );
    }
  };

export const setDesignationAvailability =
  (userId, designationCode, designationEntryId, online, onSuccess) =>
  async (dispatch) => {
    dispatch({ type: ADMIN_DESIGNATION_DECISION_REQUEST });
    try {
      const res = await api.post("/api/admin/designations/availability", {
        userId,
        designationCode,
        designationEntryId,
        online,
      });
      if (res.data?.status) {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_SUCCESS });
        dispatch(
          setAlert(res.data.message || "Availability updated", "success"),
        );
        if (onSuccess) onSuccess();
      } else {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
        dispatch(
          setAlert(
            res.data?.message || "Failed to update availability",
            "danger"
          )
        );
      }
    } catch (err) {
      dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
      dispatch(
        setAlert(
          err.response?.data?.message ||
            "Failed to update availability",
          "danger"
        )
      );
    }
  };

export const setDesignationDeleted =
  (userId, designationCode, designationEntryId, remarks, onSuccess) =>
  async (dispatch) => {
    dispatch({ type: ADMIN_DESIGNATION_DECISION_REQUEST });
    try {
      const res = await api.post("/api/admin/designations/delete", {
        userId,
        designationCode,
        designationEntryId,
        remarks,
      });
      if (res.data?.status) {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_SUCCESS });
        dispatch(setAlert(res.data.message || "Designation deleted", "success"));
        if (onSuccess) onSuccess();
      } else {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
        dispatch(
          setAlert(
            res.data?.message || "Failed to delete designation",
            "danger"
          )
        );
      }
    } catch (err) {
      dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to delete designation",
          "danger"
        )
      );
    }
  };

/** Transition status (e.g. REJECTED->APPROVED, INACTIVE->APPROVED) */
export const transitionDesignationStatus =
  (userId, designationCode, designationEntryId, toStatus, remarks, onSuccess) =>
  async (dispatch) => {
    dispatch({ type: ADMIN_DESIGNATION_DECISION_REQUEST });
    try {
      const res = await api.post("/api/admin/designations/transition", {
        userId,
        designationCode,
        designationEntryId,
        toStatus,
        remarks,
      });
      if (res.data?.status) {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_SUCCESS });
        dispatch(setAlert(res.data.message || "Status updated", "success"));
        if (onSuccess) onSuccess();
      } else {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
        dispatch(
          setAlert(
            res.data?.message || "Failed to update status",
            "danger"
          )
        );
      }
    } catch (err) {
      dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to update status",
          "danger"
        )
      );
    }
  };

/**
 * Direct admin assignment:
 *  - Admin selects a user by `memberId`
 *  - Verifies `txn_password`
 *  - Applies (creates/updates PENDING) then approves (APPROVED) atomically in services
 *
 * POST /api/admin/designations/assign-direct
 * Body: { memberId, designationCode, txn_password }
 */
export const assignDesignationDirectly =
  (memberId, designationCode, txnPassword, onSuccess) =>
  async (dispatch) => {
    dispatch({ type: ADMIN_DESIGNATION_DECISION_REQUEST });
    try {
      const res = await api.post("/api/admin/designations/assign-direct", {
        memberId,
        designationCode,
        txn_password: txnPassword,
      });

      if (res.data?.status) {
        dispatch({ type: ADMIN_DESIGNATION_DECISION_SUCCESS });
        dispatch(setAlert(res.data.message || "Designation assigned", "success"));
        if (onSuccess) onSuccess();
        return { success: true };
      }

      dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to assign designation", "danger"),
      );
      return { success: false, message: res.data?.message };
    } catch (err) {
      dispatch({ type: ADMIN_DESIGNATION_DECISION_ERROR });
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to assign designation",
          "danger",
        ),
      );
      return { success: false, message: err.response?.data?.message };
    }
  };
