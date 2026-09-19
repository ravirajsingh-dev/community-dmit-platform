import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { adminLogout } from "./adminAuth";

export const approveAllPendingLocationsNoTxn = () => async (dispatch) => {
  try {
    const res = await api.put(
      "/api/admin/location-management/approve-all-pending",
      {},
    );

    if (res.data?.status === true) {
      dispatch(
        setAlert("All pending locations approved successfully", "success"),
      );
      return res.data.response;
    }

    dispatch(
      setAlert(res.data?.message || "Failed to approve pending locations", "danger"),
    );
    return null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    }
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to approve pending locations",
        "danger",
      ),
    );
    return null;
  }
};

