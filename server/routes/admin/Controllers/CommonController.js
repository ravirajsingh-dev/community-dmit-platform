var response = require("../../../config/response");
const CommonSettings = require("../../../models/CommonSettings");

const getPublicCommonSettings = async (req, res) => {
  try {
    // Get or create settings (ensures one document exists)
    const settings = await CommonSettings.getOrCreateSettings();

    // Return public-facing settings (marquee and footer settings)
    // Convert Mongoose document to plain object to ensure all fields are accessible
    const settingsObj = settings.toObject ? settings.toObject() : settings;
    
    // Ensure abbreviation is always included, even if undefined in database
    const publicSettings = {
      marqueeEnabled: settingsObj.marqueeEnabled || false,
      marqueeMessage: settingsObj.marqueeMessage || "",
      marqueeType: settingsObj.marqueeType || "warning",
      // Footer settings
      name: settingsObj.name || "",
      abbreviation: settingsObj.abbreviation || "",
      contactUs: settingsObj.contactUs || "",
      email: settingsObj.email || "",
      address: settingsObj.address || "",
      logoUrl: settingsObj.logoUrl || "",
      heroBrainUrl: settingsObj.heroBrainUrl || "",
      socialMedia: {
        instagram: settingsObj.socialMedia?.instagram || "",
        facebook: settingsObj.socialMedia?.facebook || "",
        youtube: settingsObj.socialMedia?.youtube || "",
        zoomMeeting: settingsObj.socialMedia?.zoomMeeting || "",
      },
      // About Us Page Content
      aboutUs: {
        title: settingsObj.aboutUs?.title || "",
        description: settingsObj.aboutUs?.description || "",
        mission: settingsObj.aboutUs?.mission || "",
        vision: settingsObj.aboutUs?.vision || "",
      },
      // Contact Us Page Content
      contactUsPage: {
        phone: settingsObj.contactUsPage?.phone || settingsObj.contactUs || "",
        secondaryPhone: settingsObj.contactUsPage?.secondaryPhone || "",
        email: settingsObj.contactUsPage?.email || settingsObj.email || "",
        address: settingsObj.contactUsPage?.address || settingsObj.address || "",
      },
      // Coming Soon Page Content (only if enabled)
      comingSoon: settingsObj.comingSoon?.enabled
        ? {
            enabled: true,
            title: settingsObj.comingSoon?.title || "",
            description: settingsObj.comingSoon?.description || "",
            initiatives: settingsObj.comingSoon?.initiatives || [],
          }
        : {
            enabled: false,
            title: "",
            description: "",
            initiatives: [],
          },
      // Homepage (SBI Pro – hero, key features, how it works)
      homepage: {
        hero: {
          title:
            settingsObj.homepage?.hero?.title ||
            "Unlock Your Brain's Full Potential",
          subheading:
            settingsObj.homepage?.hero?.subheading ||
            "Advanced Intelligence Analysis for Optimal Mental Performance.",
          ctaPrimaryText:
            settingsObj.homepage?.hero?.ctaPrimaryText || "Get Started",
          ctaPrimaryLink:
            settingsObj.homepage?.hero?.ctaPrimaryLink || "/login",
          ctaSecondaryText:
            settingsObj.homepage?.hero?.ctaSecondaryText || "Learn More",
          ctaSecondaryLink:
            settingsObj.homepage?.hero?.ctaSecondaryLink || "/about-us",
          showBannerSlider:
            settingsObj.homepage?.hero?.showBannerSlider === true,
        },
        keyFeatures: {
          enabled: settingsObj.homepage?.keyFeatures?.enabled !== false,
          title:
            settingsObj.homepage?.keyFeatures?.title || "Our Key Features",
          description:
            settingsObj.homepage?.keyFeatures?.description ||
            "Explore the advanced tools and insights designed to enhance your cognitive performance.",
          items:
            Array.isArray(settingsObj.homepage?.keyFeatures?.items) &&
            settingsObj.homepage.keyFeatures.items.length > 0
              ? settingsObj.homepage.keyFeatures.items
                  .filter(
                    (i) =>
                      (i.title && i.title.trim()) ||
                      (i.description && i.description.trim()),
                  )
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
              : [],
        },
        howItWorks: {
          enabled: settingsObj.homepage?.howItWorks?.enabled !== false,
          tag:
            settingsObj.homepage?.howItWorks?.tag || "SBI PRO ANALYSIS",
          title:
            settingsObj.homepage?.howItWorks?.title ||
            "How SBI Pro Analysis Works",
          steps:
            Array.isArray(settingsObj.homepage?.howItWorks?.steps) &&
            settingsObj.homepage.howItWorks.steps.length > 0
              ? settingsObj.homepage.howItWorks.steps
                  .filter(
                    (s) =>
                      (s.title && s.title.trim()) ||
                      (s.description && s.description.trim()),
                  )
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
              : [
                  {
                    title: "Advanced Fingerprint Analysis",
                    description:
                      "Our certified analysts capture and process your fingerprint data using scientifically validated methods to uncover your innate potential and cognitive patterns.",
                  },
                  {
                    title: "Personalized Intelligence Insights",
                    description:
                      "Receive detailed reports and actionable insights tailored to your unique profile—helping you understand strengths and areas for growth.",
                  },
                  {
                    title: "Optimize Mental Performance",
                    description:
                      "Apply your SBI Pro insights to make better decisions, enhance learning, and achieve optimal mental performance in life and work.",
                  },
                ],
        },
      },
    };

    return response.successResponse(
      res,
      publicSettings,
      "Public settings retrieved successfully.",
    );
  } catch (err) {
    console.error("Error in getPublicCommonSettings:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getPublicCommonSettings,
};
