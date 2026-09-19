const tokenExpiryTime = "1h";
const refreshTokenExpiryTime = "15m";

const excludedPaths = [
  "/api/auth/users",
  "/api/auth",
  "/api/common/settings",
  "/api/admin/settings",
  "/api/common/slider-banners",
  "/api/common/gallery",
  "/api/common/videos",
  "/api/common/news",
  "/api/common/user",
  "/api/common/donation",
  "/api/common/qr",
  "/api/common/pdfs",
];

module.exports = { tokenExpiryTime, refreshTokenExpiryTime, excludedPaths };
