const response = require("../../../config/response");
const Country = require("../../../models/Country");
const mongoose = require("mongoose");

const createCountry = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name is required" }],
        "Validation Error",
        400
      );
    }

    const nameUpper = name.trim().toUpperCase();
    const existingCountry = await Country.findOne({
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      isDeleted: false,
    });

    if (existingCountry) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Country with this name already exists" }],
        "Validation Error",
        400
      );
    }

    const country = new Country({
      name: nameUpper,
      status: "active",
      isActive: isActive !== undefined ? (isActive === "true" || isActive === true) : true,
    });

    await country.save();

    return response.successResponse(
      res,
      country,
      "Country created successfully"
    );
  } catch (error) {
    console.error("Error creating country:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Country with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create country",
      500
    );
  }
};

const getCountries = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      search = "",
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    const [data, totalRecord] = await Promise.all([
      Country.find(query)
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Country.countDocuments(query),
    ]);

    return response.successResponse(
      res,
      [
        {
          metadata: [
            {
              totalRecord,
              current_page: parseInt(page),
              per_page: pageSize,
            },
          ],
          data,
        },
      ],
      "Countries fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching countries:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch countries",
      500
    );
  }
};

const getCountryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid country ID",
        400
      );
    }

    const country = await Country.findOne({
      _id: id,
      isDeleted: false,
    }).lean();

    if (!country) {
      return response.errorResponse(
        res,
        {},
        "Country not found",
        404
      );
    }

    return response.successResponse(
      res,
      country,
      "Country fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching country:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch country",
      500
    );
  }
};

const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid country ID",
        400
      );
    }

    const country = await Country.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!country) {
      return response.errorResponse(
        res,
        {},
        "Country not found",
        404
      );
    }

    // Country name is immutable, only isActive can be updated
    if (isActive !== undefined) {
      country.isActive = isActive === "true" || isActive === true;
    }

    await country.save();

    return response.successResponse(
      res,
      country,
      "Country updated successfully"
    );
  } catch (error) {
    console.error("Error updating country:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update country",
      500
    );
  }
};

const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid country ID",
        400
      );
    }

    const country = await Country.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!country) {
      return response.errorResponse(
        res,
        {},
        "Country not found",
        404
      );
    }

    country.isDeleted = true;
    country.isActive = false;
    await country.save();

    return response.successResponse(
      res,
      {},
      "Country deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting country:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete country",
      500
    );
  }
};

const hardDeleteCountry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid country ID",
        400
      );
    }

    const country = await Country.findOne({
      _id: id,
    });

    if (!country) {
      return response.errorResponse(
        res,
        {},
        "Country not found",
        404
      );
    }

    await Country.deleteOne({ _id: id });

    return response.successResponse(
      res,
      {},
      "Country permanently deleted successfully"
    );
  } catch (error) {
    console.error("Error hard deleting country:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete country",
      500
    );
  }
};

const toggleCountryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid country ID",
        400
      );
    }

    const country = await Country.findOne({
      _id: id,
    });

    if (!country) {
      return response.errorResponse(
        res,
        {},
        "Country not found",
        404
      );
    }

    country.isActive = !country.isActive;
    await country.save();

    return response.successResponse(
      res,
      country,
      "Country status updated successfully"
    );
  } catch (error) {
    console.error("Error toggling country status:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to toggle country status",
      500
    );
  }
};

const restoreCountry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid country ID",
        400
      );
    }

    const country = await Country.findOne({
      _id: id,
      isDeleted: true,
    });

    if (!country) {
      return response.errorResponse(
        res,
        {},
        "Country not found or not deleted",
        404
      );
    }

    country.isDeleted = false;
    country.isActive = true;
    await country.save();

    return response.successResponse(
      res,
      country,
      "Country restored successfully"
    );
  } catch (error) {
    console.error("Error restoring country:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to restore country",
      500
    );
  }
};

const approveCountry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid country ID", 400);
    }

    const country = await Country.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!country) {
      return response.errorResponse(res, {}, "Country not found", 404);
    }

    if (country.status === "active") {
      return response.errorResponse(res, {}, "Country is already approved", 400);
    }

    country.status = "active";
    country.isActive = true;
    await country.save();

    return response.successResponse(res, country, "Country approved successfully");
  } catch (error) {
    console.error("Error approving country:", error);
    return response.errorResponse(res, {}, "Failed to approve country", 500);
  }
};

const rejectCountry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid country ID", 400);
    }

    const country = await Country.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!country) {
      return response.errorResponse(res, {}, "Country not found", 404);
    }

    if (country.status === "rejected") {
      return response.errorResponse(res, {}, "Country is already rejected", 400);
    }

    country.status = "rejected";
    country.isActive = false;
    await country.save();

    return response.successResponse(res, country, "Country rejected successfully");
  } catch (error) {
    console.error("Error rejecting country:", error);
    return response.errorResponse(res, {}, "Failed to reject country", 500);
  }
};

module.exports = {
  createCountry,
  getCountries,
  getCountryById,
  updateCountry,
  deleteCountry,
  hardDeleteCountry,
  toggleCountryStatus,
  restoreCountry,
  approveCountry,
  rejectCountry,
};
