/**
 * Team Service - Closure Table Queries
 *
 * All queries use indexed fields. No recursion, no $graphLookup, no BFS.
 * Paginated for scale (100k–500k+ users).
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const {
  parsePaginationParams,
  buildPaginationMeta,
} = require("../utils/pagination");
const { processSearchFilters } = require("../utils/searchHelper");

const USER_SELECT = "memberId name phone email status isPaid createdAt directCount totalDownlineCount referredBy";
const USER_SELECT_NO_REF = "memberId name phone email status isPaid createdAt directCount totalDownlineCount";
const STRUCTURE_SELECT = "memberId name status directCount";

/** Allowed sort fields for direct team */
const DIRECT_SORT_FIELDS = ["name", "memberId", "createdAt", "status", "directCount", "totalDownlineCount"];

/** Build sort object from options */
function buildDirectSort(options) {
  const field = DIRECT_SORT_FIELDS.includes(options?.orderBy) ? options.orderBy : "createdAt";
  const dir = options?.ascending === "asc" ? 1 : -1;
  return { [field]: dir };
}

/** Parse filters and query from options (same shape as search-members) */
function parseTeamFilterParams(options = {}) {
  let filters = [];
  let query = {};
  if (typeof options.filters === "string") {
    filters = options.filters ? options.filters.split(",").filter(Boolean) : [];
  } else if (Array.isArray(options.filters)) {
    filters = options.filters;
  }
  if (typeof options.query === "string") {
    try {
      query = options.query ? JSON.parse(options.query) : {};
    } catch (e) {
      query = {};
    }
  } else if (typeof options.query === "object" && options.query) {
    query = options.query;
  }
  return { filters, query };
}

/** Escape special regex characters in a string for use in RegExp */
function escapeRegex(str) {
  if (str == null || typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build user match for team (memberId, name, phone, status, createdAt, referredBy) */
async function buildTeamUserMatch(baseMatch, filters, query, currentUserId) {
  const teamFilterFields = ["memberId", "name", "phone", "status", "createdAt"];
  const filterQuery = {};
  Object.keys(query).forEach((key) => {
    if (key === "search" && typeof query[key] === "object") {
      filterQuery[key] = query[key]; // keep "search" key so processSearchFilters can use it
    } else if (teamFilterFields.includes(key)) {
      filterQuery[key] = query[key];
    }
  });
  const filterKeys = filters.filter((f) => f === "search" || teamFilterFields.includes(f));
  const extraMatch = processSearchFilters(filterKeys, filterQuery);
  let referredByFilter = null;
  if (query["referredBy.memberId"] || query["referredBy.phone"]) {
    const refQuery = {};
    const refMemberId = query["referredBy.memberId"]?.value;
    const refPhone = query["referredBy.phone"]?.value;
    if (refMemberId != null && String(refMemberId).trim()) {
      refQuery.memberId = { $regex: new RegExp(escapeRegex(String(refMemberId).trim()), "i") };
    }
    if (refPhone != null && String(refPhone).trim()) {
      refQuery.phone = { $regex: new RegExp(escapeRegex(String(refPhone).trim()), "i") };
    }
    if (Object.keys(refQuery).length) {
      const referrers = await User.find(refQuery).select("_id").lean();
      const refIds = referrers.map((r) => r._id);
      if (refIds.length) {
        const currentId = currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null;
        const allowedIds = currentId && baseMatch.referredBy
          ? refIds.filter((id) => id.toString() === currentId.toString())
          : refIds;
        referredByFilter = allowedIds.length
          ? { referredBy: { $in: allowedIds } }
          : { referredBy: new mongoose.Types.ObjectId("000000000000000000000000") };
      } else {
        referredByFilter = { referredBy: new mongoose.Types.ObjectId("000000000000000000000000") };
      }
    }
  }
  const combined = { ...baseMatch, ...extraMatch };
  if (referredByFilter) Object.assign(combined, referredByFilter);
  return combined;
}

/**
 * Get direct team (Level 1) - paginated, with filters and referredBy populated
 */
async function getDirectTeam(userId, options = {}) {
  const { page, limit, skip } = parsePaginationParams(options);
  const sortBy = buildDirectSort(options);
  const { filters, query } = parseTeamFilterParams(options);

  const baseMatch = { referredBy: userId };
  const matchQuery = await buildTeamUserMatch(baseMatch, filters, query, userId);

  const [users, totalCount] = await Promise.all([
    User.find(matchQuery)
      .select(USER_SELECT)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .populate("referredBy", "memberId name phone")
      .lean(),
    User.countDocuments(matchQuery),
  ]);

  const items = users.map((u) => {
    const { referredBy: ref, ...rest } = u;
    return {
      ...rest,
      level: 1,
      referredByDetails: ref
        ? {
            memberId: ref.memberId,
            name: ref.name,
            phone: ref.phone,
          }
        : null,
    };
  });

  return {
    users: items,
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

/**
 * Get full downline (all levels) - paginated, with filters and referredBy details
 */
async function getAllTeam(userId, options = {}) {
  const { page, limit, skip } = parsePaginationParams(options);
  const sortDir = options.ascending === "asc" ? 1 : -1;
  const sortField = options.orderBy || "createdAt";
  const { filters, query } = parseTeamFilterParams(options);

  const matchStage = { ancestor: new mongoose.Types.ObjectId(userId) };

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $unwind: "$userDoc" },
    {
      $lookup: {
        from: "users",
        localField: "userDoc.referredBy",
        foreignField: "_id",
        as: "referredByDoc",
      },
    },
    { $unwind: { path: "$referredByDoc", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        referredByDetails: {
          $cond: {
            if: { $ne: ["$referredByDoc", null] },
            then: {
              memberId: "$referredByDoc.memberId",
              name: "$referredByDoc.name",
              phone: "$referredByDoc.phone",
            },
            else: null,
          },
        },
      },
    },
    {
      $project: {
        _id: "$userDoc._id",
        memberId: "$userDoc.memberId",
        name: "$userDoc.name",
        phone: "$userDoc.phone",
        email: "$userDoc.email",
        status: "$userDoc.status",
        isPaid: "$userDoc.isPaid",
        createdAt: "$userDoc.createdAt",
        directCount: "$userDoc.directCount",
        totalDownlineCount: "$userDoc.totalDownlineCount",
        level: "$level",
        referredByDetails: 1,
      },
    },
  ];

  const { match: userMatch, referredByMatch } = await buildTeamUserMatchForAggregate(filters, query);
  // Apply referredBy filter right after we have userDoc (by referrer _id), so phone/memberId work
  if (referredByMatch) {
    const unwindUserIdx = pipeline.findIndex((s) => s.$unwind === "$userDoc");
    const insertAt = unwindUserIdx >= 0 ? unwindUserIdx + 1 : pipeline.length;
    pipeline.splice(insertAt, 0, { $match: referredByMatch });
  }
  if (userMatch && Object.keys(userMatch).length > 0) {
    pipeline.push({ $match: userMatch });
  }

  const countPipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $unwind: "$userDoc" },
    {
      $lookup: {
        from: "users",
        localField: "userDoc.referredBy",
        foreignField: "_id",
        as: "referredByDoc",
      },
    },
    { $unwind: { path: "$referredByDoc", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        referredByDetails: {
          $cond: {
            if: { $ne: ["$referredByDoc", null] },
            then: {
              memberId: "$referredByDoc.memberId",
              name: "$referredByDoc.name",
              phone: "$referredByDoc.phone",
            },
            else: null,
          },
        },
      },
    },
    {
      $project: {
        memberId: "$userDoc.memberId",
        name: "$userDoc.name",
        phone: "$userDoc.phone",
        status: "$userDoc.status",
        createdAt: "$userDoc.createdAt",
        referredByDetails: 1,
      },
    },
  ];
  if (referredByMatch) {
    const countUnwindIdx = countPipeline.findIndex((s) => s.$unwind === "$userDoc");
    const countInsertAt = countUnwindIdx >= 0 ? countUnwindIdx + 1 : countPipeline.length;
    countPipeline.splice(countInsertAt, 0, { $match: referredByMatch });
  }
  if (userMatch && Object.keys(userMatch).length > 0) {
    countPipeline.push({ $match: userMatch });
  }
  countPipeline.push({ $count: "total" });

  const ALL_SORT_FIELDS = ["level", "name", "memberId", "createdAt", "status"];
  const effectiveField = ALL_SORT_FIELDS.includes(sortField) ? sortField : "createdAt";
  const sortStage =
    effectiveField === "level"
      ? { level: sortDir, createdAt: -1 }
      : effectiveField === "name"
        ? { name: sortDir, level: 1 }
        : effectiveField === "memberId"
          ? { memberId: sortDir, level: 1 }
          : effectiveField === "status"
            ? { status: sortDir, level: 1 }
            : { createdAt: sortDir };

  pipeline.push({ $sort: sortStage }, { $skip: skip }, { $limit: limit });

  const [data, countResult] = await Promise.all([
    UserHierarchy.aggregate(pipeline),
    UserHierarchy.aggregate(countPipeline),
  ]);

  const totalCount = countResult[0]?.total ?? 0;

  return {
    users: data,
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

/**
 * Build $match for aggregation pipeline (userDoc / root fields).
 * For referredBy.memberId / referredBy.phone we resolve referrer User _ids and filter by
 * "userDoc.referredBy" $in refIds (early stage), same as direct team - so phone filter works.
 * Returns { match, referredByMatch } where referredByMatch is applied right after $unwind userDoc.
 */
async function buildTeamUserMatchForAggregate(filters, query) {
  const teamFilterFields = ["memberId", "name", "phone", "status", "createdAt"];
  const filterQuery = {};
  Object.keys(query).forEach((key) => {
    if (key === "search" && typeof query[key] === "object") {
      filterQuery[key] = query[key]; // keep "search" key so processSearchFilters can use it
    } else if (teamFilterFields.includes(key)) {
      filterQuery[key] = query[key];
    }
    // referredBy.* is NOT added here - we handle via referredByMatch (userDoc.referredBy $in)
  });
  const filterKeys = filters.filter((f) => f === "search" || teamFilterFields.includes(f));
  const extraMatch = processSearchFilters(filterKeys, filterQuery);
  const aggMatch = {};
  for (const key of Object.keys(extraMatch)) {
    if (key.startsWith("referredBy.")) {
      const refField = key.replace("referredBy.", "referredByDetails.");
      aggMatch[refField] = extraMatch[key];
    } else {
      aggMatch[key] = extraMatch[key];
    }
  }

  const refMemberId =
    query["referredBy.memberId"]?.value != null
      ? String(query["referredBy.memberId"].value).trim()
      : "";
  const refPhone =
    query["referredBy.phone"]?.value != null
      ? String(query["referredBy.phone"].value).trim()
      : "";

  let referredByMatch = null;
  if (refMemberId || refPhone) {
    const refQuery = {};
    if (refMemberId) {
      refQuery.memberId = { $regex: new RegExp(escapeRegex(refMemberId), "i") };
    }
    if (refPhone) {
      refQuery.phone = { $regex: new RegExp(escapeRegex(refPhone), "i") };
    }
    if (Object.keys(refQuery).length) {
      const referrers = await User.find(refQuery).select("_id").lean();
      const refIds = referrers.map((r) => r._id);
      if (refIds.length) {
        referredByMatch = { "userDoc.referredBy": { $in: refIds } };
      } else {
        // No referrer found for this phone/memberId -> no team members can match
        referredByMatch = { "userDoc.referredBy": new mongoose.Types.ObjectId("000000000000000000000000") };
      }
    }
  }

  const match = Object.keys(aggMatch).length ? aggMatch : null;
  return { match, referredByMatch };
}

/**
 * Get team by level - paginated, with filters and referredBy details
 */
async function getTeamByLevel(userId, level, options = {}) {
  const levelNum = Math.max(1, parseInt(level, 10));
  const { page, limit, skip } = parsePaginationParams(options);
  const { filters, query } = parseTeamFilterParams(options);

  const matchStage = {
    ancestor: new mongoose.Types.ObjectId(userId),
    level: levelNum,
  };

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $unwind: "$userDoc" },
    {
      $lookup: {
        from: "users",
        localField: "userDoc.referredBy",
        foreignField: "_id",
        as: "referredByDoc",
      },
    },
    { $unwind: { path: "$referredByDoc", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        referredByDetails: {
          $cond: {
            if: { $ne: ["$referredByDoc", null] },
            then: {
              memberId: "$referredByDoc.memberId",
              name: "$referredByDoc.name",
              phone: "$referredByDoc.phone",
            },
            else: null,
          },
        },
      },
    },
    {
      $project: {
        _id: "$userDoc._id",
        memberId: "$userDoc.memberId",
        name: "$userDoc.name",
        phone: "$userDoc.phone",
        email: "$userDoc.email",
        status: "$userDoc.status",
        isPaid: "$userDoc.isPaid",
        createdAt: "$userDoc.createdAt",
        directCount: "$userDoc.directCount",
        totalDownlineCount: "$userDoc.totalDownlineCount",
        level: "$level",
        referredByDetails: 1,
      },
    },
  ];

  const { match: userMatch, referredByMatch } = await buildTeamUserMatchForAggregate(filters, query);
  if (referredByMatch) {
    const unwindUserIdx = pipeline.findIndex((s) => s.$unwind === "$userDoc");
    const insertAt = unwindUserIdx >= 0 ? unwindUserIdx + 1 : pipeline.length;
    pipeline.splice(insertAt, 0, { $match: referredByMatch });
  }
  if (userMatch && Object.keys(userMatch).length > 0) {
    pipeline.push({ $match: userMatch });
  }

  pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit });

  const countPipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $unwind: "$userDoc" },
    {
      $lookup: {
        from: "users",
        localField: "userDoc.referredBy",
        foreignField: "_id",
        as: "referredByDoc",
      },
    },
    { $unwind: { path: "$referredByDoc", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        referredByDetails: {
          $cond: {
            if: { $ne: ["$referredByDoc", null] },
            then: {
              memberId: "$referredByDoc.memberId",
              name: "$referredByDoc.name",
              phone: "$referredByDoc.phone",
            },
            else: null,
          },
        },
      },
    },
    {
      $project: {
        memberId: "$userDoc.memberId",
        name: "$userDoc.name",
        phone: "$userDoc.phone",
        status: "$userDoc.status",
        createdAt: "$userDoc.createdAt",
        referredByDetails: 1,
      },
    },
  ];
  if (referredByMatch) {
    const countUnwindIdx = countPipeline.findIndex((s) => s.$unwind === "$userDoc");
    const countInsertAt = countUnwindIdx >= 0 ? countUnwindIdx + 1 : countPipeline.length;
    countPipeline.splice(countInsertAt, 0, { $match: referredByMatch });
  }
  if (userMatch && Object.keys(userMatch).length > 0) {
    countPipeline.push({ $match: userMatch });
  }
  countPipeline.push({ $count: "total" });

  const [data, countResult] = await Promise.all([
    UserHierarchy.aggregate(pipeline),
    UserHierarchy.aggregate(countPipeline),
  ]);

  const totalCount = countResult[0]?.total ?? 0;

  return {
    users: data,
    level: levelNum,
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

/**
 * Verify nodeId is either the current user or in their downline (for user-side access control)
 */
async function isNodeAccessibleByUser(nodeId, currentUserId) {
  if (nodeId.toString() === currentUserId.toString()) return true;
  const exists = await UserHierarchy.exists({
    user: nodeId,
    ancestor: currentUserId,
  });
  return !!exists;
}

/**
 * Get structure node (lazy load) - direct children only
 * Query: User.find({ referredBy: nodeId })
 * Returns minimal fields for tree UI.
 */
async function getStructureChildren(nodeId) {
  const users = await User.find({ referredBy: nodeId })
    .select(STRUCTURE_SELECT)
    .lean();

  return users.map((u) => ({
    _id: u._id,
    memberId: u.memberId,
    name: u.name,
    status: u.status,
    directCount: u.directCount ?? 0,
    hasChildren: (u.directCount ?? 0) > 0,
  }));
}

/**
 * Get root structure node (for current user or admin-specified user)
 * Returns same shape as children for tree root.
 */
async function getStructureNode(nodeId) {
  const user = await User.findById(nodeId).select(STRUCTURE_SELECT).lean();
  if (!user) return null;

  return {
    _id: user._id,
    memberId: user.memberId,
    name: user.name,
    status: user.status,
    directCount: user.directCount ?? 0,
    hasChildren: (user.directCount ?? 0) > 0,
  };
}

/**
 * Dashboard counts - stored fields + todayJoined and inactive counts
 */
async function getTeamCounts(userId) {
  const user = await User.findById(userId)
    .select("directCount totalDownlineCount")
    .lean();
  if (!user) return null;

  const ancestorId =
    typeof userId === "object" && userId instanceof mongoose.Types.ObjectId
      ? userId
      : new mongoose.Types.ObjectId(String(userId));
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setUTCHours(23, 59, 59, 999);

  const [todayJoinedRes, inactiveRes] = await Promise.all([
    UserHierarchy.aggregate([
      { $match: { ancestor: ancestorId, level: 1 } },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "u" } },
      { $unwind: "$u" },
      { $match: { "u.createdAt": { $gte: startOfToday, $lt: endOfToday } } },
      { $count: "count" },
    ]),
    UserHierarchy.aggregate([
      { $match: { ancestor: ancestorId } },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "u" } },
      { $unwind: "$u" },
      { $match: { "u.status": { $ne: 1 } } },
      { $count: "count" },
    ]),
  ]);

  const todayJoinedCount = (todayJoinedRes[0] && todayJoinedRes[0].count) || 0;
  const inactiveCount = (inactiveRes[0] && inactiveRes[0].count) || 0;

  return {
    directCount: user.directCount ?? 0,
    totalDownlineCount: user.totalDownlineCount ?? 0,
    todayJoinedCount,
    inactiveCount,
  };
}

module.exports = {
  getDirectTeam,
  getAllTeam,
  getTeamByLevel,
  getStructureChildren,
  getStructureNode,
  getTeamCounts,
  isNodeAccessibleByUser,
};
