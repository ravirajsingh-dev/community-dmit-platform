import { combineReducers } from "redux";

import errors from "./errors";
import alert from "./alert";

// Admin section
import adminAuth from "./adminAuth";
import adminUsers from "./adminUsersReducer";
import adminSubAdmins from "./adminSubAdminsReducer";

// admin default values
import adminCommonSettings from "./adminCommonSettingsReducer";
import adminDonation from "./adminDonationReducer";

import common from "./commonReducer";
import adminSlider from "./adminSliderReducer";
import adminGallery from "./adminGalleryReducer";
import adminVideo from "./adminVideoReducer";
import adminTrainingVideo from "./adminTrainingVideoReducer";
import adminNews from "./adminNewsReducer";
import adminPDF from "./adminPDFReducer";
import adminCommunity from "./adminCommunityReducer";
import adminVansh from "./adminVanshReducer";
import adminKul from "./adminKulReducer";
import adminKhamp from "./adminKhampReducer";
import adminGotra from "./adminGotraReducer";
import adminMatrimonial from "./adminMatrimonialReducer";
import adminWalletSettings from "./adminWalletSettingsReducer";
import adminWalletManagement from "./adminWalletManagementReducer";
import adminWithdrawal from "./adminWithdrawalReducer";
import adminEPin from "./adminEPinReducer";
import adminLevelCommission from "./adminLevelCommissionReducer";
import adminDesignation from "./adminDesignationReducer";
import adminAppointment from "./adminAppointmentReducer";
import adminSlot from "./adminSlotReducer";
import adminSbiPro from "./adminSbiProReducer";
import adminCounselling from "./adminCounsellingReducer";
import adminReferral from "./adminReferralReducer";
import adminCountry from "./adminCountryReducer";
import adminState from "./adminStateReducer";
import adminDistrict from "./adminDistrictReducer";
import adminVillage from "./adminVillageReducer";
import adminFamily from "./adminFamilyReducer";
import masterDataDropdown from "./masterDataDropdownReducer";
import locationDropdown from "./locationDropdownReducer";

const rootReducer = combineReducers({
  errors,
  alert,
  adminAuth,
  adminUsers,
  adminSubAdmins,
  adminFamily,
  adminCommonSettings,
  adminDonation,
  common,
  slider: adminSlider,
  gallery: adminGallery,
  video: adminVideo,
  training: adminTrainingVideo,
  news: adminNews,
  pdfs: adminPDF,
  community: adminCommunity,
  vansh: adminVansh,
  kul: adminKul,
  khamp: adminKhamp,
  gotra: adminGotra,
  adminMatrimonial,
  adminWalletSettings,
  adminWalletManagement,
  adminWithdrawal,
  adminEPin,
  adminLevelCommission,
  adminDesignation,
  adminAppointment,
  adminSlot,
  adminSbiPro,
  adminCounselling,
  adminReferral,
  country: adminCountry,
  state: adminState,
  district: adminDistrict,
  village: adminVillage,
  masterDataDropdown,
  locationDropdown,
});

export default rootReducer;
