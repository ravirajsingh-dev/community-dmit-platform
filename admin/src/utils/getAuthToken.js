export const getToken = () => {
  return localStorage.getItem("token") || null;
};

export const getRefreshToken = () => {
  return localStorage.getItem("refreshToken") || null;
};
