const response = require("../../../config/response");
const Country = require("../../../models/Country");
const State = require("../../../models/State");
const District = require("../../../models/District");
const Village = require("../../../models/Village");
const mongoose = require("mongoose");

/**
 * Bulk-approve all pending location entities without transaction password.
 * This is intentionally separate from the existing per-item approve flow.
 */
async function approveAllPendingLocationsNoTxn(req, res) {
  try {
    const [
      countriesResult,
      statesResult,
      districtsResult,
      villagesResult,
    ] = await Promise.all([
      Country.updateMany(
        { status: "pending", isDeleted: false },
        { $set: { status: "active", isActive: true } },
      ),
      State.updateMany(
        { status: "pending", isDeleted: false },
        { $set: { status: "active", isActive: true } },
      ),
      District.updateMany(
        { status: "pending", isDeleted: false },
        { $set: { status: "active", isActive: true } },
      ),
      Village.updateMany(
        { status: "pending", isDeleted: false },
        { $set: { status: "active", isActive: true } },
      ),
    ]);

    return response.successResponse(
      res,
      {
        countriesUpdated: countriesResult?.modifiedCount ?? countriesResult?.n ?? 0,
        statesUpdated: statesResult?.modifiedCount ?? statesResult?.n ?? 0,
        districtsUpdated:
          districtsResult?.modifiedCount ?? districtsResult?.n ?? 0,
        villagesUpdated:
          villagesResult?.modifiedCount ?? villagesResult?.n ?? 0,
      },
      "All pending locations approved"
    );
  } catch (err) {
    console.error("approveAllPendingLocationsNoTxn error:", err);
    return response.errorResponse(
      res,
      [{ msg: err?.message || "Failed to approve pending locations" }],
      "Failed to approve pending locations",
      500
    );
  }
}

/**
 * GET pending location approval rows (flattened to village-path rows).
 * A row is included if any of: country/state/district/village has status="pending".
 *
 * Returned rows:
 * {
 *  countryId,countryName,countryStatus,
 *  stateId,stateName,stateStatus,
 *  districtId,districtName,districtStatus,
 *  villageId,villageName,villageStatus
 * }
 */
async function getPendingLocationApprovalRows(req, res) {
  try {
    const rows = await Village.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: "districts",
          localField: "districtId",
          foreignField: "_id",
          as: "district",
        },
      },
      { $unwind: "$district" },
      {
        $lookup: {
          from: "states",
          localField: "district.stateId",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $lookup: {
          from: "countries",
          localField: "state.countryId",
          foreignField: "_id",
          as: "country",
        },
      },
      { $unwind: "$country" },
      {
        $match: {
          "district.isDeleted": false,
          "state.isDeleted": false,
          "country.isDeleted": false,
          $or: [
            { status: "pending" },
            { "district.status": "pending" },
            { "state.status": "pending" },
            { "country.status": "pending" },
          ],
        },
      },
      {
        $project: {
          countryId: "$country._id",
          countryName: "$country.name",
          countryStatus: "$country.status",
          stateId: "$state._id",
          stateName: "$state.name",
          stateStatus: "$state.status",
          districtId: "$district._id",
          districtName: "$district.name",
          districtStatus: "$district.status",
          villageId: "$_id",
          villageName: "$name",
          villageStatus: "$status",
        },
      },
      { $sort: { countryName: 1, stateName: 1, districtName: 1, villageName: 1 } },
    ]);

    return response.successResponse(
      res,
      { rows },
      "Pending location approval rows retrieved"
    );
  } catch (err) {
    console.error("getPendingLocationApprovalRows error:", err);
    return response.errorResponse(
      res,
      [{ msg: err?.message || "Failed to fetch pending approvals" }],
      "Failed to fetch pending approvals",
      500
    );
  }
}

async function approveCountryNoTxn(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid country ID", 400);
    }

    const country = await Country.findOne({ _id: id, isDeleted: false });
    if (!country) {
      return response.errorResponse(res, {}, "Country not found", 404);
    }

    if (country.status !== "pending") {
      return response.successResponse(res, country, "Country not pending; no change");
    }

    country.status = "active";
    country.isActive = true;
    await country.save();

    return response.successResponse(res, country, "Country approved successfully");
  } catch (err) {
    console.error("approveCountryNoTxn error:", err);
    return response.errorResponse(
      res,
      [{ msg: err?.message || "Failed to approve country" }],
      "Failed to approve country",
      500
    );
  }
}

async function approveStateNoTxn(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid state ID", 400);
    }

    const state = await State.findOne({ _id: id, isDeleted: false });
    if (!state) {
      return response.errorResponse(res, {}, "State not found", 404);
    }

    if (state.status !== "pending") {
      return response.successResponse(res, state, "State not pending; no change");
    }

    state.status = "active";
    state.isActive = true;
    await state.save();

    return response.successResponse(res, state, "State approved successfully");
  } catch (err) {
    console.error("approveStateNoTxn error:", err);
    return response.errorResponse(
      res,
      [{ msg: err?.message || "Failed to approve state" }],
      "Failed to approve state",
      500
    );
  }
}

async function approveDistrictNoTxn(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid district ID", 400);
    }

    const district = await District.findOne({ _id: id, isDeleted: false });
    if (!district) {
      return response.errorResponse(res, {}, "District not found", 404);
    }

    if (district.status !== "pending") {
      return response.successResponse(res, district, "District not pending; no change");
    }

    district.status = "active";
    district.isActive = true;
    await district.save();

    return response.successResponse(res, district, "District approved successfully");
  } catch (err) {
    console.error("approveDistrictNoTxn error:", err);
    return response.errorResponse(
      res,
      [{ msg: err?.message || "Failed to approve district" }],
      "Failed to approve district",
      500
    );
  }
}

async function approveVillageNoTxn(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid village ID", 400);
    }

    const village = await Village.findOne({ _id: id, isDeleted: false });
    if (!village) {
      return response.errorResponse(res, {}, "Village not found", 404);
    }

    if (village.status !== "pending") {
      return response.successResponse(res, village, "Village not pending; no change");
    }

    village.status = "active";
    village.isActive = true;
    await village.save();

    return response.successResponse(res, village, "Village approved successfully");
  } catch (err) {
    console.error("approveVillageNoTxn error:", err);
    return response.errorResponse(
      res,
      [{ msg: err?.message || "Failed to approve village" }],
      "Failed to approve village",
      500
    );
  }
}

/**
 * Approve row (country/state/district/village) without txn password.
 * Approves only those nodes which are currently status="pending".
 */
async function approvePendingLocationRowNoTxn(req, res) {
  try {
    const { countryId, stateId, districtId, villageId } = req.body || {};
    const ids = { countryId, stateId, districtId, villageId };

    const invalid = Object.values(ids).some(
      (v) => v && !mongoose.Types.ObjectId.isValid(v),
    );
    if (invalid) {
      return response.errorResponse(res, {}, "Invalid ids provided", 400);
    }

    const updates = { country: false, state: false, district: false, village: false };

    const [country, state, district, village] = await Promise.all([
      countryId ? Country.findById(countryId).lean() : null,
      stateId ? State.findById(stateId).lean() : null,
      districtId ? District.findById(districtId).lean() : null,
      villageId ? Village.findById(villageId).lean() : null,
    ]);

    if (country && country.status === "pending") updates.country = true;
    if (state && state.status === "pending") updates.state = true;
    if (district && district.status === "pending") updates.district = true;
    if (village && village.status === "pending") updates.village = true;

    await Promise.all([
      updates.country
        ? Country.updateOne(
            { _id: countryId, status: "pending" },
            { $set: { status: "active", isActive: true } },
          )
        : Promise.resolve(),
      updates.state
        ? State.updateOne(
            { _id: stateId, status: "pending" },
            { $set: { status: "active", isActive: true } },
          )
        : Promise.resolve(),
      updates.district
        ? District.updateOne(
            { _id: districtId, status: "pending" },
            { $set: { status: "active", isActive: true } },
          )
        : Promise.resolve(),
      updates.village
        ? Village.updateOne(
            { _id: villageId, status: "pending" },
            { $set: { status: "active", isActive: true } },
          )
        : Promise.resolve(),
    ]);

    return response.successResponse(
      res,
      updates,
      "Pending row approved successfully"
    );
  } catch (err) {
    console.error("approvePendingLocationRowNoTxn error:", err);
    return response.errorResponse(
      res,
      [{ msg: err?.message || "Failed to approve pending row" }],
      "Failed to approve pending row",
      500
    );
  }
}

module.exports = {
  approveAllPendingLocationsNoTxn,
  getPendingLocationApprovalRows,
  approveCountryNoTxn,
  approveStateNoTxn,
  approveDistrictNoTxn,
  approveVillageNoTxn,
  approvePendingLocationRowNoTxn,
};

