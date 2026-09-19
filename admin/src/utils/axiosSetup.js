import axios from "axios";
import store from "@src/store";
import { logoutAdminAuth, adminAuthTokenRefresh } from "@src/reducers/adminAuth";

// Create a dedicated axios instance for the admin app
const api = axios.create({
  withCredentials: true, // Automatically send cookies with requests
});

// Track ongoing requests to avoid duplicates
const ongoingRequests = new Map();
// Single in-flight refresh to avoid concurrent refresh calls (race: first rotates token, second gets "Invalid token")
let refreshPromise = null;

const getRequestKey = (config) => {
  if (!config) return "";
  const { method, url, params, data } = config;
  return [method, url, JSON.stringify(params), JSON.stringify(data)].join("&");
};

const removeRequest = (requestKey) => {
  if (ongoingRequests.has(requestKey)) {
    ongoingRequests.delete(requestKey);
  }
};

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const requestKey = getRequestKey(config);

    // Prevent duplicate requests unless explicitly allowed
    if (!config.allowDuplicates && ongoingRequests.has(requestKey)) {
      return Promise.reject(new Error("Duplicate request in progress"));
    }

    // Attach a cancel token to each request
    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    ongoingRequests.set(requestKey, source);

    // Ensure credentials are included (cookies will be sent automatically)
    config.withCredentials = true;

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor (mirrors client axiosSetup.js behavior, with admin endpoint)
api.interceptors.response.use(
  (response) => {
    const requestKey = getRequestKey(response.config);
    removeRequest(requestKey);
    return response;
  },
  async (error) => {
    const originalRequest = error?.config;
    const { dispatch } = store;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestKey = getRequestKey(originalRequest);
    removeRequest(requestKey);

    // Token expired - attempt refresh (single in-flight to avoid concurrent refreshes)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const endpoint = `/api/auth/admin/refresh-token`;
        if (!refreshPromise) {
          refreshPromise = api
            .post(endpoint, {}, { withCredentials: true })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const response = await refreshPromise;

        // Backend returns { status: true, response: {} } on success
        if (response.data?.status === true) {
          // Preserve current admin in state (backend doesn't return admin in refresh response)
          const currentAdmin = store.getState().adminAuth?.admin;
          dispatch(adminAuthTokenRefresh({ admin: currentAdmin }));

          const retrySource = axios.CancelToken.source();
          originalRequest.cancelToken = retrySource.token;
          ongoingRequests.set(getRequestKey(originalRequest), retrySource);

          return api(originalRequest);
        }

        dispatch(logoutAdminAuth());
        return Promise.reject(new Error("Token refresh failed"));
      } catch (refreshError) {
        dispatch(logoutAdminAuth());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
