import api from "@src/utils/axiosSetup";
import {
  membersListUpdated,
  membersListError,
  loadingMembersList,
  memberDetailsUpdated,
  memberDetailsError,
  loadingMemberDetails,
  resetMemberDetails as resetMemberDetailsAction,
} from "@src/reducers/searchMemberReducer";
import { setAlert } from "./alert";

/**
 * Get members list with search and filters
 * @param {Object} params - Search parameters (limit, page, orderBy, ascending, filters, query)
 */
export const getMembersList = (params) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach((key) => {
            if (params[key] !== null && params[key] !== undefined) {
              if (key === "query" && typeof params[key] === "object") {
                // Stringify nested query object
                searchParams.append(key, JSON.stringify(params[key]));
              } else if (key === "filters" && Array.isArray(params[key])) {
                // Join array filters with comma
                searchParams.append(key, params[key].join(","));
              } else {
                searchParams.append(key, params[key]);
              }
            }
          });
          return searchParams.toString();
        },
      },
    };

    const query = params.query ? params.query : {};
    const searchParams = { ...params, query };
    config.params = searchParams;

    dispatch(loadingMembersList());

    const res = await api.get(`/api/users/search-members`, config);

    if (res.data && res.data.status && res.data.response) {
      const responseData = res.data.response[0] || {};
      const data = responseData.data || [];
      const metadata = responseData.metadata?.[0] || {};
      const count = metadata.totalRecord || 0;

      dispatch(
        membersListUpdated({
          data,
          count,
        })
      );
    } else {
      dispatch(membersListUpdated({ data: [], count: 0 }));
    }
  } catch (err) {
    console.error("Error fetching members list:", err);
    const errorMessage =
      err.response?.data?.message || "Failed to fetch members list";
    dispatch(membersListError(errorMessage));
    dispatch(setAlert(errorMessage, "danger"));
  }
};

/**
 * Get member details by ID
 * @param {string} userId - User ID
 */
export const getMemberDetailsById = (userId) => async (dispatch) => {
  try {
    dispatch(loadingMemberDetails());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.get(`/api/users/member-details/${userId}`, config);

    if (res.data && res.data.status && res.data.response) {
      dispatch(memberDetailsUpdated(res.data.response));
      return res.data.response;
    } else {
      dispatch(memberDetailsError("Failed to fetch member details"));
      dispatch(setAlert("Failed to fetch member details", "danger"));
      return null;
    }
  } catch (err) {
    console.error("Error fetching member details:", err);
    const errorMessage =
      err.response?.data?.message || "Failed to fetch member details";
    dispatch(memberDetailsError(errorMessage));
    dispatch(setAlert(errorMessage, "danger"));
    return null;
  }
};

/**
 * Reset member details state
 */
export const resetMemberDetails = () => (dispatch) => {
  dispatch(resetMemberDetailsAction());
};
