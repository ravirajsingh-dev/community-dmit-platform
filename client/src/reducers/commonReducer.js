import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  commonSettings: {
    marqueeEnabled: false,
    marqueeMessage: "",
    marqueeType: "warning",
    name: "",
    abbreviation: "",
    contactUs: "",
    email: "",
    address: "",
    heroBrainUrl: "",
    socialMedia: {
      instagram: "",
      facebook: "",
      youtube: "",
      zoomMeeting: "",
    },
    aboutUs: {
      title: "",
      description: "",
      mission: "",
      vision: "",
    },
    contactUsPage: {
      phone: "",
      secondaryPhone: "",
      email: "",
      address: "",
    },
    comingSoon: {
      enabled: false,
      title: "",
      description: "",
      initiatives: [],
    },
    homepage: {
      hero: {
        title: "Unlock Your Brain's Full Potential",
        subheading:
          "Advanced Intelligence Analysis for Optimal Mental Performance.",
        ctaPrimaryText: "Get Started",
        ctaPrimaryLink: "/login",
        ctaSecondaryText: "Learn More",
        ctaSecondaryLink: "/about-us",
        showBannerSlider: false,
      },
      keyFeatures: {
        enabled: true,
        title: "Our Key Features",
        description:
          "Explore the advanced tools and insights designed to enhance your cognitive performance.",
        items: [],
      },
      howItWorks: {
        enabled: true,
        tag: "SBI PRO ANALYSIS",
        title: "How SBI Pro Analysis Works",
        steps: [],
      },
    },
  },
  loadingCommonSettings: false,
};

const commonSlice = createSlice({
  name: "common",
  initialState,
  reducers: {
    commonSettingsUpdated(state, action) {
      return {
        ...state,
        commonSettings: action.payload,
        loadingCommonSettings: false,
      };
    },

    loadingCommonSettings(state) {
      return {
        ...state,
        loadingCommonSettings: true,
      };
    },
  },
});

export const { commonSettingsUpdated, loadingCommonSettings } = commonSlice.actions;
export default commonSlice.reducer;
