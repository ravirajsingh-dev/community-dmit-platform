const express = require("express");
const router = express.Router();
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  apply,
  getMyProfile,
  updateMyProfile,
  activateMyProfile,
  deactivateMyProfile,
  deleteMyProfile,
  getList,
  getProfile,
} = require("./Controllers/MatrimonialController");

/**
 * POST /api/users/matrimonial/apply
 * Apply for Matrimonial (creates pending profile).
 * @access Private (User)
 */
router.post("/apply", UserAuth, checkSessionExpiry, apply);

/**
 * GET /api/users/matrimonial/me
 * Get current user's matrimonial profile.
 * @access Private (User)
 */
router.get("/me", UserAuth, checkSessionExpiry, getMyProfile);

/**
 * PUT /api/users/matrimonial/me
 * Update own matrimonial profile.
 * @access Private (User)
 */
router.put("/me", UserAuth, checkSessionExpiry, updateMyProfile);

/**
 * PUT /api/users/matrimonial/me/activate
 * Activate own profile (visible in listings).
 * @access Private (User)
 */
router.put("/me/activate", UserAuth, checkSessionExpiry, activateMyProfile);

/**
 * PUT /api/users/matrimonial/me/deactivate
 * Deactivate own profile (hidden from matches).
 * @access Private (User)
 */
router.put("/me/deactivate", UserAuth, checkSessionExpiry, deactivateMyProfile);

/**
 * DELETE /api/users/matrimonial/me
 * Hard delete own matrimonial profile. Permanent.
 * @access Private (User)
 */
router.delete("/me", UserAuth, checkSessionExpiry, deleteMyProfile);

/**
 * GET /api/users/matrimonial/list
 * List matrimonial profiles (default: my community, fallback all). Full filters. Works without applying.
 * @access Private (User)
 */
router.get("/list", UserAuth, checkSessionExpiry, getList);

/**
 * GET /api/users/matrimonial/matches
 * Alias for list (same community default, fallback all).
 * @access Private (User)
 */
router.get("/matches", UserAuth, checkSessionExpiry, getList);

/**
 * GET /api/users/matrimonial/profile/:id
 * Full profile view. Records who viewed.
 * @access Private (User)
 */
router.get("/profile/:id", UserAuth, checkSessionExpiry, getProfile);

module.exports = router;
