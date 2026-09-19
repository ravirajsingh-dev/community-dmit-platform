const mongoose = require("mongoose");
const { Schema } = mongoose;
const COMMON_SETTINGS_SINGLETON_KEY = "GLOBAL";

const CommonSettingsSchema = new Schema(
  {
    // General Information
    name: {
      type: String,
      required: true,
      trim: true,
      default: "PROJECT",
    },
    contactUs: {
      type: String,
      required: true,
      trim: true,
      default: "9999999999",
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: "admin@yopmail.com",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    abbreviation: {
      type: String,
      trim: true,
      default: "",
    },
    singletonKey: {
      type: String,
      required: true,
      default: COMMON_SETTINGS_SINGLETON_KEY,
      immutable: true,
      unique: true,
      index: true,
    },

    // Logo
    logoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    logoKey: {
      type: String,
      trim: true,
      default: "",
    },

    // Hero brain image (homepage hero graphic)
    heroBrainUrl: {
      type: String,
      trim: true,
      default: "",
    },
    heroBrainKey: {
      type: String,
      trim: true,
      default: "",
    },

    // Social Media Links
    socialMedia: {
      instagram: {
        type: String,
        trim: true,
        default: "",
      },
      facebook: {
        type: String,
        trim: true,
        default: "",
      },
      youtube: {
        type: String,
        trim: true,
        default: "",
      },
      zoomMeeting: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Donation Settings
    donationEnabled: {
      type: Boolean,
      default: true,
    },
    donationMessage: {
      type: String,
      trim: true,
      default: "",
    },

    // Marquee Settings
    marqueeEnabled: {
      type: Boolean,
      default: false,
    },
    marqueeMessage: {
      type: String,
      trim: true,
      default: "",
    },
    marqueeType: {
      type: String,
      enum: ["danger", "success", "warning"],
      default: "warning",
    },

    // Authentication Settings
    loginEnabled: {
      type: Boolean,
      default: true,
    },
    registerEnabled: {
      type: Boolean,
      default: true,
    },

    // UPI Details
    upi: {
      upiId: {
        type: String,
        trim: true,
        default: "",
      },
      upiHolderName: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Bank Details
    bank: {
      bankName: {
        type: String,
        trim: true,
        default: "",
      },
      accountNo: {
        type: String,
        trim: true,
        default: "",
      },
      accountHolderName: {
        type: String,
        trim: true,
        default: "",
      },
      ifscCode: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // About Us Page Content
    aboutUs: {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
      mission: {
        type: String,
        trim: true,
        default: "",
      },
      vision: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Contact Us Page Content
    contactUsPage: {
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      secondaryPhone: {
        type: String,
        trim: true,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        default: "",
      },
      address: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Coming Soon Page Settings
    comingSoon: {
      enabled: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
      initiatives: [
        {
          title: {
            type: String,
            trim: true,
            required: true,
          },
          description: {
            type: String,
            trim: true,
            default: "",
          },
          order: {
            type: Number,
            default: 0,
          },
        },
      ],
    },

    // Homepage (SBI Pro – Smart Brain Intelligence)
    homepage: {
      hero: {
        title: {
          type: String,
          trim: true,
          default: "Unlock Your Brain's Full Potential",
        },
        subheading: {
          type: String,
          trim: true,
          default:
            "Advanced Intelligence Analysis for Optimal Mental Performance.",
        },
        ctaPrimaryText: { type: String, trim: true, default: "Get Started" },
        ctaPrimaryLink: { type: String, trim: true, default: "/login" },
        ctaSecondaryText: { type: String, trim: true, default: "Learn More" },
        ctaSecondaryLink: { type: String, trim: true, default: "/about-us" },
        showBannerSlider: { type: Boolean, default: false },
      },
      keyFeatures: {
        enabled: { type: Boolean, default: true },
        title: { type: String, trim: true, default: "Our Key Features" },
        description: {
          type: String,
          trim: true,
          default:
            "Explore the advanced tools and insights designed to enhance your cognitive performance.",
        },
        items: [
          {
            title: { type: String, trim: true, default: "" },
            description: { type: String, trim: true, default: "" },
            order: { type: Number, default: 0 },
          },
        ],
      },
      howItWorks: {
        enabled: { type: Boolean, default: true },
        tag: { type: String, trim: true, default: "SBI PRO ANALYSIS" },
        title: {
          type: String,
          trim: true,
          default: "How SBI Pro Analysis Works",
        },
        steps: [
          {
            title: { type: String, trim: true, default: "" },
            description: { type: String, trim: true, default: "" },
            order: { type: Number, default: 0 },
          },
        ],
      },
    },
  },
  {
    timestamps: true,
  },
);

CommonSettingsSchema.index(
  { singletonKey: 1 },
  { unique: true, name: "common_settings_singleton_key_unique" },
);

// Singleton guard: only one common settings document is allowed.
CommonSettingsSchema.pre("save", async function () {
  if (!this.singletonKey) {
    this.singletonKey = COMMON_SETTINGS_SINGLETON_KEY;
  }

  if (!this.isNew) {
    return;
  }

  const existingSettings = await this.constructor.exists({
    _id: { $ne: this._id },
  });
  if (existingSettings) {
    throw new Error("Not allowed: common settings already exist");
  }
});

// Static method to get or create settings (ensures only one document exists)
CommonSettingsSchema.statics.getOrCreateSettings = async function () {
  try {
    // Keep the oldest document and remove accidental duplicates.
    let settings = await this.findOne().sort({ createdAt: 1, _id: 1 });

    if (settings) {
      if (settings.singletonKey !== COMMON_SETTINGS_SINGLETON_KEY) {
        await this.updateOne(
          { _id: settings._id },
          { $set: { singletonKey: COMMON_SETTINGS_SINGLETON_KEY } },
        );
        settings.singletonKey = COMMON_SETTINGS_SINGLETON_KEY;
      }

      await this.deleteMany({ _id: { $ne: settings._id } });
      return settings;
    }

    settings = await this.findOneAndUpdate(
      { singletonKey: COMMON_SETTINGS_SINGLETON_KEY },
      {
        $setOnInsert: {
          singletonKey: COMMON_SETTINGS_SINGLETON_KEY,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
    console.log("✅ Common Settings Created");

    return settings;
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await this.findOne({
        singletonKey: COMMON_SETTINGS_SINGLETON_KEY,
      });
      if (existing) {
        return existing;
      }
    }
    console.error("Error in getOrCreateSettings:", error);
    throw error;
  }
};

const CommonSettings = mongoose.model("common_settings", CommonSettingsSchema);

module.exports = CommonSettings;
