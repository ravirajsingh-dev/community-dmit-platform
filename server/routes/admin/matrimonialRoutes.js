const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const {
  getAllApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} = require("./Controllers/AdminMatrimonialController");

/**
 * GET /api/admin/matrimonial/applications
 * List all matrimonial profiles with filters.
 * @access Private (Admin)
 */
router.get("/applications", AdminAuth, getAllApplications);

/**
 * GET /api/admin/matrimonial/applications/:id
 * Get single profile by ID.
 * @access Private (Admin)
 */
router.get("/applications/:id", AdminAuth, getApplicationById);

/**
 * PUT /api/admin/matrimonial/applications/:id
 * Edit matrimonial profile (data correction).
 * @access Private (Admin)
 */
router.put("/applications/:id", AdminAuth, updateApplication);

/**
 * DELETE /api/admin/matrimonial/applications/:id
 * Hard delete matrimonial profile. Permanent.
 * @access Private (Admin)
 */
router.delete("/applications/:id", AdminAuth, deleteApplication);

module.exports = router;
