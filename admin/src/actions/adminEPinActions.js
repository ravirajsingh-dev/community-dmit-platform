import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { adminLogout } from "./adminAuth";

export const fetchAdminEPins = (params) => async (dispatch) => {
  try {
    const config = {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        orderBy: params.orderBy || "createdAt",
        ascending: params.ascending || "desc",
        ...(params.status && { status: params.status }),
        ...(params.memberId && { memberId: params.memberId }),
        ...(params.search && { search: params.search }),
      },
    };

    dispatch({ type: "FETCH_ADMIN_EPINS_LOADING" });

    const res = await api.get("/api/admin/epins", config);

    if (res.data?.status && res.data?.response) {
      dispatch({
        type: "FETCH_ADMIN_EPINS_SUCCESS",
        payload: {
          epins: res.data.response.epins || [],
          pagination: res.data.response.pagination || {},
          totalCount: res.data.response.totalCount || 0,
          unusedCount: res.data.response.unusedCount || 0,
          usedCount: res.data.response.usedCount || 0,
        },
      });
    } else {
      dispatch({
        type: "FETCH_ADMIN_EPINS_ERROR",
        payload: res.data?.message || "Failed to fetch E-PINs",
      });
      dispatch(setAlert(res.data?.message || "Failed to fetch E-PINs", "danger"));
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const msg = err.response?.data?.message || err.message || "Failed to fetch E-PINs";
      dispatch({ type: "FETCH_ADMIN_EPINS_ERROR", payload: msg });
      dispatch(setAlert(msg, "danger"));
    }
  }
};

export const fetchAdminEPinTransferDetails = (transferId) => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/epins/transfers/${transferId}`);
    if (res.data?.status && res.data?.response) {
      return res.data.response;
    }
    throw new Error(res.data?.message || "Failed to fetch transfer details");
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to fetch transfer details",
          "danger"
        )
      );
    }
    throw err;
  }
};

export const fetchAdminEPinTransfers = (params) => async (dispatch) => {
  try {
    const config = {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        ...(params.fromUser && { fromUser: params.fromUser }),
        ...(params.toUser && { toUser: params.toUser }),
        ...(params.memberId && { memberId: params.memberId }),
        ...(params.activityType && { activityType: params.activityType }),
        ...(params.fromDate && { fromDate: params.fromDate }),
        ...(params.toDate && { toDate: params.toDate }),
      },
    };

    dispatch({ type: "FETCH_ADMIN_EPIN_TRANSFERS_LOADING" });

    const res = await api.get("/api/admin/epins/transfers", config);

    if (res.data?.status && res.data?.response) {
      dispatch({
        type: "FETCH_ADMIN_EPIN_TRANSFERS_SUCCESS",
        payload: {
          transfers: res.data.response.transfers || [],
          pagination: res.data.response.pagination || {},
        },
      });
    } else {
      dispatch({ type: "FETCH_ADMIN_EPIN_TRANSFERS_ERROR" });
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch({ type: "FETCH_ADMIN_EPIN_TRANSFERS_ERROR" });
      dispatch(setAlert(err.response?.data?.message || "Failed to fetch transfers", "danger"));
    }
  }
};

export const createAdminEPins = (memberId, count) => async (dispatch) => {
  try {
    const res = await api.post("/api/admin/epins/create", { memberId, count });

    if (res.data?.status) {
      dispatch({ type: "ADMIN_EPIN_CREATE_SUCCESS" });
      dispatch(setAlert(res.data.message || "E-PINs created successfully", "success"));
      return res.data;
    }
    throw new Error(res.data?.message || "Failed to create E-PINs");
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const msg = err.response?.data?.message || err.message || "Failed to create E-PINs";
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
      }
      dispatch(setAlert(msg, "danger"));
    }
    throw err;
  }
};

export const transferAdminEPinsBulk = (fromMemberId, toMemberId, count) => async (dispatch) => {
  try {
    const res = await api.post("/api/admin/epins/transfer-bulk", {
      fromMemberId: String(fromMemberId).trim().toUpperCase(),
      toMemberId: String(toMemberId).trim().toUpperCase(),
      count: parseInt(count, 10),
    });

    if (res.data?.status) {
      const transferredCount = res.data?.response?.transferredCount ?? count;
      dispatch({ type: "ADMIN_EPIN_TRANSFER_BULK_SUCCESS" });
      dispatch(
        setAlert(
          res.data.message || `Successfully transferred ${transferredCount} E-PIN(s)`,
          "success"
        )
      );
      return {
        transferredCount,
        epinIds: res.data?.response?.epinIds || [],
      };
    }
    throw new Error(res.data?.message || "Bulk transfer failed");
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const msg =
        err.response?.data?.message || err.message || "Bulk transfer failed";
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
      }
      dispatch(setAlert(msg, "danger"));
    }
    throw err;
  }
};

export const deleteAdminEPinsBulk = (memberId, count) => async (dispatch) => {
  try {
    const res = await api.post("/api/admin/epins/delete-bulk", {
      memberId: String(memberId).trim(),
      count: parseInt(count, 10),
    });

    if (res.data?.status) {
      dispatch({ type: "ADMIN_EPIN_DELETE_BULK_SUCCESS" });
      dispatch(
        setAlert(
          res.data.message ||
            `Successfully deleted ${res.data?.response?.deletedCount || count} unused E-PIN(s)`,
          "success"
        )
      );
      return {
        deletedCount: res.data?.response?.deletedCount || count,
        remainingUnused: res.data?.response?.remainingUnused,
      };
    }
    throw new Error(res.data?.message || "Failed to delete E-PINs");
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const msg =
        err.response?.data?.message || err.message || "Failed to delete E-PINs";
      dispatch(setAlert(msg, "danger"));
    }
    throw err;
  }
};

export const deleteAdminEPin = (epinId, txnPassword) => async (dispatch) => {
  try {
    const normalizedId = epinId.trim().toUpperCase();
    const config = {
      data: { txn_password: txnPassword },
    };
    const res = await api.delete(
      `/api/admin/epins/${encodeURIComponent(normalizedId)}`,
      config
    );

    if (res.data?.status) {
      dispatch({ type: "ADMIN_EPIN_DELETE_SUCCESS" });
      dispatch(setAlert(res.data.message || "E-PIN deleted successfully", "success"));
      return res.data;
    }
    throw new Error(res.data?.message || "Failed to delete E-PIN");
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const msg = err.response?.data?.message || err.message || "Failed to delete E-PIN";
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
      }
      dispatch(setAlert(msg, "danger"));
    }
    throw err;
  }
};
