const PhoneRegistrationCounter = require("../models/PhoneRegistrationCounter");

const MAX_PHONE_USERS = 5;
const MAX_RESERVE_RETRIES = 10;

const reservePhoneCapacity = async (phone, session) => {
  for (let attempt = 0; attempt < MAX_RESERVE_RETRIES; attempt += 1) {
    const updated = await PhoneRegistrationCounter.findOneAndUpdate(
      { phone, count: { $lt: MAX_PHONE_USERS } },
      { $inc: { count: 1 } },
      { new: true, session },
    );
    if (updated) return updated;

    try {
      const created = new PhoneRegistrationCounter({ phone, count: 1 });
      await created.save({ session });
      return created;
    } catch (err) {
      // Concurrent creator for same phone; retry update path.
      if (err?.code !== 11000) {
        throw err;
      }
    }
  }

  throw new Error("Phone number user limit exceeded");
};

const releasePhoneCapacity = async (phone, session) => {
  await PhoneRegistrationCounter.findOneAndUpdate(
    { phone, count: { $gt: 0 } },
    { $inc: { count: -1 } },
    { session },
  );
};

module.exports = {
  reservePhoneCapacity,
  releasePhoneCapacity,
};
