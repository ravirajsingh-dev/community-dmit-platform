const response = require("../../../config/response");
const { buildFamilyTree } = require("../../../services/family/familyTreeService");
const {
  ensureUserFamily,
  initFamilyWithRootCouple,
  listFamilyFlat,
  createMember,
  updateMember,
  createMarriage,
  updateMarriage,
  addChildToMarriage,
  updateChildOrder: updateChildOrderService,
  deleteMember,
  getMemberDeletionPreview: getMemberDeletionPreviewService,
  getEligibleSpouses: getEligibleSpousesService,
  getEligibleChildren: getEligibleChildrenService,
} = require("../../../services/family/familyService");

/**
 * POST /api/users/family/init
 * Initialize family with Par-Dada / Par-Dadi (root couple) or a single root.
 */
const initFamily = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { rootMale, rootFemale } = req.body || {};

    const result = await initFamilyWithRootCouple({ userId, rootMale, rootFemale });
    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }

    return response.successResponse(res, result.family, result.created ? "Family initialized" : "Family already initialized");
  } catch (err) {
    console.error("initFamily error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/users/family
 * Ensure family exists and return the container (no tree)
 */
const getFamily = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    return response.successResponse(res, family, "Family");
  } catch (err) {
    console.error("getFamily error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/users/family/flat
 * Flat members + marriages. Optional ?page=1&limit=50 for paginated members.
 */
const getFamilyFlat = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const page = req.query.page != null ? parseInt(req.query.page, 10) : undefined;
    const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const data = await listFamilyFlat({ userId, familyId: family._id, page, limit });
    return response.successResponse(res, { family, ...data }, "Family data");
  } catch (err) {
    console.error("getFamilyFlat error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/users/family/tree
 * Read-only hierarchical tree (spouse-aware)
 */
const getFamilyTree = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const data = await buildFamilyTree({ userId, familyId: family._id });
    if (data.error) {
      return response.errorResponse(
        res,
        data.error.errors || [{ msg: "Family root is missing or corrupted" }],
        data.error.errors?.[0]?.msg || "Family root is missing or corrupted",
        data.error.code || 400
      );
    }
    return response.successResponse(res, data, "Family tree");
  } catch (err) {
    console.error("getFamilyTree error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * POST /api/users/family/members
 */
const createFamilyMember = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const result = await createMember({ userId, familyId: family._id, payload: req.body });
    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }
    return response.successResponse(res, result.member, "Member created");
  } catch (err) {
    console.error("createFamilyMember error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * PUT /api/users/family/members/:memberId
 */
const updateFamilyMember = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const result = await updateMember({
      userId,
      familyId: family._id,
      memberId: req.params.memberId,
      payload: req.body,
    });
    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }
    return response.successResponse(res, result.member, "Member updated");
  } catch (err) {
    console.error("updateFamilyMember error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * POST /api/users/family/marriages
 * body: { spouse1Id, spouse2Id? , spouse2? }
 */
const createFamilyMarriage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { spouse1Id, spouse2Id, spouse2 } = req.body || {};
    const { family } = await ensureUserFamily({ userId });

    const result = await createMarriage({
      userId,
      familyId: family._id,
      spouse1Id,
      spouse2Id,
      spouse2Payload: spouse2,
    });

    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }

    return response.successResponse(res, result, "Marriage created");
  } catch (err) {
    console.error("createFamilyMarriage error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * PATCH /api/users/family/marriages/:marriageId
 * body: { status: 'divorced' | 'widowed' } — ends the marriage, sets endedAt
 */
const updateFamilyMarriage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const { status } = req.body || {};
    const result = await updateMarriage({
      userId,
      familyId: family._id,
      marriageId: req.params.marriageId,
      status,
      endedAt: req.body?.endedAt,
    });
    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }
    return response.successResponse(res, result.marriage, "Marriage updated");
  } catch (err) {
    console.error("updateFamilyMarriage error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * POST /api/users/family/marriages/:marriageId/children
 * body: { memberId?, childId?, child?, dob?, order? }
 */
const addChild = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const { memberId, childId, child, dob, order } = req.body || {};

    const result = await addChildToMarriage({
      userId,
      familyId: family._id,
      marriageId: req.params.marriageId,
      memberId: memberId || childId,
      childId,
      childPayload: child != null ? (dob != null ? { ...child, dob } : child) : undefined,
      order,
    });

    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }

    return response.successResponse(res, result, "Child added");
  } catch (err) {
    console.error("addChild error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * PATCH /api/users/family/marriages/:marriageId/children/:childId
 * body: { order } — manual birth order (1 = eldest, 2 = second, ...)
 */
const patchChildOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const result = await updateChildOrderService({
      userId,
      familyId: family._id,
      marriageId: req.params.marriageId,
      childId: req.params.childId,
      order: req.body?.order,
    });

    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }

    return response.successResponse(res, result.marriage, "Child order updated");
  } catch (err) {
    console.error("patchChildOrder error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/users/family/members/:memberId/deletion-preview
 * Get preview of what will be deleted (for confirmation modal)
 */
const getMemberDeletionPreview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const result = await getMemberDeletionPreviewService({
      userId,
      familyId: family._id,
      memberId: req.params.memberId,
    });
    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }
    return response.successResponse(res, result, "Deletion preview");
  } catch (err) {
    console.error("getMemberDeletionPreview error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/users/family/members/:memberId/eligible-spouses
 * Returns member ids that are eligible to marry this member (opposite gender, no prohibited relationship).
 */
const getEligibleSpouses = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const result = await getEligibleSpousesService({
      userId,
      familyId: family._id,
      memberId: req.params.memberId,
    });
    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }
    return response.successResponse(res, result, "Eligible spouses");
  } catch (err) {
    console.error("getEligibleSpouses error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/users/family/marriages/:marriageId/eligible-children
 * Returns member ids eligible to be added as child to this marriage (excludes spouses, existing children, ancestors/descendants of spouses).
 */
const getEligibleChildren = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const result = await getEligibleChildrenService({
      userId,
      familyId: family._id,
      marriageId: req.params.marriageId,
    });
    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }
    return response.successResponse(res, result, "Eligible children");
  } catch (err) {
    console.error("getEligibleChildren error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * DELETE /api/users/family/members/:memberId
 * Delete member. Default = subtree (member + descendants). ?mode=strict for strict delete only.
 */
const deleteFamilyMember = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { family } = await ensureUserFamily({ userId });
    const mode = req.query.mode === "strict" ? "strict" : "subtree";
    const result = await deleteMember({
      userId,
      familyId: family._id,
      memberId: req.params.memberId,
      mode,
    });
    if (result.error) {
      return response.errorResponse(res, result.error.errors, "Validation Error", result.error.code);
    }
    return response.successResponse(res, result, "Member and subtree deleted");
  } catch (err) {
    console.error("deleteFamilyMember error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
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
};

