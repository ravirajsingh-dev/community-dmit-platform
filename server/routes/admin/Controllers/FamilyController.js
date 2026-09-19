const mongoose = require("mongoose");
const response = require("../../../config/response");
const User = require("../../../models/User");
const {
  buildFamilyTree,
} = require("../../../services/family/familyTreeService");
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
 * GET /api/admin/family/resolve-user — Resolve user by memberId or userId.
 */
const resolveUser = async (req, res) => {
  try {
    const { memberId, userId } = req.query || {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return response.errorResponse(
          res,
          [{ path: "userId", msg: "Invalid resource identifier" }],
          "Validation Error",
          400,
        );
      }
      const user = await User.findById(userId)
        .select("_id memberId name phone email status")
        .lean();
      if (!user) {
        return response.errorResponse(
          res,
          [{ msg: "Resource not found" }],
          "Resource not found",
          404,
        );
      }
      return response.successResponse(res, user, "User");
    }

    if (memberId) {
      const user = await User.findOne({ memberId })
        .select("_id memberId name phone email status")
        .lean();
      if (!user) {
        return response.errorResponse(
          res,
          [{ msg: "Resource not found" }],
          "Resource not found",
          404,
        );
      }
      return response.successResponse(res, user, "User");
    }

    return response.errorResponse(
      res,
      [{ msg: "memberId or userId is required" }],
      "Validation Error",
      400,
    );
  } catch (err) {
    console.error("resolveUser error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * POST /api/admin/family/users/:userId/init — Initialize family root (Root Male / Root Female).
 */
const initUserFamily = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { rootMale, rootFemale } = req.body || {};

    const result = await initFamilyWithRootCouple({
      userId: targetUserId,
      rootMale,
      rootFemale,
    });

    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }

    return response.successResponse(
      res,
      result.family,
      result.created ? "Family initialized" : "Family already initialized",
    );
  } catch (err) {
    console.error("initUserFamily error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/admin/family/users/:userId/flat — Flat members + marriages.
 */
const getUserFamilyFlat = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const page =
      req.query.page != null ? parseInt(req.query.page, 10) : undefined;
    const limit =
      req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const data = await listFamilyFlat({
      userId: targetUserId,
      familyId: family._id,
      page,
      limit,
    });
    return response.successResponse(res, { family, ...data }, "Family data");
  } catch (err) {
    console.error("getUserFamilyFlat error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/admin/family/users/:userId/tree — Hierarchical spouse-aware tree.
 */
const getUserFamilyTree = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const data = await buildFamilyTree({
      userId: targetUserId,
      familyId: family._id,
    });
    if (data.error) {
      return response.errorResponse(
        res,
        data.error.errors || [{ msg: "Family root is missing or corrupted" }],
        data.error.errors?.[0]?.msg || "Family root is missing or corrupted",
        data.error.code || 400,
      );
    }
    return response.successResponse(res, data, "Family tree");
  } catch (err) {
    console.error("getUserFamilyTree error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * POST /api/admin/family/users/:userId/members — Create a family member.
 */
const createUserFamilyMember = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const result = await createMember({
      userId: targetUserId,
      familyId: family._id,
      payload: req.body,
    });
    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }
    return response.successResponse(res, result.member, "Member created");
  } catch (err) {
    console.error("createUserFamilyMember error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * PUT /api/admin/family/users/:userId/members/:memberId — Update a family member.
 */
const updateUserFamilyMember = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const result = await updateMember({
      userId: targetUserId,
      familyId: family._id,
      memberId: req.params.memberId,
      payload: req.body,
    });
    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }
    return response.successResponse(res, result.member, "Member updated");
  } catch (err) {
    console.error("updateUserFamilyMember error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * POST /api/admin/family/users/:userId/marriages — Create a marriage.
 */
const createUserFamilyMarriage = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { spouse1Id, spouse2Id, spouse2 } = req.body || {};
    const { family } = await ensureUserFamily({ userId: targetUserId });

    const result = await createMarriage({
      userId: targetUserId,
      familyId: family._id,
      spouse1Id,
      spouse2Id,
      spouse2Payload: spouse2,
    });

    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }

    return response.successResponse(res, result, "Marriage created");
  } catch (err) {
    console.error("createUserFamilyMarriage error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * PATCH /api/admin/family/users/:userId/marriages/:marriageId — Update marriage status (divorce / widowed).
 */
const updateUserFamilyMarriage = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const { status } = req.body || {};
    const result = await updateMarriage({
      userId: targetUserId,
      familyId: family._id,
      marriageId: req.params.marriageId,
      status,
      endedAt: req.body?.endedAt,
    });
    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }
    return response.successResponse(res, result.marriage, "Marriage updated");
  } catch (err) {
    console.error("updateUserFamilyMarriage error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/admin/family/users/:userId/members/:memberId/eligible-spouses
 */
const getEligibleSpouses = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const result = await getEligibleSpousesService({
      userId: targetUserId,
      familyId: family._id,
      memberId: req.params.memberId,
    });
    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }
    return response.successResponse(res, result, "Eligible spouses");
  } catch (err) {
    console.error("getEligibleSpouses error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/admin/family/users/:userId/marriages/:marriageId/eligible-children
 */
const getEligibleChildren = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const result = await getEligibleChildrenService({
      userId: targetUserId,
      familyId: family._id,
      marriageId: req.params.marriageId,
    });
    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }
    return response.successResponse(res, result, "Eligible children");
  } catch (err) {
    console.error("getEligibleChildren error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * POST /api/admin/family/users/:userId/marriages/:marriageId/children — Add child to marriage.
 */
const addUserFamilyChild = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const { memberId, childId, child, dob, order } = req.body || {};

    const result = await addChildToMarriage({
      userId: targetUserId,
      familyId: family._id,
      marriageId: req.params.marriageId,
      memberId: memberId || childId,
      childId,
      childPayload:
        child != null ? (dob != null ? { ...child, dob } : child) : undefined,
      order,
    });

    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }

    return response.successResponse(res, result, "Child added");
  } catch (err) {
    console.error("addUserFamilyChild error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * PATCH /api/admin/family/users/:userId/marriages/:marriageId/children/:childId — Update child order.
 */
const patchUserFamilyChildOrder = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const result = await updateChildOrderService({
      userId: targetUserId,
      familyId: family._id,
      marriageId: req.params.marriageId,
      childId: req.params.childId,
      order: req.body?.order,
    });

    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }

    return response.successResponse(
      res,
      result.marriage,
      "Child order updated",
    );
  } catch (err) {
    console.error("patchUserFamilyChildOrder error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/admin/family/users/:userId/members/:memberId/deletion-preview — Preview of what will be deleted.
 */
const getUserFamilyMemberDeletionPreview = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const result = await getMemberDeletionPreviewService({
      userId: targetUserId,
      familyId: family._id,
      memberId: req.params.memberId,
    });
    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }
    return response.successResponse(res, result, "Deletion preview");
  } catch (err) {
    console.error("getUserFamilyMemberDeletionPreview error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * DELETE /api/admin/family/users/:userId/members/:memberId — Delete member (subtree or strict).
 */
const deleteUserFamilyMember = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { family } = await ensureUserFamily({ userId: targetUserId });
    const mode = req.query.mode === "strict" ? "strict" : "subtree";
    const result = await deleteMember({
      userId: targetUserId,
      familyId: family._id,
      memberId: req.params.memberId,
      mode,
    });
    if (result.error) {
      return response.errorResponse(
        res,
        result.error.errors,
        "Validation Error",
        result.error.code,
      );
    }
    return response.successResponse(res, result, "Member and subtree deleted");
  } catch (err) {
    console.error("deleteUserFamilyMember error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
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
};
