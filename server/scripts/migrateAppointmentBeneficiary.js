/**
 * Migration: Phase 3 - Add beneficiaryRef to existing appointments
 * Run once: node server/scripts/migrateAppointmentBeneficiary.js
 * Backfills beneficiaryRef = "SELF:"+requesterId for docs where beneficiaryRef is null
 * Drops old 3-field unique index if exists
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGO_URI or MONGODB_URI required");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const col = db.collection("appointments");

  const needUpdate = await col.countDocuments({
    $or: [{ beneficiaryRef: null }, { beneficiaryRef: { $exists: false } }],
  });
  console.log(`Appointments to update (add beneficiaryRef): ${needUpdate}`);

  if (needUpdate > 0) {
    const cursor = col.find({
      $or: [{ beneficiaryRef: null }, { beneficiaryRef: { $exists: false } }],
    });
    let updated = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const ref = `SELF:${doc.requesterId}`;
      await col.updateOne({ _id: doc._id }, { $set: { beneficiaryRef: ref } });
      updated++;
      if (updated % 100 === 0) console.log(`  Updated ${updated}...`);
    }
    console.log(`Updated ${updated} appointments`);
  }

  try {
    await col.dropIndex("requesterId_1_designationCode_1_dateKey_1");
    console.log("Dropped old unique index requesterId_1_designationCode_1_dateKey_1");
  } catch (e) {
    if (e.codeName === "IndexNotFound") {
      console.log("Old index already removed");
    } else {
      console.warn("Could not drop old index:", e.message);
    }
  }

  await mongoose.disconnect();
  console.log("Migration done");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
