const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const SubAdmin = require("../../../models/SubAdmin");
const Admin = require("../../../models/Admin");
const response = require("../../../config/response");
const { isAdminIDValid } = require("../../../utils/helper");
const { processSearchFilters } = require("../../../utils/searchHelper");
const { decryptPassword } = require("../../../utils/passwordEncryption");

/**
 * Get list of all sub-admins with pagination, search, and filters
 */
module.exports.getSubAdminsList = async (req, res) => {
  try {
    // Only full admins can view sub-admins list
    if (!req.isAdmin) {
      return response.errorResponse(
        res,
        { msg: "Only full admins can view sub-admins list." },
        "Insufficient Permissions",
        403,
      );
    }

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

    const matchQuery = processSearchFilters(filters, query);

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "admins",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByInfo",
        },
      },
      {
        $unwind: {
          path: "$createdByInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          admin_id: 1,
          role: 1,
          isActive: 1,
          status: 1,
          permissions: 1,
          admPwdRef: 1,
          txnRef: 1,
          last_login: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: {
            name: "$createdByInfo.name",
            admin_id: "$createdByInfo.admin_id",
          },
        },
      },
      {
        $sort: { [orderBy]: sortOrder },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: pageSize }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await SubAdmin.aggregate(pipeline);

    const subAdmins = result[0].data || [];
    // Decrypt password fields and expose as passCopy/txnPassCopy for frontend compatibility
    subAdmins.forEach((subAdmin) => {
      if (subAdmin.admPwdRef) {
        subAdmin.passCopy = decryptPassword(subAdmin.admPwdRef);
        delete subAdmin.admPwdRef;
      }
      if (subAdmin.txnRef) {
        subAdmin.txnPassCopy = decryptPassword(subAdmin.txnRef);
        delete subAdmin.txnRef;
      }
    });
    const totalCount = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return response.successResponse(
      res,
      {
        subAdmins,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          pageSize,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Sub-admins list retrieved successfully",
    );
  } catch (err) {
    console.error("Get sub-admins list error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * Get sub-admin by ID
 */
module.exports.getSubAdminById = async (req, res) => {
  try {
    // Only full admins can view sub-admin details
    if (!req.isAdmin) {
      return response.errorResponse(
        res,
        { msg: "Only full admins can view sub-admin details." },
        "Insufficient Permissions",
        403,
      );
    }

    const { id } = req.params;

    const subAdmin = await SubAdmin.findById(id)
      .select("-password -txn_password")
      .populate("createdBy", "name admin_id")
      .lean();

    if (!subAdmin) {
      return response.errorResponse(
        res,
        { msg: "Sub-admin not found." },
        "Sub-admin not found",
        404,
      );
    }

    // Decrypt password fields and expose as passCopy/txnPassCopy for frontend compatibility
    if (subAdmin.admPwdRef) {
      subAdmin.passCopy = decryptPassword(subAdmin.admPwdRef);
      delete subAdmin.admPwdRef;
    }
    if (subAdmin.txnRef) {
      subAdmin.txnPassCopy = decryptPassword(subAdmin.txnRef);
      delete subAdmin.txnRef;
    }

    return response.successResponse(
      res,
      subAdmin,
      "Sub-admin details retrieved successfully",
    );
  } catch (err) {
    console.error("Get sub-admin by ID error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * Create new sub-admin
 */
module.exports.createSubAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    // Only full admins can create sub-admins
    if (!req.isAdmin) {
      return response.errorResponse(
        res,
        { msg: "Only full admins can create sub-admins." },
        "Insufficient Permissions",
        403,
      );
    }

    const {
      name,
      email,
      admin_id,
      password,
      txn_password,
      role,
      permissions,
      isActive,
    } = req.body;

    // Validate email is required
    if (!email || !email.trim()) {
      return response.errorResponse(
        res,
        { msg: "Email is required." },
        "Validation Error",
        400,
      );
    }

    // Convert admin_id to uppercase for storage and validation
    const adminIdUpper = admin_id.trim().toUpperCase();

    // Validate admin_id format
    if (!isAdminIDValid(adminIdUpper)) {
      return response.errorResponse(
        res,
        {
          msg: "Invalid Admin ID format. Admin ID must be 8-15 alphanumeric characters.",
        },
        "Validation Error",
        400,
      );
    }

    // Check if admin_id already exists in Admin or SubAdmin (case-insensitive, but we store uppercase)
    const existingAdmin = await Admin.findOne({
      admin_id: { $regex: new RegExp("^" + adminIdUpper + "$", "i") },
    });

    if (existingAdmin) {
      return response.errorResponse(
        res,
        { msg: "Admin ID already exists." },
        "Admin ID already exists",
        400,
      );
    }

    const existingSubAdmin = await SubAdmin.findOne({
      admin_id: { $regex: new RegExp("^" + adminIdUpper + "$", "i") },
    });

    if (existingSubAdmin) {
      return response.errorResponse(
        res,
        { msg: "Admin ID already exists." },
        "Admin ID already exists",
        400,
      );
    }

    // Check if email already exists (case-insensitive)
    const existingEmail = await SubAdmin.findOne({
      email: { $regex: new RegExp("^" + email.trim() + "$", "i") },
    });

    if (existingEmail) {
      return response.errorResponse(
        res,
        { msg: "Email already exists." },
        "Email already exists",
        400,
      );
    }

    // Also check email in Admin collection
    const existingEmailInAdmin = await Admin.findOne({
      email: { $regex: new RegExp("^" + email.trim() + "$", "i") },
    });

    if (existingEmailInAdmin) {
      return response.errorResponse(
        res,
        { msg: "Email already exists." },
        "Email already exists",
        400,
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Hash transaction password if provided
    let hashedTxnPassword = null;
    let txnPassCopyPlain = null;
    if (txn_password) {
      hashedTxnPassword = await bcrypt.hash(txn_password, salt);
      txnPassCopyPlain = txn_password;
    }

    // Create sub-admin (save admin_id in uppercase)
    const subAdminData = {
      name: name.trim(),
      email: email.trim(),
      admin_id: adminIdUpper, // Save in uppercase
      password: hashedPassword,
      admPwdRef: password, // Will be encrypted by pre-save hook
      role: role || "sub_admin",
      permissions: permissions || {},
      isActive: isActive !== undefined ? isActive : true,
      status: isActive !== undefined && !isActive ? 2 : 1,
      uuid: randomUUID(),
      createdBy: req.user.id,
    };

    // Add transaction password if provided
    if (hashedTxnPassword) {
      subAdminData.txn_password = hashedTxnPassword;
      subAdminData.txnRef = txnPassCopyPlain; // Will be encrypted by pre-save hook
    }

    const subAdmin = new SubAdmin(subAdminData);
    await subAdmin.save();

    // Return sub-admin without sensitive data (passCopy is included for admin view in list endpoint)
    const sanitizedSubAdmin = subAdmin.toObject();
    delete sanitizedSubAdmin.password;

    return response.successResponse(
      res,
      sanitizedSubAdmin,
      "Sub-admin created successfully",
    );
  } catch (err) {
    console.error("Create sub-admin error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return response.errorResponse(
        res,
        { msg: `${field} already exists.` },
        "Duplicate Entry",
        400,
      );
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * Update sub-admin by ID
 */
module.exports.updateSubAdminById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    // Only full admins can update sub-admins
    if (!req.isAdmin) {
      return response.errorResponse(
        res,
        { msg: "Only full admins can update sub-admins." },
        "Insufficient Permissions",
        403,
      );
    }

    const { id } = req.params;
    const {
      name,
      email,
      admin_id,
      password,
      txn_password,
      role,
      permissions,
      isActive,
    } = req.body;

    const subAdmin = await SubAdmin.findById(id);

    if (!subAdmin) {
      return response.errorResponse(
        res,
        { msg: "Sub-admin not found." },
        "Sub-admin not found",
        404,
      );
    }

    // Update fields
    const updateData = {};

    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) {
      updateData.isActive = isActive;
      updateData.status = isActive ? 1 : 2;
    }

    // Check admin_id uniqueness if being updated
    if (admin_id && admin_id !== subAdmin.admin_id) {
      // Convert admin_id to uppercase for storage and validation
      const adminIdUpper = admin_id.trim().toUpperCase();

      if (!isAdminIDValid(adminIdUpper)) {
        return response.errorResponse(
          res,
          {
            msg: "Invalid Admin ID format. Admin ID must be 8-15 alphanumeric characters.",
          },
          "Validation Error",
          400,
        );
      }

      const existingAdmin = await Admin.findOne({
        admin_id: { $regex: new RegExp("^" + adminIdUpper + "$", "i") },
      });

      if (existingAdmin) {
        return response.errorResponse(
          res,
          { msg: "Admin ID already exists." },
          "Admin ID already exists",
          400,
        );
      }

      const existingSubAdmin = await SubAdmin.findOne({
        admin_id: { $regex: new RegExp("^" + adminIdUpper + "$", "i") },
        _id: { $ne: id },
      });

      if (existingSubAdmin) {
        return response.errorResponse(
          res,
          { msg: "Admin ID already exists." },
          "Admin ID already exists",
          400,
        );
      }

      updateData.admin_id = adminIdUpper; // Save in uppercase
    }

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
      updateData.admPwdRef = password; // Will be encrypted by pre-update hook
      updateData.passwordChangedAt = new Date();
    }

    // Update transaction password if provided
    if (txn_password) {
      const salt = await bcrypt.genSalt(10);
      updateData.txn_password = await bcrypt.hash(txn_password, salt);
      updateData.txnRef = txn_password; // Will be encrypted by pre-update hook
    }

    // Update sub-admin
    const updatedSubAdmin = await SubAdmin.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    })
      .select("-password -txn_password")
      .lean();

    return response.successResponse(
      res,
      updatedSubAdmin,
      "Sub-admin updated successfully",
    );
  } catch (err) {
    console.error("Update sub-admin error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return response.errorResponse(
        res,
        { msg: `${field} already exists.` },
        "Duplicate Entry",
        400,
      );
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * Toggle sub-admin active status
 */
module.exports.toggleSubAdminStatus = async (req, res) => {
  try {
    // Only full admins can toggle sub-admin status
    if (!req.isAdmin) {
      return response.errorResponse(
        res,
        { msg: "Only full admins can toggle sub-admin status." },
        "Insufficient Permissions",
        403,
      );
    }

    const { id } = req.params;

    const subAdmin = await SubAdmin.findById(id);

    if (!subAdmin) {
      return response.errorResponse(
        res,
        { msg: "Sub-admin not found." },
        "Sub-admin not found",
        404,
      );
    }

    // Toggle status
    const newStatus = !subAdmin.isActive;
    subAdmin.isActive = newStatus;
    subAdmin.status = newStatus ? 1 : 2;
    await subAdmin.save();

    const sanitizedSubAdmin = subAdmin.toObject();
    delete sanitizedSubAdmin.password;
    delete sanitizedSubAdmin.admPwdRef;
    delete sanitizedSubAdmin.txnRef;

    return response.successResponse(
      res,
      sanitizedSubAdmin,
      `Sub-admin ${newStatus ? "activated" : "deactivated"} successfully`,
    );
  } catch (err) {
    console.error("Toggle sub-admin status error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * Delete sub-admin by ID
 */
module.exports.deleteSubAdminById = async (req, res) => {
  try {
    // Only full admins can delete sub-admins
    if (!req.isAdmin) {
      return response.errorResponse(
        res,
        { msg: "Only full admins can delete sub-admins." },
        "Insufficient Permissions",
        403,
      );
    }

    const { id } = req.params;

    const subAdmin = await SubAdmin.findByIdAndDelete(id);

    if (!subAdmin) {
      return response.errorResponse(
        res,
        { msg: "Sub-admin not found." },
        "Sub-admin not found",
        404,
      );
    }

    return response.successResponse(res, {}, "Sub-admin deleted successfully");
  } catch (err) {
    console.error("Delete sub-admin error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};
