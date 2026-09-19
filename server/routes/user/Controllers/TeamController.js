/**
 * User Team Controller
 *
 * All endpoints use req.user.id (authenticated user).
 * Response: { users, pagination } or structure node format.
 */

const response = require("../../../config/response");
const {
  getDirectTeam,
  getAllTeam,
  getTeamByLevel,
  getStructureChildren,
  getStructureNode,
  getTeamCounts,
  isNodeAccessibleByUser,
} = require("../../../services/teamService");

/**
 * GET /api/users/team/direct
 * Direct team (Level 1) - paginated
 */
async function getDirect(req, res) {
  try {
    const userId = req.user.id;
    const result = await getDirectTeam(userId, req.query);
    return response.successResponse(res, result, "Direct team retrieved");
  } catch (err) {
    console.error("getDirect error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch direct team" }],
      "Failed to fetch direct team",
      500
    );
  }
}

/**
 * GET /api/users/team/all
 * Full downline - paginated
 */
async function getAll(req, res) {
  try {
    const userId = req.user.id;
    const result = await getAllTeam(userId, req.query);
    return response.successResponse(res, result, "Team retrieved");
  } catch (err) {
    console.error("getAll error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch team" }],
      "Failed to fetch team",
      500
    );
  }
}

/**
 * GET /api/users/team/level/:level
 * Team by level - paginated
 */
async function getByLevel(req, res) {
  try {
    const userId = req.user.id;
    const { level } = req.params;
    const result = await getTeamByLevel(userId, level, req.query);
    return response.successResponse(res, result, "Level team retrieved");
  } catch (err) {
    console.error("getByLevel error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch level team" }],
      "Failed to fetch level team",
      500
    );
  }
}

/**
 * GET /api/users/team/structure/:nodeId?
 * Structure tree - lazy load. nodeId optional (default: current user as root)
 * Security: nodeId must be self or in own downline.
 */
async function getStructure(req, res) {
  try {
    const currentNodeId = req.params.nodeId || req.user.id;
    const currentUserId = req.user.id;

    const accessible = await isNodeAccessibleByUser(currentNodeId, currentUserId);
    if (!accessible) {
      return response.errorResponse(
        res,
        [{ msg: "Access denied to this node" }],
        "Access denied",
        403
      );
    }

    const children = await getStructureChildren(currentNodeId);

    // When root (no nodeId), include root node for display
    const isRoot = !req.params.nodeId;
    let payload = { children };
    if (isRoot) {
      const rootNode = await getStructureNode(currentUserId);
      if (rootNode) payload.root = rootNode;
    }

    return response.successResponse(res, payload, "Structure retrieved");
  } catch (err) {
    console.error("getStructure error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch structure" }],
      "Failed to fetch structure",
      500
    );
  }
}

/**
 * GET /api/users/team/dashboard
 * Dashboard counts (directCount, totalDownlineCount)
 */
async function getDashboard(req, res) {
  try {
    const userId = req.user.id;
    const counts = await getTeamCounts(userId);
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
    console.error("getDashboard error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch dashboard" }],
      "Failed to fetch dashboard",
      500
    );
  }
}

/**
 * GET /api/users/team/member/:userId/direct
 * Direct team (Level 1) of a member. Allowed only if member is self or in current user's downline.
 */
async function getMemberDirect(req, res) {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    const accessible = await isNodeAccessibleByUser(targetUserId, currentUserId);
    if (!accessible) {
      return response.errorResponse(
        res,
        [{ msg: "Access denied to this member's team" }],
        "Access denied",
        403
      );
    }

    const result = await getDirectTeam(targetUserId, req.query);
    return response.successResponse(res, result, "Member direct team retrieved");
  } catch (err) {
    console.error("getMemberDirect error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch member direct team" }],
      "Failed to fetch member direct team",
      500
    );
  }
}

/**
 * GET /api/users/team/member/:userId/all
 * Full downline of a member. Allowed only if member is self or in current user's downline.
 */
async function getMemberAll(req, res) {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    const accessible = await isNodeAccessibleByUser(targetUserId, currentUserId);
    if (!accessible) {
      return response.errorResponse(
        res,
        [{ msg: "Access denied to this member's team" }],
        "Access denied",
        403
      );
    }

    const result = await getAllTeam(targetUserId, req.query);
    return response.successResponse(res, result, "Member downline retrieved");
  } catch (err) {
    console.error("getMemberAll error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch member downline" }],
      "Failed to fetch member downline",
      500
    );
  }
}

module.exports = {
  getDirect,
  getAll,
  getByLevel,
  getStructure,
  getDashboard,
  getMemberDirect,
  getMemberAll,
};
