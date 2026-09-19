const User = require("../../models/User");
const UserDetails = require("../../models/UserDetails");

/**
 * Required fields for Matrimonial (User + UserDetails).
 * Human-readable labels for API and UI.
 */
const REQUIRED_USER_PATHS = ["name", "phone", "status"];
const REQUIRED_USER_DETAILS_PATHS = [
  "dob",
  "gender",
  "fatherName",
  "motherName",
  "height",
  "weight",
  "address",
  "countryId",
  "stateId",
  "districtId",
  "villageId",
  "community",
  "vansh",
  "kul",
  "khamp",
  "gotra",
  "maritalStatus",
  "education",
  "occupation",
  "whatsappContact",
];

/** Path -> user-facing label (for errors and UI). */
const FIELD_LABELS = {
  name: "Full Name",
  phone: "Phone",
  status: "Account Status",
  dob: "Date of Birth",
  gender: "Gender",
  fatherName: "Father's Name",
  motherName: "Mother's Name",
  height: "Height",
  weight: "Weight",
  address: "Address",
  countryId: "Country",
  stateId: "State",
  districtId: "District",
  villageId: "Village",
  community: "Community",
  vansh: "Vansh",
  kul: "Kul",
  khamp: "Khamp",
  gotra: "Gotra",
  maritalStatus: "Marital Status",
  education: "Education",
  occupation: "Occupation",
  whatsappContact: "WhatsApp Contact",
};

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function getLabel(path) {
  return FIELD_LABELS[path] || path;
}

/**
 * Validates User and UserDetails for matrimonial application.
 * Returns ALL missing fields so the client can show a clear list and link to profile.
 * @param {mongoose.Types.ObjectId} userId
 * @returns {{ valid: boolean, message?: string, missingFields?: Array<{path: string, label: string}>, user?: object, userDetails?: object }}
 */
async function validateUserAndDetailsForMatrimonial(userId) {
  const missingFields = [];

  const user = await User.findById(userId).lean();
  if (!user) {
    return { valid: false, message: "User not found" };
  }

  if (user.status !== 1) {
    return { valid: false, message: "User account must be active to apply for Matrimonial" };
  }

  for (const path of REQUIRED_USER_PATHS) {
    const value = user[path];
    if (isEmpty(value)) {
      missingFields.push({ path, label: getLabel(path) });
    }
  }

  const userDetails = await UserDetails.findOne({ userId })
    .populate("community")
    .populate("vansh")
    .populate("kul")
    .populate("khamp")
    .populate("gotra")
    .populate("countryId")
    .populate("stateId")
    .populate("districtId")
    .populate("villageId")
    .lean();

  if (!userDetails) {
    return {
      valid: false,
      message: "Profile details are required. Please complete your profile first.",
      missingFields: [{ path: "profile", label: "Profile Details" }],
    };
  }

  for (const path of REQUIRED_USER_DETAILS_PATHS) {
    const value = userDetails[path];
    if (isEmpty(value)) {
      missingFields.push({ path, label: getLabel(path) });
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: "Profile is incomplete. Please complete the required fields before applying for Matrimonial.",
      missingFields,
    };
  }

  return {
    valid: true,
    user,
    userDetails,
  };
}

module.exports = {
  validateUserAndDetailsForMatrimonial,
  REQUIRED_USER_PATHS,
  REQUIRED_USER_DETAILS_PATHS,
  FIELD_LABELS,
};
