const mongoose = require("mongoose");
const User = require("../../../models/User");
const response = require("../../../config/response");

/**
 * GET /api/admin/referrals/summary
 * Get referral summary with user counts
 */
const getReferralSummary = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      minCount,
      maxCount,
      fromDate,
      toDate,
      orderBy = "referralCount",
      ascending = "desc",
      referralStatus,
    } = req.query;

    // First, get all users who have referred others (referralCount > 0)
    const referralCounts = await User.aggregate([
      {
        $match: {
          referredBy: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$referredBy",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 0 }, // Only users with referralCount > 0
        },
      },
    ]);

    // Apply min/max count filters
    let filteredCounts = referralCounts;
    if (minCount) {
      filteredCounts = filteredCounts.filter(
        (item) => item.count >= parseInt(minCount),
      );
    }
    if (maxCount) {
      filteredCounts = filteredCounts.filter(
        (item) => item.count <= parseInt(maxCount),
      );
    }

    const referrerIds = filteredCounts.map((item) => item._id);
    const countMap = {};
    filteredCounts.forEach((item) => {
      countMap[item._id.toString()] = item.count;
    });

    if (referrerIds.length === 0) {
      return response.successResponse(res, {
        summary: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
        stats: {
          total: 0,
          active: 0,
          inactive: 0,
          newUsers: 0,
        },
      });
    }

    const query = {
      _id: { $in: referrerIds },
    };

    // Build search query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { memberId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Apply referral status filter (Active / Inactive / New)
    if (referralStatus) {
      if (referralStatus === "active") {
        query.status = 1;
        query.isPaid = true;
      } else if (referralStatus === "new") {
        query.status = 4;
      } else if (referralStatus === "inactive") {
        // Exclude "new" and "active". Remaining treated as inactive.
        query.$and = [
          ...(query.$and || []),
          { status: { $ne: 4 } },
          {
            $or: [
              { status: { $ne: 1 } },
              { isPaid: { $ne: true } },
            ],
          },
        ];
      }
    }

    // Date range filter (based on user creation date)
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Build sort object
    const sortOrder = ascending === "asc" ? 1 : -1;
    const sortField =
      orderBy === "referralCount" ? "referralCount" : orderBy || "createdAt";
    let sortObj = {};

    if (sortField === "referralCount") {
      // For referralCount, we need to sort after mapping
      sortObj = { createdAt: -1 }; // Temporary sort, will sort by count after
    } else {
      sortObj[sortField] = sortOrder;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with referral counts
    const users = await User.find(query)
      .select("name phone email memberId status isPaid createdAt")
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const summary = users.map((user) => ({
      ...user,
      referralCount: countMap[user._id.toString()] || 0,
    }));

    // Sort by referralCount if needed
    if (sortField === "referralCount") {
      summary.sort((a, b) => {
        const aCount = a.referralCount || 0;
        const bCount = b.referralCount || 0;
        return sortOrder === 1 ? aCount - bCount : bCount - aCount;
      });
    }

    // Count total matching users (for cards + pagination)
    const baseTotalQuery = {
      _id: { $in: referrerIds },
    };
    if (search) {
      baseTotalQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { memberId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (fromDate || toDate) {
      baseTotalQuery.createdAt = {};
      if (fromDate) {
        baseTotalQuery.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        baseTotalQuery.createdAt.$lte = endDate;
      }
    }

    const [totalAll, totalActive, totalNew, totalInactive] =
      await Promise.all([
        User.countDocuments(baseTotalQuery),
        User.countDocuments({
          ...baseTotalQuery,
          status: 1,
          isPaid: true,
        }),
        User.countDocuments({
          ...baseTotalQuery,
          status: 4,
        }),
        User.countDocuments({
          ...baseTotalQuery,
          $and: [
            { status: { $ne: 4 } },
            {
              $or: [{ status: { $ne: 1 } }, { isPaid: { $ne: true } }],
            },
          ],
        }),
      ]);

    const total =
      referralStatus === "active"
        ? totalActive
        : referralStatus === "new"
          ? totalNew
          : referralStatus === "inactive"
            ? totalInactive
            : totalAll;

    const stats = {
      total: totalAll,
      active: totalActive,
      inactive: totalInactive,
      newUsers: totalNew,
    };

    return response.successResponse(res, {
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats,
    });
  } catch (err) {
    console.error("Error fetching referral summary:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch referral summary" }],
      "Error fetching referral summary",
      500,
    );
  }
};

/**
 * GET /api/admin/referrals/:userId/referred-users
 * Get list of users referred by a specific user
 */
const getReferredUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid user ID" }],
        "Invalid user ID",
        400,
      );
    }

    const users = await User.find({ referredBy: userId })
      .select("name phone email memberId status isPaid createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return response.successResponse(res, {
      users,
    });
  } catch (err) {
    console.error("Error fetching referred users:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch referred users" }],
      "Error fetching referred users",
      500,
    );
  }
};

module.exports = {
  getReferralSummary,
  getReferredUsers,
};
