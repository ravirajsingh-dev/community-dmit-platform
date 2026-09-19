const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");

const {
  resolveUser,
  initUserFamily,
  getUserFamilyFlat,
  getUserFamilyTree,
  createUserFamilyMember,
  updateUserFamilyMember,
  getUserFamilyMemberDeletionPreview,
  deleteUserFamilyMember,
  getEligibleSpouses,
  getEligibleChildren,
  createUserFamilyMarriage,
  updateUserFamilyMarriage,
  addUserFamilyChild,
  patchUserFamilyChildOrder,
} = require("./Controllers/FamilyController");

// @route GET api/admin/family/resolve-user
// @desc Resolve user by memberId or userId (admin utility)
// @access Private (family list)
router.get(
  "/resolve-user",
  [AdminAuth, checkPermission("family", "list")],
  resolveUser,
);

// @route POST api/admin/family/users/:userId/init
// @desc Initialize a user's family root (Root Male / Root Female)
// @access Private (family create)
router.post(
  "/users/:userId/init",
  [AdminAuth, checkPermission("family", "create")],
  initUserFamily,
);

// @route GET api/admin/family/users/:userId/flat
// @desc Get flat members + marriages for user's family
// @access Private (family list)
router.get(
  "/users/:userId/flat",
  [AdminAuth, checkPermission("family", "list")],
  getUserFamilyFlat,
);

// @route GET api/admin/family/users/:userId/tree
// @desc Get hierarchical spouse-aware tree for user's family
// @access Private (family list)
router.get(
  "/users/:userId/tree",
  [AdminAuth, checkPermission("family", "list")],
  getUserFamilyTree,
);

// @route POST api/admin/family/users/:userId/members
// @desc Create a family member
// @access Private (family create)
router.post(
  "/users/:userId/members",
  [AdminAuth, checkPermission("family", "create")],
  createUserFamilyMember,
);

// @route PUT api/admin/family/users/:userId/members/:memberId
// @desc Update a family member (transaction password required)
// @access Private (family edit)
router.put(
  "/users/:userId/members/:memberId",
  [AdminAuth, checkPermission("family", "edit"), verifyTransactionPassword],
  updateUserFamilyMember,
);

// @route GET api/admin/family/users/:userId/members/:memberId/deletion-preview
// @desc Get preview of what will be deleted (for confirmation modal)
// @access Private (family delete)
router.get(
  "/users/:userId/members/:memberId/deletion-preview",
  [AdminAuth, checkPermission("family", "delete")],
  getUserFamilyMemberDeletionPreview,
);

// @route DELETE api/admin/family/users/:userId/members/:memberId
// @desc Delete member with complete subtree deletion (transaction password required)
// @access Private (family delete)
router.delete(
  "/users/:userId/members/:memberId",
  [AdminAuth, checkPermission("family", "delete"), verifyTransactionPassword],
  deleteUserFamilyMember,
);

// @route POST api/admin/family/users/:userId/marriages
// @desc Create a marriage between spouses
// @access Private (family create)
router.post(
  "/users/:userId/marriages",
  [AdminAuth, checkPermission("family", "create")],
  createUserFamilyMarriage,
);

// @route PATCH api/admin/family/users/:userId/marriages/:marriageId
// @desc Update marriage status (divorce / widowed) (transaction password required)
// @access Private (family edit)
router.patch(
  "/users/:userId/marriages/:marriageId",
  [AdminAuth, checkPermission("family", "edit"), verifyTransactionPassword],
  updateUserFamilyMarriage,
);

// @route GET api/admin/family/users/:userId/members/:memberId/eligible-spouses
// @desc Get member ids eligible to marry this member
// @access Private (family list)
router.get(
  "/users/:userId/members/:memberId/eligible-spouses",
  [AdminAuth, checkPermission("family", "list")],
  getEligibleSpouses,
);

// @route GET api/admin/family/users/:userId/marriages/:marriageId/eligible-children
// @desc Get member ids eligible to be added as child to this marriage
// @access Private (family list)
router.get(
  "/users/:userId/marriages/:marriageId/eligible-children",
  [AdminAuth, checkPermission("family", "list")],
  getEligibleChildren,
);

// @route POST api/admin/family/users/:userId/marriages/:marriageId/children
// @desc Add child to a marriage
// @access Private (family create)
router.post(
  "/users/:userId/marriages/:marriageId/children",
  [AdminAuth, checkPermission("family", "create")],
  addUserFamilyChild,
);

// @route PATCH api/admin/family/users/:userId/marriages/:marriageId/children/:childId
// @desc Update child order (manual birth order: 1 = eldest, 2 = second, ...) (transaction password required)
// @access Private (family edit)
router.patch(
  "/users/:userId/marriages/:marriageId/children/:childId",
  [AdminAuth, checkPermission("family", "edit"), verifyTransactionPassword],
  patchUserFamilyChildOrder,
);

module.exports = router;
