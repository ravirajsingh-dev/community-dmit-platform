/**
 * Education dropdown options for UserDetails.
 * Single source of truth for Indian education levels and degrees.
 * label → user-friendly display text; value → normalized, backend-safe value.
 */

const EDUCATION_OPTIONS = [
  // --- School ---
  { label: "Below 10th", value: "below_10th" },
  { label: "10th (Matriculation)", value: "10th" },
  { label: "12th (Intermediate / HSC)", value: "12th" },

  // --- Vocational / Technical ---
  { label: "ITI (Industrial Training Institute)", value: "iti" },
  { label: "Polytechnic", value: "polytechnic" },
  { label: "Diploma (Engineering)", value: "diploma_engg" },
  { label: "Diploma (Non-Engineering)", value: "diploma_other" },

  // --- Bachelor – Arts / Science / Commerce ---
  { label: "BA (Bachelor of Arts)", value: "ba" },
  { label: "BA (Honours)", value: "ba_hons" },
  { label: "BSc (Bachelor of Science)", value: "bsc" },
  { label: "BSc (Honours)", value: "bsc_hons" },
  { label: "BCom (Bachelor of Commerce)", value: "bcom" },
  { label: "BCom (Honours)", value: "bcom_hons" },

  // --- Bachelor – Engineering / Technology ---
  { label: "BTech (Bachelor of Technology)", value: "btech" },
  { label: "BE (Bachelor of Engineering)", value: "be" },
  { label: "BCA (Bachelor of Computer Applications)", value: "bca" },

  // --- Bachelor – Management / Law / Education ---
  { label: "BBA (Bachelor of Business Administration)", value: "bba" },
  { label: "LLB (Bachelor of Laws)", value: "llb" },
  { label: "BEd (Bachelor of Education)", value: "bed" },

  // --- Bachelor – Medical / Paramedical ---
  { label: "MBBS (Bachelor of Medicine & Surgery)", value: "mbbs" },
  { label: "BDS (Bachelor of Dental Surgery)", value: "bds" },
  { label: "BAMS (Ayurveda)", value: "bams" },
  { label: "BHMS (Homeopathy)", value: "bhms" },
  { label: "BPharm (Bachelor of Pharmacy)", value: "bpharm" },
  { label: "BPT (Physiotherapy)", value: "bpt" },
  { label: "BMLT (Medical Lab Technology)", value: "bmlt" },
  { label: "GNM (General Nursing & Midwifery)", value: "gnm" },
  { label: "BSc Nursing", value: "bsc_nursing" },

  // --- Bachelor – Architecture / Design / Journalism ---
  { label: "BArch (Bachelor of Architecture)", value: "barch" },
  { label: "BFA (Fine Arts)", value: "bfa" },
  { label: "BVA (Visual Arts)", value: "bva" },
  { label: "BPA (Performing Arts)", value: "bpa" },
  { label: "BJMC (Journalism & Mass Communication)", value: "bjmc" },

  { label: "Other Bachelor’s Degree", value: "other_bachelor" },

  // --- Master – Arts / Science / Commerce ---
  { label: "MA (Master of Arts)", value: "ma" },
  { label: "MSc (Master of Science)", value: "msc" },
  { label: "MCom (Master of Commerce)", value: "mcom" },

  // --- Master – Engineering / IT ---
  { label: "MTech (Master of Technology)", value: "mtech" },
  { label: "ME (Master of Engineering)", value: "me" },
  { label: "MCA (Master of Computer Applications)", value: "mca" },

  // --- Master – Management / Law / Education ---
  { label: "MBA (Master of Business Administration)", value: "mba" },
  { label: "LLM (Master of Laws)", value: "llm" },
  { label: "MEd (Master of Education)", value: "med" },

  // --- Master – Medical / Paramedical ---
  { label: "MD (Doctor of Medicine)", value: "md" },
  { label: "MS (Master of Surgery)", value: "ms" },
  { label: "MDS (Master of Dental Surgery)", value: "mds" },
  { label: "MPharm (Master of Pharmacy)", value: "mpharm" },
  { label: "MPT (Master of Physiotherapy)", value: "mpt" },
  { label: "MLT (Medical Lab Technology)", value: "mlt" },

  // --- Master – Architecture / Design / Journalism ---
  { label: "MArch (Master of Architecture)", value: "march" },
  { label: "MFA (Master of Fine Arts)", value: "mfa" },
  { label: "MJMC (Journalism & Mass Communication)", value: "mjmc" },

  { label: "Other Master’s Degree", value: "other_master" },

  // --- Doctorate ---
  { label: "PhD (Doctor of Philosophy)", value: "phd" },
  { label: "DPhil (Doctor of Philosophy)", value: "dphil" },
  { label: "DM (Doctorate of Medicine)", value: "dm" },
  { label: "MCh (Master of Chirurgiae)", value: "mch" },

  { label: "Other Doctorate", value: "other_doctorate" },

  // --- Misc ---
  { label: "Other / Not Listed", value: "other" },
];

/** Backend-safe values only (for validation and enums) */
const EDUCATION_VALUES = EDUCATION_OPTIONS.map((opt) => opt.value);

module.exports = {
  EDUCATION_OPTIONS,
  EDUCATION_VALUES,
};
