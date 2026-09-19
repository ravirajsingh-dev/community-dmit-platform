const response = require("../../../config/response");
const mongoose = require("mongoose");
const User = require("../../../models/User");
const UserDetails = require("../../../models/UserDetails");
const Country = require("../../../models/Country");
const State = require("../../../models/State");
const District = require("../../../models/District");
const Village = require("../../../models/Village");
const Community = require("../../../models/Community");
const Vansh = require("../../../models/Vansh");
const Kul = require("../../../models/Kul");
const Khamp = require("../../../models/Khamp");
const Gotra = require("../../../models/Gotra");
const { processSearchFilters } = require("../../../utils/searchHelper");

/**
 * GET /api/users/search-members
 * Get members list with pagination, search, and filters (for client side)
 * Supports filtering on both User and UserDetails fields
 */
const searchMembers = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
    } = req.query || req.body;

    let filters = [];
    let query = {};

    if (req.query.limit) {
      if (typeof req.query.filters === "string") {
        filters = req.query.filters.split(",");
      } else if (Array.isArray(req.query.filters)) {
        filters = req.query.filters;
      }

      if (typeof req.query.query === "string") {
        try {
          query = JSON.parse(req.query.query);
        } catch (e) {
          query = {};
        }
      } else if (typeof req.query.query === "object") {
        query = req.query.query;
      } else {
        query = {};
      }
    } else {
      if (typeof req.body.filters === "string") {
        filters = req.body.filters.split(",");
      } else if (Array.isArray(req.body.filters)) {
        filters = req.body.filters;
      }

      query = typeof req.body.query === "object" ? req.body.query : {};
    }

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    // Separate User fields from UserDetails fields
    const userFields = ["memberId", "name", "phone", "email"];
    const userDetailsFields = [
      "userDetails.countryId",
      "userDetails.stateId",
      "userDetails.districtId",
      "userDetails.villageId",
      "userDetails.community",
      "userDetails.vansh",
      "userDetails.kul",
      "userDetails.khamp",
      "userDetails.gotra",
      "userDetails.maritalStatus",
      "userDetails.education",
      "userDetails.bloodGroup",
      "userDetails.fatherName",
      "userDetails.motherName",
    ];

    // Build match query for User collection
    const userFilters = filters.filter((f) =>
      userFields.some((uf) => f === uf || f === "search"),
    );
    const userQuery = {};
    Object.keys(query).forEach((key) => {
      if (key === "search" || userFields.includes(key)) {
        userQuery[key] = query[key];
      }
    });

    const userMatchQuery = processSearchFilters(userFilters, userQuery);

    // ALWAYS include status: 1 (Active) filter at the beginning
    // MongoDB will AND status: 1 with any filters in userMatchQuery
    // If userMatchQuery is empty {}, result is { status: 1 }
    // If userMatchQuery has $or, result is { status: 1, $or: [...] } which MongoDB ANDs correctly
    const baseMatchQuery = {
      status: 1, // Only Active users - ALWAYS applied
      ...userMatchQuery, // Merge any user filters (memberId, name, phone, email search)
    };

    // Build match query for UserDetails (after lookup)
    const userDetailsFilters = filters.filter((f) =>
      userDetailsFields.includes(f),
    );
    const userDetailsQuery = {};
    userDetailsFields.forEach((field) => {
      if (query[field]) {
        userDetailsQuery[field] = query[field];
      }
    });

    // Process UserDetails filters
    const userDetailsMatchQuery = {};
    if (Object.keys(userDetailsQuery).length > 0) {
      const andFilter = [];
      Object.keys(userDetailsQuery).forEach((key) => {
        const filter = userDetailsQuery[key];
        const { value, type } = filter;
        if (!value || !type) return;

        // Remove "userDetails." prefix for matching
        const fieldName = key.replace("userDetails.", "");

        switch (type) {
          case "id":
            if (mongoose.Types.ObjectId.isValid(value)) {
              andFilter.push({
                [`userDetails.${fieldName}`]: new mongoose.Types.ObjectId(
                  value,
                ),
              });
            }
            break;
          case "String":
            if (fieldName === "fatherName" || fieldName === "motherName") {
              // For text search on fatherName/motherName, use regex
              andFilter.push({
                [`userDetails.${fieldName}`]: {
                  $regex: new RegExp(value, "i"),
                },
              });
            } else {
              // For exact match (maritalStatus, bloodGroup)
              andFilter.push({
                [`userDetails.${fieldName}`]: value.toString(),
              });
            }
            break;
          default:
            break;
        }
      });

      if (andFilter.length > 0) {
        userDetailsMatchQuery.$and = andFilter;
      }
    }

    // Build aggregation pipeline
    // Order MUST be:
    // 1. $match → status: 1 + user filters (if any)
    // 2. $lookup → userDetails
    // 3. $unwind → userDetails
    // 4. dynamic $match → userDetails filters (only if present)
    // 5. $project
    // 6. $facet (with $sort, $skip, $limit inside data facet)
    const pipeline = [
      // Step 1: Match on User collection - ALWAYS include status: 1
      { $match: baseMatchQuery },
      // Step 2: Lookup UserDetails
      {
        $lookup: {
          from: "user_details",
          localField: "_id",
          foreignField: "userId",
          as: "userDetails",
        },
      },
      // Step 3: Unwind UserDetails
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true, // Include users without UserDetails (userDetails will be null)
        },
      },
    ];

    // Step 4: Add UserDetails match if there are filters
    if (Object.keys(userDetailsMatchQuery).length > 0) {
      pipeline.push({ $match: userDetailsMatchQuery });
    }

    // Step 5 & 6: Add projection and facet with sorting/pagination
    pipeline.push(
      {
        $project: {
          _id: 1,
          memberId: 1,
          name: 1,
          phone: 1,
          email: 1,
          createdAt: 1,
          updatedAt: 1,
          userDetails: {
            fatherName: "$userDetails.fatherName",
            motherName: "$userDetails.motherName",
            height: "$userDetails.height",
            weight: "$userDetails.weight",
            countryId: "$userDetails.countryId",
            stateId: "$userDetails.stateId",
            districtId: "$userDetails.districtId",
            villageId: "$userDetails.villageId",
            community: "$userDetails.community",
            vansh: "$userDetails.vansh",
            kul: "$userDetails.kul",
            khamp: "$userDetails.khamp",
            gotra: "$userDetails.gotra",
            maritalStatus: "$userDetails.maritalStatus",
            bloodGroup: "$userDetails.bloodGroup",
          },
        },
      },
      {
        $facet: {
          metadata: [
            { $count: "totalRecord" },
            {
              $addFields: {
                current_page: parseInt(page),
                per_page: pageSize,
              },
            },
          ],
          data: [
            { $sort: { [orderBy]: sortOrder } },
            { $skip: skip },
            { $limit: pageSize },
          ],
        },
      },
    );

    const usersList = await User.aggregate(pipeline).collation({
      locale: "en",
      strength: 1,
    });

    const [result] = usersList;

    if (result?.metadata?.length > 0) {
      return response.successResponse(res, usersList, "Members List");
    } else {
      return response.successResponse(
        res,
        [
          {
            metadata: [
              { totalRecord: 0, current_page: page, per_page: pageSize },
            ],
            data: [],
          },
        ],
        "No Members Found",
      );
    }
  } catch (err) {
    console.error("Error searching members:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/users/resolve-member
 * Resolve member by memberId (for transfer UI lookup)
 * Query: memberId
 * @access Private
 */
const resolveMember = async (req, res) => {
  try {
    const { memberId } = req.query;
    const val = memberId != null ? String(memberId).trim() : "";
    if (!val) {
      return response.errorResponse(
        res,
        { msg: "memberId is required" },
        "Validation Error",
        400
      );
    }

    const userQuery = mongoose.Types.ObjectId.isValid(val)
      ? { $or: [{ memberId: val }, { _id: new mongoose.Types.ObjectId(val) }] }
      : { memberId: val };

    const user = await User.findOne(userQuery)
      .select("_id name memberId status")
      .lean();

    if (!user) {
      return response.successResponse(res, { user: null }, "Member not found");
    }

    const currentUserId = req.user?.id;
    if (currentUserId && user._id.toString() === currentUserId.toString()) {
      return response.errorResponse(
        res,
        [{ path: "memberId", msg: "Cannot transfer to your own account" }],
        "Validation Error",
        400
      );
    }

    // Status 1 = active, Status 4 = new user (can receive registration fee to activate)
    if (![1, 4].includes(user.status)) {
      return response.successResponse(res, { user: null }, "Member is inactive");
    }

    return response.successResponse(res, {
      user: { _id: user._id, name: user.name, memberId: user.memberId },
    });
  } catch (err) {
    console.error("Resolve member error:", err);
    return response.errorResponse(res, {}, "Resolve failed", 500);
  }
};

/**
 * GET /api/users/member-details/:user_id
 * Get member details by ID (read-only, for viewing other users)
 * @access Private
 */
const getMemberDetailsById = async (req, res) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid user ID" },
        "Invalid user ID",
        400,
      );
    }

    // Get user data (exclude sensitive fields)
    const user = await User.findById(userId)
      .select("-password -pwdRef -passwordCopy")
      .lean();

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    // Only return active users
    if (user.status !== 1) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    // Get user details
    const userDetails = await UserDetails.findOne({ userId }).lean();

    // Populate labels for location and master data
    if (userDetails) {
      // Populate country label
      if (userDetails.countryId) {
        const country = await Country.findById(userDetails.countryId)
          .select("name status")
          .lean();
        if (country) {
          userDetails.countryLabel = country.name;
          userDetails.countryStatus = country.status;
        }
      }

      // Populate state label
      if (userDetails.stateId) {
        const state = await State.findById(userDetails.stateId)
          .select("name status")
          .lean();
        if (state) {
          userDetails.stateLabel = state.name;
          userDetails.stateStatus = state.status;
        }
      }

      // Populate district label
      if (userDetails.districtId) {
        const district = await District.findById(userDetails.districtId)
          .select("name status")
          .lean();
        if (district) {
          userDetails.districtLabel = district.name;
          userDetails.districtStatus = district.status;
        }
      }

      // Populate village label
      if (userDetails.villageId) {
        const village = await Village.findById(userDetails.villageId)
          .select("name status")
          .lean();
        if (village) {
          userDetails.villageLabel = village.name;
          userDetails.villageStatus = village.status;
        }
      }

      // Populate community label
      if (userDetails.community) {
        const community = await Community.findById(userDetails.community)
          .select("name status")
          .lean();
        if (community) {
          userDetails.communityLabel = community.name;
          userDetails.communityStatus = community.status;
        }
      }

      // Populate vansh label
      if (userDetails.vansh) {
        const vansh = await Vansh.findById(userDetails.vansh)
          .select("name status")
          .lean();
        if (vansh) {
          userDetails.vanshLabel = vansh.name;
          userDetails.vanshStatus = vansh.status;
        }
      }

      // Populate kul label
      if (userDetails.kul) {
        const kul = await Kul.findById(userDetails.kul)
          .select("name status")
          .lean();
        if (kul) {
          userDetails.kulLabel = kul.name;
          userDetails.kulStatus = kul.status;
        }
      }

      // Populate khamp label
      if (userDetails.khamp) {
        const khamp = await Khamp.findById(userDetails.khamp)
          .select("name status")
          .lean();
        if (khamp) {
          userDetails.khampLabel = khamp.name;
          userDetails.khampStatus = khamp.status;
        }
      }

      // Populate gotra label (hierarchy: Community → Vansh → Kul → Khamp → Gotra)
      if (userDetails.gotra) {
        const gotra = await Gotra.findById(userDetails.gotra)
          .select("name status")
          .lean();
        if (gotra) {
          userDetails.gotraLabel = gotra.name;
          userDetails.gotraStatus = gotra.status;
        }
      }
    }

    // Combine user and userDetails
    const userData = {
      ...user,
      userDetails: userDetails || null,
    };

    return response.successResponse(
      res,
      userData,
      "Member details retrieved successfully",
    );
  } catch (err) {
    console.error("Error in getMemberDetailsById:", err);
    if (err.kind === "ObjectId") {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  searchMembers,
  getMemberDetailsById,
  resolveMember,
};
