/**
 * Admin Team Controller
 *
 * Same logic as user team, but targetUserId from params.
 * Admin can view any user's team.
 */

const mongoose = require("mongoose");
const response = require("../../../config/response");
const {
  getDirectTeam,
  getAllTeam,
  getTeamByLevel,
  getStructureChildren,
  getStructureNode,
  getTeamCounts,
} = require("../../../services/teamService");
const User = require("../../../models/User");
const { validateMemberId } = require("../../../utils/inputValidation");

/**
 * Resolve target user - admin passes userId in params
 */
async function resolveTargetUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { valid: false, error: "Invalid user ID" };
  }
  const user = await User.findById(userId).select("_id").lean();
  if (!user) return { valid: false, error: "User not found" };
  return { valid: true, userId: user._id.toString() };
}

/**
 * GET /api/admin/team/resolve?memberId=xxx
 * Resolve user by memberId for admin dashboard search
 */
async function resolveUserByMemberId(req, res) {
  try {
    const rawMemberId = String(req.query.memberId || "").trim();
    const memberIdValidation = validateMemberId(rawMemberId);
    if (!memberIdValidation.valid) {
      return response.errorResponse(
        res,
        [{ msg: "Valid memberId is required (format: G#########)" }],
        "Invalid memberId",
        400
      );
    }
    const memberId = memberIdValidation.sanitized;
    const user = await User.findOne({ memberId })
      .select("_id memberId name directCount totalDownlineCount status")
      .lean();
    if (!user) {
      return response.errorResponse(
        res,
        [{ msg: "Member not found" }],
        "Member not found",
        404
      );
    }
    return response.successResponse(
      res,
      {
        userId: user._id.toString(),
        memberId: user.memberId,
        name: user.name,
        directCount: user.directCount ?? 0,
        totalDownlineCount: user.totalDownlineCount ?? 0,
        status: user.status,
      },
      "User resolved"
    );
  } catch (err) {
    console.error("resolveUserByMemberId error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to resolve user" }],
      "Failed to resolve user",
      500
    );
  }
}

/**
 * GET /api/admin/team/:userId/direct
 */
async function getDirect(req, res) {
  try {
    const resolved = await resolveTargetUser(req.params.userId);
    if (!resolved.valid) {
      return response.errorResponse(
        res,
        [{ msg: resolved.error }],
        resolved.error,
        400
      );
    }
    const result = await getDirectTeam(resolved.userId, req.query);
    return response.successResponse(res, result, "Direct team retrieved");
  } catch (err) {
    console.error("getDirect (admin) error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch direct team" }],
      "Failed to fetch direct team",
      500
    );
  }
}

/**
 * GET /api/admin/team/:userId/all
 */
async function getAll(req, res) {
  try {
    const resolved = await resolveTargetUser(req.params.userId);
    if (!resolved.valid) {
      return response.errorResponse(
        res,
        [{ msg: resolved.error }],
        resolved.error,
        400
      );
    }
    const result = await getAllTeam(resolved.userId, req.query);
    return response.successResponse(res, result, "Team retrieved");
  } catch (err) {
    console.error("getAll (admin) error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch team" }],
      "Failed to fetch team",
      500
    );
  }
}

/**
 * GET /api/admin/team/:userId/level/:level
 */
async function getByLevel(req, res) {
  try {
    const resolved = await resolveTargetUser(req.params.userId);
    if (!resolved.valid) {
      return response.errorResponse(
        res,
        [{ msg: resolved.error }],
        resolved.error,
        400
      );
    }
    const { level } = req.params;
    const result = await getTeamByLevel(resolved.userId, level, req.query);
    return response.successResponse(res, result, "Level team retrieved");
  } catch (err) {
    console.error("getByLevel (admin) error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch level team" }],
      "Failed to fetch level team",
      500
    );
  }
}

/**
 * GET /api/admin/team/:userId/structure/:nodeId?
 * nodeId optional - defaults to userId (root of tree)
 */
async function getStructure(req, res) {
  try {
    const resolved = await resolveTargetUser(req.params.userId);
    if (!resolved.valid) {
      return response.errorResponse(
        res,
        [{ msg: resolved.error }],
        resolved.error,
        400
      );
    }
    const nodeId = req.params.nodeId || resolved.userId;
    const children = await getStructureChildren(nodeId);
    const isRoot = !req.params.nodeId;
    let payload = { children };
    if (isRoot) {
      const rootNode = await getStructureNode(nodeId);
      if (rootNode) payload.root = rootNode;
    }
    return response.successResponse(res, payload, "Structure retrieved");
  } catch (err) {
    console.error("getStructure (admin) error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch structure" }],
      "Failed to fetch structure",
      500
    );
  }
}

/**
 * GET /api/admin/team/:userId/dashboard
 */
async function getDashboard(req, res) {
  try {
    const resolved = await resolveTargetUser(req.params.userId);
    if (!resolved.valid) {
      return response.errorResponse(
        res,
        [{ msg: resolved.error }],
        resolved.error,
        400
      );
    }
    const counts = await getTeamCounts(resolved.userId);
    if (!counts) {
      return response.errorResponse(
        res,
        [{ msg: "User not found" }],
        "User not found",
        404
      );
    }
    return response.successResponse(res, counts, "Dashboard counts retrieved");
  } catch (err) {
    console.error("getDashboard (admin) error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch dashboard" }],
      "Failed to fetch dashboard",
      500
    );
  }
}

module.exports = {
  resolveUserByMemberId,
  getDirect,
  getAll,
  getByLevel,
  getStructure,
  getDashboard,
};
