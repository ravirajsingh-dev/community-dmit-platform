const express = require("express");
const router = express.Router();

// ============================================
// ADMIN ROUTES
// ============================================
router.use("/api/auth/admin", require("./admin/auth/authAdmin"));
router.use("/api/admin/users", require("./admin/adminUsers"));
router.use("/api/admin/family", require("./admin/familyRoutes"));
router.use("/api/admin", require("./admin/adminSettingsRoutes"));
router.use("/api/admin/slider", require("./admin/slider"));
router.use("/api/admin/gallery", require("./admin/gallery"));
router.use("/api/admin/video", require("./admin/video"));
router.use("/api/admin/training-videos", require("./admin/trainingVideo"));
router.use("/api/admin/news", require("./admin/news"));
router.use("/api/admin/pdfs", require("./admin/pdfs"));
router.use("/api/admin/donation", require("./admin/donationRoutes"));
router.use("/api/admin/sub-admins", require("./admin/subAdminRoutes"));
router.use("/api/admin/communities", require("./admin/communityRoutes"));
router.use("/api/admin/countries", require("./admin/countryRoutes"));
router.use("/api/admin/states", require("./admin/stateRoutes"));
router.use("/api/admin/districts", require("./admin/districtRoutes"));
router.use("/api/admin/villages", require("./admin/villageRoutes"));
router.use(
  "/api/admin/location-management",
  require("./admin/locationManagementRoutes"),
);
router.use("/api/admin/vansh", require("./admin/vanshRoutes"));
router.use("/api/admin/kul", require("./admin/kulRoutes"));
router.use("/api/admin/khamp", require("./admin/khampRoutes"));
router.use("/api/admin/gotra", require("./admin/gotraRoutes"));
router.use("/api/admin/matrimonial", require("./admin/matrimonialRoutes"));
router.use("/api/admin/wallet-settings", require("./admin/walletSettingsRoutes"));
router.use("/api/admin/wallet-management", require("./admin/walletManagementRoutes"));
router.use("/api/admin/referrals", require("./admin/referralRoutes"));
router.use("/api/admin/team", require("./admin/teamRoutes"));
router.use("/api/admin/epins", require("./admin/epinRoutes"));
router.use("/api/admin/level-commission", require("./admin/levelCommissionRoutes"));
router.use("/api/admin/designations", require("./admin/designationRoutes"));
router.use("/api/admin/ranks", require("./admin/rankRoutes"));
router.use("/api/admin/commission-payout", require("./admin/commissionPayoutRoutes"));
router.use("/api/admin/appointments", require("./admin/appointmentRoutes"));
router.use("/api/admin/slots", require("./admin/slotRoutes"));
router.use("/api/admin/sbi-pro-sessions", require("./admin/sbiProSessionRoutes"));
router.use("/api/admin/counselling-sessions", require("./admin/counsellingSessionRoutes"));

// ============================================
// SUB-ADMIN ROUTES
// ============================================
// (No sub-admin routes currently)

// ============================================
// USER ROUTES
// ============================================
// CRITICAL: More specific paths MUST be mounted before /api/users
// Otherwise /api/users/sbi-pro-sessions/* is swallowed by users router and 404s
router.use("/api/auth/users", require("./user/auth/register"));
router.use("/api/auth", require("./user/auth/authUser"));
router.use("/api/users/sbi-pro-sessions", require("./user/sbiProSessionRoutes"));
router.use("/api/users/counselling-sessions", require("./user/counsellingSessionRoutes"));
router.use("/api/users/family", require("./user/familyRoutes"));
router.use("/api/users/master-data", require("./user/masterDataRoutes"));
router.use("/api/users/location", require("./user/locationRoutes"));
router.use("/api/users/matrimonial", require("./user/matrimonialRoutes"));
router.use("/api/users/epins", require("./user/epinRoutes"));
router.use("/api/users/wallet", require("./user/walletRoutes"));
router.use("/api/users/team", require("./user/teamRoutes"));
router.use("/api/users/designations", require("./user/designationRoutes"));
router.use("/api/users/rank", require("./user/rankRoutes"));
router.use("/api/users/club", require("./user/clubRoutes"));
router.use("/api/users/appointments", require("./user/appointmentRoutes"));
router.use("/api/users", require("./user/users"));
router.use("/api/users", require("./user/userDetails"));

// ============================================
// COMMON ROUTES
// ============================================
router.use("/api/common", require("./common/commonRoutes"));

module.exports = router;
