import { commonSettingsUpdated, loadingCommonSettings } from "@reducers/commonReducer";
import { removeErrors } from "@src/reducers/errors";
import { removeAlertMsg } from "@src/reducers/alert";
import api from "@src/utils/axiosSetup";

export const getCommonSettings = () => async (dispatch) => {
  try {
    dispatch(loadingCommonSettings());
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.get(`/api/common/settings`, config);

    if (res.data && res.data.status === true) {
      dispatch(commonSettingsUpdated(res.data.response));
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    dispatch(
      commonSettingsUpdated({
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
      })
    );
  }
};

export const removeAllErrors = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlertMsg());
};
