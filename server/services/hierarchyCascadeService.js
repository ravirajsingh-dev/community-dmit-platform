const Vansh = require("../models/Vansh");
const Kul = require("../models/Kul");
const Khamp = require("../models/Khamp");
const Gotra = require("../models/Gotra");

const cascadeSoftDeleteCommunity = async (communityId, session = null) => {
  const findQuery = Vansh.find({ communityId, isDeleted: false });
  if (session) findQuery.session(session);
  const vanshIds = await findQuery.select("_id").lean();

  const vanshObjectIds = vanshIds.map((v) => v._id);

  const updateOptions = session ? { session } : {};
  await Vansh.updateMany(
    { communityId, isDeleted: false },
    { $set: { isDeleted: true, isActive: false } },
    updateOptions,
  );

  if (vanshObjectIds.length > 0) {
    const kulFindQuery = Kul.find({
      vanshId: { $in: vanshObjectIds },
      isDeleted: false,
    });
    if (session) kulFindQuery.session(session);
    const kulIds = await kulFindQuery.select("_id").lean();

    const kulObjectIds = kulIds.map((k) => k._id);

    await Kul.updateMany(
      { vanshId: { $in: vanshObjectIds }, isDeleted: false },
      { $set: { isDeleted: true, isActive: false } },
      updateOptions,
    );

    if (kulObjectIds.length > 0) {
      const khampFindQuery = Khamp.find({
        kulId: { $in: kulObjectIds },
        isDeleted: false,
      });
      if (session) khampFindQuery.session(session);
      const khampIds = await khampFindQuery.select("_id").lean();
      const khampObjectIds = khampIds.map((k) => k._id);

      await Khamp.updateMany(
        { kulId: { $in: kulObjectIds }, isDeleted: false },
        { $set: { isDeleted: true, isActive: false } },
        updateOptions,
      );

      if (khampObjectIds.length > 0) {
        await Gotra.updateMany(
          { khampId: { $in: khampObjectIds }, isDeleted: false },
          { $set: { isDeleted: true, isActive: false } },
          updateOptions,
        );
      }
    }
  }
};

const cascadeHardDeleteCommunity = async (communityId, session = null) => {
  const findQuery = Vansh.find({ communityId });
  if (session) findQuery.session(session);
  const vanshIds = await findQuery.select("_id").lean();

  const vanshObjectIds = vanshIds.map((v) => v._id);
  const deleteOptions = session ? { session } : {};

  if (vanshObjectIds.length > 0) {
    const kulFindQuery = Kul.find({ vanshId: { $in: vanshObjectIds } });
    if (session) kulFindQuery.session(session);
    const kulIds = await kulFindQuery.select("_id").lean();

    const kulObjectIds = kulIds.map((k) => k._id);

    if (kulObjectIds.length > 0) {
      const khampFindQuery = Khamp.find({ kulId: { $in: kulObjectIds } });
      if (session) khampFindQuery.session(session);
      const khampIds = await khampFindQuery.select("_id").lean();
      const khampObjectIds = khampIds.map((k) => k._id);

      if (khampObjectIds.length > 0) {
        await Gotra.deleteMany(
          { khampId: { $in: khampObjectIds } },
          deleteOptions,
        );
      }
      await Khamp.deleteMany({ kulId: { $in: kulObjectIds } }, deleteOptions);
    }

    await Kul.deleteMany({ vanshId: { $in: vanshObjectIds } }, deleteOptions);
  }

  await Vansh.deleteMany({ communityId }, deleteOptions);
};

const cascadeSoftDeleteVansh = async (vanshId, session = null) => {
  const findQuery = Kul.find({ vanshId, isDeleted: false });
  if (session) findQuery.session(session);
  const kulIds = await findQuery.select("_id").lean();

  const kulObjectIds = kulIds.map((k) => k._id);
  const updateOptions = session ? { session } : {};

  await Kul.updateMany(
    { vanshId, isDeleted: false },
    { $set: { isDeleted: true, isActive: false } },
    updateOptions,
  );

  if (kulObjectIds.length > 0) {
    const khampFindQuery = Khamp.find({
      kulId: { $in: kulObjectIds },
      isDeleted: false,
    });
    if (session) khampFindQuery.session(session);
    const khampIds = await khampFindQuery.select("_id").lean();
    const khampObjectIds = khampIds.map((k) => k._id);

    await Khamp.updateMany(
      { kulId: { $in: kulObjectIds }, isDeleted: false },
      { $set: { isDeleted: true, isActive: false } },
      updateOptions,
    );

    if (khampObjectIds.length > 0) {
      await Gotra.updateMany(
        { khampId: { $in: khampObjectIds }, isDeleted: false },
        { $set: { isDeleted: true, isActive: false } },
        updateOptions,
      );
    }
  }
};

const cascadeHardDeleteVansh = async (vanshId, session = null) => {
  const findQuery = Kul.find({ vanshId });
  if (session) findQuery.session(session);
  const kulIds = await findQuery.select("_id").lean();

  const kulObjectIds = kulIds.map((k) => k._id);
  const deleteOptions = session ? { session } : {};

  if (kulObjectIds.length > 0) {
    const khampFindQuery = Khamp.find({ kulId: { $in: kulObjectIds } });
    if (session) khampFindQuery.session(session);
    const khampIds = await khampFindQuery.select("_id").lean();
    const khampObjectIds = khampIds.map((k) => k._id);

    if (khampObjectIds.length > 0) {
      await Gotra.deleteMany(
        { khampId: { $in: khampObjectIds } },
        deleteOptions,
      );
    }
    await Khamp.deleteMany({ kulId: { $in: kulObjectIds } }, deleteOptions);
  }

  await Kul.deleteMany({ vanshId }, deleteOptions);
};

const cascadeSoftDeleteKul = async (kulId, session = null) => {
  const findQuery = Khamp.find({ kulId, isDeleted: false });
  if (session) findQuery.session(session);
  const khampIds = await findQuery.select("_id").lean();
  const khampObjectIds = khampIds.map((k) => k._id);
  const updateOptions = session ? { session } : {};

  await Khamp.updateMany(
    { kulId, isDeleted: false },
    { $set: { isDeleted: true, isActive: false } },
    updateOptions,
  );

  if (khampObjectIds.length > 0) {
    await Gotra.updateMany(
      { khampId: { $in: khampObjectIds }, isDeleted: false },
      { $set: { isDeleted: true, isActive: false } },
      updateOptions,
    );
  }
};

const cascadeHardDeleteKul = async (kulId, session = null) => {
  const findQuery = Khamp.find({ kulId });
  if (session) findQuery.session(session);
  const khampIds = await findQuery.select("_id").lean();
  const khampObjectIds = khampIds.map((k) => k._id);
  const deleteOptions = session ? { session } : {};

  if (khampObjectIds.length > 0) {
    await Gotra.deleteMany({ khampId: { $in: khampObjectIds } }, deleteOptions);
  }
  await Khamp.deleteMany({ kulId }, deleteOptions);
};

const cascadeInactiveCommunity = async (communityId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Vansh.updateMany(
    { communityId, isDeleted: false },
    { $set: { isActive: false } },
    updateOptions,
  );

  const findQuery = Vansh.find({ communityId, isDeleted: false });
  if (session) findQuery.session(session);
  const vanshIds = await findQuery.select("_id").lean();

  const vanshObjectIds = vanshIds.map((v) => v._id);

  if (vanshObjectIds.length > 0) {
    await Kul.updateMany(
      { vanshId: { $in: vanshObjectIds }, isDeleted: false },
      { $set: { isActive: false } },
      updateOptions,
    );

    const kulFindQuery = Kul.find({
      vanshId: { $in: vanshObjectIds },
      isDeleted: false,
    });
    if (session) kulFindQuery.session(session);
    const kulIds = await kulFindQuery.select("_id").lean();

    const kulObjectIds = kulIds.map((k) => k._id);

    if (kulObjectIds.length > 0) {
      const khampFindQuery = Khamp.find({
        kulId: { $in: kulObjectIds },
        isDeleted: false,
      });
      if (session) khampFindQuery.session(session);
      const khampIds = await khampFindQuery.select("_id").lean();
      const khampObjectIds = khampIds.map((k) => k._id);

      await Khamp.updateMany(
        { kulId: { $in: kulObjectIds }, isDeleted: false },
        { $set: { isActive: false } },
        updateOptions,
      );

      if (khampObjectIds.length > 0) {
        await Gotra.updateMany(
          { khampId: { $in: khampObjectIds }, isDeleted: false },
          { $set: { isActive: false } },
          updateOptions,
        );
      }
    }
  }
};

const cascadeInactiveVansh = async (vanshId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Kul.updateMany(
    { vanshId, isDeleted: false },
    { $set: { isActive: false } },
    updateOptions,
  );

  const findQuery = Kul.find({ vanshId, isDeleted: false });
  if (session) findQuery.session(session);
  const kulIds = await findQuery.select("_id").lean();

  const kulObjectIds = kulIds.map((k) => k._id);

  if (kulObjectIds.length > 0) {
    const khampFindQuery = Khamp.find({
      kulId: { $in: kulObjectIds },
      isDeleted: false,
    });
    if (session) khampFindQuery.session(session);
    const khampIds = await khampFindQuery.select("_id").lean();
    const khampObjectIds = khampIds.map((k) => k._id);

    await Khamp.updateMany(
      { kulId: { $in: kulObjectIds }, isDeleted: false },
      { $set: { isActive: false } },
      updateOptions,
    );

    if (khampObjectIds.length > 0) {
      await Gotra.updateMany(
        { khampId: { $in: khampObjectIds }, isDeleted: false },
        { $set: { isActive: false } },
        updateOptions,
      );
    }
  }
};

const cascadeInactiveKul = async (kulId, session = null) => {
  const findQuery = Khamp.find({ kulId, isDeleted: false });
  if (session) findQuery.session(session);
  const khampIds = await findQuery.select("_id").lean();
  const khampObjectIds = khampIds.map((k) => k._id);
  const updateOptions = session ? { session } : {};

  await Khamp.updateMany(
    { kulId, isDeleted: false },
    { $set: { isActive: false } },
    updateOptions,
  );

  if (khampObjectIds.length > 0) {
    await Gotra.updateMany(
      { khampId: { $in: khampObjectIds }, isDeleted: false },
      { $set: { isActive: false } },
      updateOptions,
    );
  }
};

const cascadeActiveCommunity = async (communityId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Vansh.updateMany(
    { communityId, isDeleted: false },
    { $set: { isActive: true } },
    updateOptions,
  );

  const findQuery = Vansh.find({ communityId, isDeleted: false });
  if (session) findQuery.session(session);
  const vanshIds = await findQuery.select("_id").lean();

  const vanshObjectIds = vanshIds.map((v) => v._id);

  if (vanshObjectIds.length > 0) {
    await Kul.updateMany(
      { vanshId: { $in: vanshObjectIds }, isDeleted: false },
      { $set: { isActive: true } },
      updateOptions,
    );

    const kulFindQuery = Kul.find({
      vanshId: { $in: vanshObjectIds },
      isDeleted: false,
    });
    if (session) kulFindQuery.session(session);
    const kulIds = await kulFindQuery.select("_id").lean();

    const kulObjectIds = kulIds.map((k) => k._id);

    if (kulObjectIds.length > 0) {
      const khampFindQuery = Khamp.find({
        kulId: { $in: kulObjectIds },
        isDeleted: false,
      });
      if (session) khampFindQuery.session(session);
      const khampIds = await khampFindQuery.select("_id").lean();
      const khampObjectIds = khampIds.map((k) => k._id);

      await Khamp.updateMany(
        { kulId: { $in: kulObjectIds }, isDeleted: false },
        { $set: { isActive: true } },
        updateOptions,
      );

      if (khampObjectIds.length > 0) {
        await Gotra.updateMany(
          { khampId: { $in: khampObjectIds }, isDeleted: false },
          { $set: { isActive: true } },
          updateOptions,
        );
      }
    }
  }
};

const cascadeActiveVansh = async (vanshId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Kul.updateMany(
    { vanshId, isDeleted: false },
    { $set: { isActive: true } },
    updateOptions,
  );

  const findQuery = Kul.find({ vanshId, isDeleted: false });
  if (session) findQuery.session(session);
  const kulIds = await findQuery.select("_id").lean();

  const kulObjectIds = kulIds.map((k) => k._id);

  if (kulObjectIds.length > 0) {
    const khampFindQuery = Khamp.find({
      kulId: { $in: kulObjectIds },
      isDeleted: false,
    });
    if (session) khampFindQuery.session(session);
    const khampIds = await khampFindQuery.select("_id").lean();
    const khampObjectIds = khampIds.map((k) => k._id);

    await Khamp.updateMany(
      { kulId: { $in: kulObjectIds }, isDeleted: false },
      { $set: { isActive: true } },
      updateOptions,
    );

    if (khampObjectIds.length > 0) {
      await Gotra.updateMany(
        { khampId: { $in: khampObjectIds }, isDeleted: false },
        { $set: { isActive: true } },
        updateOptions,
      );
    }
  }
};

const cascadeActiveKul = async (kulId, session = null) => {
  const findQuery = Khamp.find({ kulId, isDeleted: false });
  if (session) findQuery.session(session);
  const khampIds = await findQuery.select("_id").lean();
  const khampObjectIds = khampIds.map((k) => k._id);
  const updateOptions = session ? { session } : {};

  await Khamp.updateMany(
    { kulId, isDeleted: false },
    { $set: { isActive: true } },
    updateOptions,
  );

  if (khampObjectIds.length > 0) {
    await Gotra.updateMany(
      { khampId: { $in: khampObjectIds }, isDeleted: false },
      { $set: { isActive: true } },
      updateOptions,
    );
  }
};

const cascadeRestoreCommunity = async (communityId, session = null) => {
  const updateOptions = session ? { session } : {};

  const findQuery = Vansh.find({ communityId, isDeleted: true });
  if (session) findQuery.session(session);
  const vanshIds = await findQuery.select("_id").lean();

  const vanshObjectIds = vanshIds.map((v) => v._id);

  await Vansh.updateMany(
    { communityId, isDeleted: true },
    { $set: { isDeleted: false, isActive: true } },
    updateOptions,
  );

  if (vanshObjectIds.length > 0) {
    const kulFindQuery = Kul.find({
      vanshId: { $in: vanshObjectIds },
      isDeleted: true,
    });
    if (session) kulFindQuery.session(session);
    const kulIds = await kulFindQuery.select("_id").lean();

    const kulObjectIds = kulIds.map((k) => k._id);

    await Kul.updateMany(
      { vanshId: { $in: vanshObjectIds }, isDeleted: true },
      { $set: { isDeleted: false, isActive: true } },
      updateOptions,
    );

    if (kulObjectIds.length > 0) {
      const khampFindQuery = Khamp.find({
        kulId: { $in: kulObjectIds },
        isDeleted: true,
      });
      if (session) khampFindQuery.session(session);
      const khampIds = await khampFindQuery.select("_id").lean();
      const khampObjectIds = khampIds.map((k) => k._id);

      await Khamp.updateMany(
        { kulId: { $in: kulObjectIds }, isDeleted: true },
        { $set: { isDeleted: false, isActive: true } },
        updateOptions,
      );

      if (khampObjectIds.length > 0) {
        await Gotra.updateMany(
          { khampId: { $in: khampObjectIds }, isDeleted: true },
          { $set: { isDeleted: false, isActive: true } },
          updateOptions,
        );
      }
    }
  }
};

const cascadeRestoreVansh = async (vanshId, session = null) => {
  const updateOptions = session ? { session } : {};

  const findQuery = Kul.find({ vanshId, isDeleted: true });
  if (session) findQuery.session(session);
  const kulIds = await findQuery.select("_id").lean();

  const kulObjectIds = kulIds.map((k) => k._id);

  await Kul.updateMany(
    { vanshId, isDeleted: true },
    { $set: { isDeleted: false, isActive: true } },
    updateOptions,
  );

  if (kulObjectIds.length > 0) {
    const khampFindQuery = Khamp.find({
      kulId: { $in: kulObjectIds },
      isDeleted: true,
    });
    if (session) khampFindQuery.session(session);
    const khampIds = await khampFindQuery.select("_id").lean();
    const khampObjectIds = khampIds.map((k) => k._id);

    await Khamp.updateMany(
      { kulId: { $in: kulObjectIds }, isDeleted: true },
      { $set: { isDeleted: false, isActive: true } },
      updateOptions,
    );

    if (khampObjectIds.length > 0) {
      await Gotra.updateMany(
        { khampId: { $in: khampObjectIds }, isDeleted: true },
        { $set: { isDeleted: false, isActive: true } },
        updateOptions,
      );
    }
  }
};

const cascadeRestoreKul = async (kulId, session = null) => {
  const findQuery = Khamp.find({ kulId, isDeleted: true });
  if (session) findQuery.session(session);
  const khampIds = await findQuery.select("_id").lean();
  const khampObjectIds = khampIds.map((k) => k._id);
  const updateOptions = session ? { session } : {};

  await Khamp.updateMany(
    { kulId, isDeleted: true },
    { $set: { isDeleted: false, isActive: true } },
    updateOptions,
  );

  if (khampObjectIds.length > 0) {
    await Gotra.updateMany(
      { khampId: { $in: khampObjectIds }, isDeleted: true },
      { $set: { isDeleted: false, isActive: true } },
      updateOptions,
    );
  }
};

// Hierarchy extension: Khamp → Gotra (cascade from Khamp to child Gotra)
const cascadeSoftDeleteKhamp = async (khampId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Gotra.updateMany(
    { khampId, isDeleted: false },
    { $set: { isDeleted: true, isActive: false } },
    updateOptions,
  );
};

const cascadeHardDeleteKhamp = async (khampId, session = null) => {
  const deleteOptions = session ? { session } : {};
  await Gotra.deleteMany({ khampId }, deleteOptions);
};

const cascadeInactiveKhamp = async (khampId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Gotra.updateMany(
    { khampId, isDeleted: false },
    { $set: { isActive: false } },
    updateOptions,
  );
};

const cascadeActiveKhamp = async (khampId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Gotra.updateMany(
    { khampId, isDeleted: false },
    { $set: { isActive: true } },
    updateOptions,
  );
};

const cascadeRestoreKhamp = async (khampId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Gotra.updateMany(
    { khampId, isDeleted: true },
    { $set: { isDeleted: false, isActive: true } },
    updateOptions,
  );
};

module.exports = {
  cascadeSoftDeleteCommunity,
  cascadeHardDeleteCommunity,
  cascadeSoftDeleteVansh,
  cascadeHardDeleteVansh,
  cascadeSoftDeleteKul,
  cascadeHardDeleteKul,
  cascadeSoftDeleteKhamp,
  cascadeHardDeleteKhamp,
  cascadeInactiveCommunity,
  cascadeInactiveVansh,
  cascadeInactiveKul,
  cascadeInactiveKhamp,
  cascadeActiveCommunity,
  cascadeActiveVansh,
  cascadeActiveKul,
  cascadeActiveKhamp,
  cascadeRestoreCommunity,
  cascadeRestoreVansh,
  cascadeRestoreKul,
  cascadeRestoreKhamp,
};
