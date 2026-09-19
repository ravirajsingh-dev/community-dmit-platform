import axios from "axios";

export const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common["x-auth-token"] = token;
  } else {
    delete axios.defaults.headers.common["x-auth-token"];
  }
};

export const setAuthRefreshToken = (token) => {
  if (token) {
    axios.defaults.headers.common["x-auth-refresh-token"] = token;
  } else {
    delete axios.defaults.headers.common["x-auth-refresh-token"];
  }
};

export const setSessionID = (sessionID) => {
  if (sessionID) {
    axios.defaults.headers.common["x-session-id"] = sessionID;
  } else {
    delete axios.defaults.headers.common["x-session-id"];
  }
};
