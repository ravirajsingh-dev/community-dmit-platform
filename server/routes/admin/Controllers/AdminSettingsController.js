const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const response = require("../../../config/response");
const CommonSettings = require("../../../models/CommonSettings");
const Admin = require("../../../models/Admin");
const SubAdmin = require("../../../models/SubAdmin");
const Session = require("../../../models/Session");
const { comparePasswords } = require("../../../utils/helper");
const {
  validateUPI,
  validateAmount,
} = require("../../../utils/inputValidation");
const { uploadLogo, deleteLogo } = require("../../../helpers/logoService");

/**
 * @route GET /api/admin/settings
 * @desc Get common settings (auto-creates if not found)
 * @access Private (Admin only)
 */
const getCommonSettings = async (req, res) => {
  try {
    // Get or create settings (ensures one document exists)
    const settings = await CommonSettings.getOrCreateSettings();

    return response.successResponse(
      res,
      settings,
      "Settings retrieved successfully.",
    );
  } catch (err) {
    console.error("Error in getCommonSettings:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/settings
 * @desc Update common settings
 * @access Private (Admin only)
 */
const updateCommonSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    // Validate transaction password
    const { txn_password } = req.body;
    if (!txn_password) {
      return response.errorResponse(
        res,
        { msg: "Transaction password is required." },
        "Transaction password is required.",
        400,
      );
    }

    // Get admin/subadmin and validate transaction password
    // Detect user role from auth token
    const adminID = req.user.id;
    const userRole = req.user.role;

    let admin;
    if (userRole === 2) {
      // Admin
      admin = await Admin.findById(adminID);
    } else if (userRole === 3) {
      // SubAdmin
      admin = await SubAdmin.findById(adminID);
    } else {
      // Fallback: try Admin first, then SubAdmin
      admin = await Admin.findById(adminID);
      if (!admin) {
        admin = await SubAdmin.findById(adminID);
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ msg: "Admin not found." }],
        "Admin not found.",
        400,
      );
    }

    // Check if admin has transaction password set
    if (!admin.txn_password) {
      return response.errorResponse(
        res,
        {
          msg: "Transaction password not set. Please set your transaction password first.",
        },
        "Transaction password not set.",
        400,
      );
    }

    // Validate transaction password
    const validPassword = await comparePasswords(
      txn_password,
      admin.txn_password,
    );
    if (!validPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "txn_password",
            msg: "Incorrect transaction password. Please double-check your credentials and try again.",
          },
        ],
        "Incorrect Transaction Password.",
        400,
      );
    }

    // Get or create settings first
    let settings = await CommonSettings.getOrCreateSettings();

    // Handle logo / hero brain uploads if provided
    const logoFile =
      req.file || // backward compatibility for single upload
      (req.files && Array.isArray(req.files.logo) && req.files.logo[0]) ||
      null;
    const heroBrainFile =
      req.files && Array.isArray(req.files.heroBrainImage)
        ? req.files.heroBrainImage[0]
        : null;

    if (logoFile) {
      try {
        const uploadResult = await uploadLogo(logoFile);

        if (settings.logoKey) {
          await deleteLogo(settings.logoKey);
        }

        settings.logoUrl = uploadResult.url;
        settings.logoKey = uploadResult.key;
      } catch (error) {
        return response.errorResponse(
          res,
          [{ path: "logo", msg: error.message }],
          error.message,
          400,
        );
      }
    }

    if (heroBrainFile) {
      try {
        const uploadResult = await uploadLogo(heroBrainFile);

        if (settings.heroBrainKey) {
          await deleteLogo(settings.heroBrainKey);
        }

        settings.heroBrainUrl = uploadResult.url;
        settings.heroBrainKey = uploadResult.key;
      } catch (error) {
        return response.errorResponse(
          res,
          [{ path: "heroBrainImage", msg: error.message }],
          error.message,
          400,
        );
      }
    }

    // Extract allowed fields from request body
    // Handle both JSON and FormData (FormData sends nested objects as JSON strings)
    let {
      name,
      contactUs,
      email,
      address,
      abbreviation,
      socialMedia,
      donationEnabled,
      donationMessage,
      marqueeEnabled,
      marqueeMessage,
      marqueeType,
      loginEnabled,
      registerEnabled,
      upi,
      bank,
      aboutUs,
      contactUsPage,
      comingSoon,
      homepage,
    } = req.body;

    // Parse nested objects if they are JSON strings (from FormData)
    if (typeof socialMedia === "string") {
      try {
        socialMedia = JSON.parse(socialMedia);
      } catch (e) {
        socialMedia = {};
      }
    }
    if (typeof upi === "string") {
      try {
        upi = JSON.parse(upi);
      } catch (e) {
        upi = {};
      }
    }
    if (typeof bank === "string") {
      try {
        bank = JSON.parse(bank);
      } catch (e) {
        bank = {};
      }
    }
    if (typeof aboutUs === "string") {
      try {
        aboutUs = JSON.parse(aboutUs);
      } catch (e) {
        aboutUs = {};
      }
    }
    if (typeof contactUsPage === "string") {
      try {
        contactUsPage = JSON.parse(contactUsPage);
      } catch (e) {
        contactUsPage = {};
      }
    }
    if (typeof comingSoon === "string") {
      try {
        comingSoon = JSON.parse(comingSoon);
      } catch (e) {
        comingSoon = {};
      }
    }
    if (typeof homepage === "string") {
      try {
        homepage = JSON.parse(homepage);
      } catch (e) {
        homepage = {};
      }
    }

    // Helper function to parse boolean from string (FormData sends booleans as strings)
    const parseBoolean = (value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value === "true" || value === "on";
      }
      return Boolean(value);
    };

    // Helper function to parse number from string
    const parseNumber = (value) => {
      if (typeof value === "number") return value;
      if (typeof value === "string" && value !== "") {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
      }
      return undefined;
    };

    // Update general information - REQUIRED FIELDS: never overwrite with empty/null
    // Only assign when we have a valid non-empty trimmed value
    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (trimmedName) settings.name = trimmedName;

    const trimmedContactUs = typeof contactUs === "string" ? contactUs.trim() : "";
    if (trimmedContactUs) settings.contactUs = trimmedContactUs;

    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    if (trimmedEmail) settings.email = trimmedEmail.toLowerCase();

    // Optional fields - trim when present, allow empty
    if (address !== undefined) settings.address = String(address).trim();
    if (abbreviation !== undefined)
      settings.abbreviation = String(abbreviation).trim();

    // Update donation settings
    if (donationEnabled !== undefined) {
      settings.donationEnabled = parseBoolean(donationEnabled);
    }
    if (donationMessage !== undefined)
      settings.donationMessage = donationMessage;

    // Update marquee settings
    if (marqueeEnabled !== undefined) {
      settings.marqueeEnabled = parseBoolean(marqueeEnabled);
    }
    if (marqueeMessage !== undefined) settings.marqueeMessage = marqueeMessage;
    if (marqueeType !== undefined) {
      if (["danger", "success", "warning"].includes(marqueeType)) {
        settings.marqueeType = marqueeType;
      } else {
        return response.errorResponse(
          res,
          { msg: "Invalid marquee type. Must be danger, success, or warning." },
          "Validation Error",
          400,
        );
      }
    }

    // Update authentication settings
    // Check if login or register is being disabled
    const wasLoginEnabled = settings.loginEnabled;
    const wasRegisterEnabled = settings.registerEnabled;

    if (loginEnabled !== undefined) {
      settings.loginEnabled = parseBoolean(loginEnabled);
    }
    if (registerEnabled !== undefined) {
      settings.registerEnabled = parseBoolean(registerEnabled);
    }

    // If login or register is being disabled, logout all users (but not admins)
    // Session role: 1 = User, 2 = Admin
    if (
      (loginEnabled === false && wasLoginEnabled === true) ||
      (registerEnabled === false && wasRegisterEnabled === true)
    ) {
      try {
        // Delete all sessions for regular users only (role = 1)
        await Session.deleteMany({ role: 1 });
      } catch (err) {
        console.error("Error logging out all users:", err);
        // Don't fail the request if logout fails, just log the error
      }
    }

    // Update UPI details (all optional; empty values allowed)
    if (upi) {
      if (upi.upiId !== undefined) {
        const trimmed = String(upi.upiId).trim();
        if (trimmed === "") {
          settings.upi.upiId = "";
        } else {
          const upiValidation = validateUPI(upi.upiId);
          if (!upiValidation.valid) {
            return response.errorResponse(
              res,
              [{ path: "upi.upiId", msg: upiValidation.error }],
              upiValidation.error,
              400,
            );
          }
          settings.upi.upiId = upiValidation.sanitized;
        }
      }
      if (upi.upiHolderName !== undefined) {
        // Sanitize UPI holder name
        let sanitizedName = String(upi.upiHolderName).trim();
        sanitizedName = sanitizedName.replace(/<[^>]*>/g, "");
        sanitizedName = sanitizedName.replace(/\$[a-zA-Z]+/g, "");
        settings.upi.upiHolderName = sanitizedName;
      }
    }

    // Update bank details
    if (bank) {
      if (bank.bankName !== undefined) settings.bank.bankName = bank.bankName;
      if (bank.accountNo !== undefined)
        settings.bank.accountNo = bank.accountNo;
      if (bank.accountHolderName !== undefined)
        settings.bank.accountHolderName = bank.accountHolderName;
      if (bank.ifscCode !== undefined) settings.bank.ifscCode = bank.ifscCode;
    }

    // Update social media links
    if (socialMedia) {
      if (socialMedia.instagram !== undefined)
        settings.socialMedia.instagram = socialMedia.instagram;
      if (socialMedia.facebook !== undefined)
        settings.socialMedia.facebook = socialMedia.facebook;
      if (socialMedia.youtube !== undefined)
        settings.socialMedia.youtube = socialMedia.youtube;
      if (socialMedia.zoomMeeting !== undefined)
        settings.socialMedia.zoomMeeting = socialMedia.zoomMeeting;
    }

    // Update About Us page content
    if (aboutUs) {
      // Initialize aboutUs object if it doesn't exist
      if (!settings.aboutUs) {
        settings.aboutUs = {
          title: "",
          description: "",
          mission: "",
          vision: "",
        };
      }
      if (aboutUs.title !== undefined) settings.aboutUs.title = aboutUs.title;
      if (aboutUs.description !== undefined)
        settings.aboutUs.description = aboutUs.description;
      if (aboutUs.mission !== undefined)
        settings.aboutUs.mission = aboutUs.mission;
      if (aboutUs.vision !== undefined)
        settings.aboutUs.vision = aboutUs.vision;
    }

    // Update Contact Us page content
    if (contactUsPage) {
      // Initialize contactUsPage object if it doesn't exist
      if (!settings.contactUsPage) {
        settings.contactUsPage = {
          phone: "",
          secondaryPhone: "",
          email: "",
          address: "",
        };
      }
      if (contactUsPage.phone !== undefined)
        settings.contactUsPage.phone = contactUsPage.phone;
      if (contactUsPage.secondaryPhone !== undefined)
        settings.contactUsPage.secondaryPhone = contactUsPage.secondaryPhone;
      if (contactUsPage.email !== undefined)
        settings.contactUsPage.email = contactUsPage.email;
      if (contactUsPage.address !== undefined)
        settings.contactUsPage.address = contactUsPage.address;
    }

    // Update Coming Soon page content
    if (comingSoon !== undefined) {
      // Initialize comingSoon object if it doesn't exist
      if (!settings.comingSoon) {
        settings.comingSoon = {
          enabled: false,
          title: "",
          description: "",
          initiatives: [],
        };
      }
      if (comingSoon.enabled !== undefined) {
        settings.comingSoon.enabled = parseBoolean(comingSoon.enabled);
      }
      if (comingSoon.title !== undefined)
        settings.comingSoon.title = comingSoon.title;
      if (comingSoon.description !== undefined)
        settings.comingSoon.description = comingSoon.description;
      if (
        comingSoon.initiatives !== undefined &&
        Array.isArray(comingSoon.initiatives)
      ) {
        // Validate and sanitize initiatives
        settings.comingSoon.initiatives = comingSoon.initiatives
          .filter(
            (init) =>
              init &&
              init.title &&
              typeof init.title === "string" &&
              init.title.trim().length > 0,
          )
          .map((init, index) => ({
            title: String(init.title).trim(),
            description: init.description
              ? String(init.description).trim()
              : "",
            order: typeof init.order === "number" ? init.order : index,
          }));
      }
    }

    // Update Homepage (SBI Pro – hero, keyFeatures, howItWorks)
    if (homepage !== undefined) {
      if (!settings.homepage) {
        settings.homepage = {
          hero: {},
          keyFeatures: { enabled: true, title: "", description: "", items: [] },
          howItWorks: { enabled: true, tag: "", title: "", steps: [] },
        };
      }
      if (homepage.hero) {
        if (homepage.hero.title !== undefined)
          settings.homepage.hero.title = homepage.hero.title;
        if (homepage.hero.subheading !== undefined)
          settings.homepage.hero.subheading = homepage.hero.subheading;
        if (homepage.hero.ctaPrimaryText !== undefined)
          settings.homepage.hero.ctaPrimaryText = homepage.hero.ctaPrimaryText;
        if (homepage.hero.ctaPrimaryLink !== undefined)
          settings.homepage.hero.ctaPrimaryLink = homepage.hero.ctaPrimaryLink;
        if (homepage.hero.ctaSecondaryText !== undefined)
          settings.homepage.hero.ctaSecondaryText =
            homepage.hero.ctaSecondaryText;
        if (homepage.hero.ctaSecondaryLink !== undefined)
          settings.homepage.hero.ctaSecondaryLink =
            homepage.hero.ctaSecondaryLink;
        if (homepage.hero.showBannerSlider !== undefined)
          settings.homepage.hero.showBannerSlider = parseBoolean(
            homepage.hero.showBannerSlider,
          );
      }
      if (homepage.keyFeatures) {
        if (homepage.keyFeatures.enabled !== undefined)
          settings.homepage.keyFeatures.enabled = parseBoolean(
            homepage.keyFeatures.enabled,
          );
        if (homepage.keyFeatures.title !== undefined)
          settings.homepage.keyFeatures.title = homepage.keyFeatures.title;
        if (homepage.keyFeatures.description !== undefined)
          settings.homepage.keyFeatures.description =
            homepage.keyFeatures.description;
        if (
          homepage.keyFeatures.items !== undefined &&
          Array.isArray(homepage.keyFeatures.items)
        ) {
          settings.homepage.keyFeatures.items = homepage.keyFeatures.items
            .filter(
              (i) =>
                i &&
                ((typeof i.title === "string" && i.title.trim()) ||
                  (typeof i.description === "string" && i.description.trim())),
            )
            .map((item, index) => ({
              title: (item.title && String(item.title).trim()) || "",
              description:
                (item.description && String(item.description).trim()) || "",
              order: typeof item.order === "number" ? item.order : index,
            }));
        }
      }
      if (homepage.howItWorks) {
        if (homepage.howItWorks.enabled !== undefined)
          settings.homepage.howItWorks.enabled = parseBoolean(
            homepage.howItWorks.enabled,
          );
        if (homepage.howItWorks.tag !== undefined)
          settings.homepage.howItWorks.tag = homepage.howItWorks.tag;
        if (homepage.howItWorks.title !== undefined)
          settings.homepage.howItWorks.title = homepage.howItWorks.title;
        if (
          homepage.howItWorks.steps !== undefined &&
          Array.isArray(homepage.howItWorks.steps)
        ) {
          settings.homepage.howItWorks.steps = homepage.howItWorks.steps
            .filter(
              (s) =>
                s &&
                ((typeof s.title === "string" && s.title.trim()) ||
                  (typeof s.description === "string" &&
                    s.description.trim())),
            )
            .map((step, index) => ({
              title: (step.title && String(step.title).trim()) || "",
              description:
                (step.description && String(step.description).trim()) || "",
              order: typeof step.order === "number" ? step.order : index,
            }));
        }
      }
    }

    // Save updated settings
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Settings updated successfully.",
    );
  } catch (err) {
    console.error("Error in updateCommonSettings:", err);

    // Handle Mongoose validation errors with structured response
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }

    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getCommonSettings,
  updateCommonSettings,
};
