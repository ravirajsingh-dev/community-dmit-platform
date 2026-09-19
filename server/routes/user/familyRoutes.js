const express = require("express");
const router = express.Router();
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  initFamily,
  getFamily,
  getFamilyFlat,
  getFamilyTree,
  createFamilyMember,
  updateFamilyMember,
  getMemberDeletionPreview,
  getEligibleSpouses,
  getEligibleChildren,
  deleteFamilyMember,
  createFamilyMarriage,
  updateFamilyMarriage,
  addChild,
  patchChildOrder,
} = require("./Controllers/FamilyController");

// @route POST api/users/family/init
// @desc Initialize family root (Root Male / Root Female)
// @access Private
router.post("/init", [UserAuth, checkSessionExpiry], initFamily);

// @route GET api/users/family
// @desc Get family container (ensures exists)
// @access Private
router.get("/", [UserAuth, checkSessionExpiry], getFamily);

// @route GET api/users/family/flat
// @desc Get flat members + marriages
// @access Private
router.get("/flat", [UserAuth, checkSessionExpiry], getFamilyFlat);

// @route GET api/users/family/tree
// @desc Get hierarchical spouse-aware tree
// @access Private
router.get("/tree", [UserAuth, checkSessionExpiry], getFamilyTree);

// @route POST api/users/family/members
// @desc Create a family member
// @access Private
router.post("/members", [UserAuth, checkSessionExpiry], createFamilyMember);

// @route PUT api/users/family/members/:memberId
// @desc Update a family member
// @access Private
router.put(
  "/members/:memberId",
  [UserAuth, checkSessionExpiry],
  updateFamilyMember,
);

// @route GET api/users/family/members/:memberId/deletion-preview
// @desc Get preview of what will be deleted (for confirmation modal)
// @access Private
router.get(
  "/members/:memberId/deletion-preview",
  [UserAuth, checkSessionExpiry],
  getMemberDeletionPreview,
);

// @route GET api/users/family/members/:memberId/eligible-spouses
// @desc Get member ids eligible to marry this member (opposite gender, no prohibited relationship)
// @access Private
router.get(
  "/members/:memberId/eligible-spouses",
  [UserAuth, checkSessionExpiry],
  getEligibleSpouses,
);

// @route DELETE api/users/family/members/:memberId
// @desc Delete member with complete subtree deletion (all descendants, marriages, spouses)
// @access Private
router.delete(
  "/members/:memberId",
  [UserAuth, checkSessionExpiry],
  deleteFamilyMember,
);

// @route POST api/users/family/marriages
// @desc Create a marriage between spouses
// @access Private
router.post("/marriages", [UserAuth, checkSessionExpiry], createFamilyMarriage);

// @route PATCH api/users/family/marriages/:marriageId
// @desc Update marriage status (e.g. divorced, widowed)
// @access Private
router.patch(
  "/marriages/:marriageId",
  [UserAuth, checkSessionExpiry],
  updateFamilyMarriage,
);

// @route GET api/users/family/marriages/:marriageId/eligible-children
// @desc Get member ids eligible to be added as child to this marriage
// @access Private
router.get(
  "/marriages/:marriageId/eligible-children",
  [UserAuth, checkSessionExpiry],
  getEligibleChildren,
);

// @route POST api/users/family/marriages/:marriageId/children
// @desc Add child to a marriage (child mapped to correct spouse)
// @access Private
router.post(
  "/marriages/:marriageId/children",
  [UserAuth, checkSessionExpiry],
  addChild,
);

// @route PATCH api/users/family/marriages/:marriageId/children/:childId
// @desc Update child order (manual birth order: 1 = eldest, 2 = second, ...)
// @access Private
router.patch(
  "/marriages/:marriageId/children/:childId",
  [UserAuth, checkSessionExpiry],
  patchChildOrder,
);

module.exports = router;
