import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";

export const fetchUserEPins = (params = {}) => async (dispatch) => {
  try {
    const config = {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        ...(params.status && { status: params.status }),
      },
    };

    const res = await api.get("/api/users/epins", config);

    if (res.data && res.data.status && res.data.response) {
      return {
        epins: res.data.response.epins || [],
        pagination: res.data.response.pagination || {},
        totalCount: res.data.response.totalCount || 0,
        unusedCount: res.data.response.unusedCount || 0,
        usedCount: res.data.response.usedCount || 0,
      };
    }
    throw new Error(res.data?.message || "Failed to fetch E-PINs");
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Failed to fetch E-PINs";
    dispatch(setAlert(msg, "danger"));
    throw err;
  }
};

export const transferEPinsBulk = (toMemberId, count) => async (dispatch) => {
  try {
    const res = await api.post("/api/users/epins/transfer-bulk", {
      toMemberId: toMemberId.trim().toUpperCase(),
      count: parseInt(count, 10),
    });

    if (res.data && res.data.status) {
      const transferredCount = res.data?.response?.transferredCount ?? count;
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
    const msg =
      err.response?.data?.message || err.message || "Bulk transfer failed";
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((e) => {
        dispatch(setErrorsList(e.msg, e.path));
      });
    }
    dispatch(setAlert(msg, "danger"));
    throw err;
  }
};

export const fetchTransferReport = (params = {}) => async (dispatch) => {
  try {
    const config = {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
      },
    };

    const res = await api.get("/api/users/epins/transfer-report", config);

    if (res.data && res.data.status && res.data.response) {
      return {
        transfers: res.data.response.transfers || [],
        pagination: res.data.response.pagination || {},
      };
    }
    throw new Error(res.data?.message || "Failed to fetch transfer report");
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Failed to fetch transfer report";
    dispatch(setAlert(msg, "danger"));
    throw err;
  }
};
