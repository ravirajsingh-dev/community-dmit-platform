import { combineReducers } from "redux";

import errors from "./errors";
import alert from "./alert";
import auth from "./auth";

// Users section
import common from "./commonReducer";
import donation from "./donationReducer";
import profile from "./profileReducer";
import family from "./familyReducer";

// Dropdown data
import locationDropdown from "./locationDropdownReducer";
import masterDataDropdown from "./masterDataDropdownReducer";

// Search Member
import searchMember from "./searchMemberReducer";
import matrimonial from "./matrimonialReducer";
import wallet from "./walletReducer";
import withdrawal from "./withdrawalReducer";
import team from "./teamReducer";
import designation from "./designationReducer";
import appointment from "./appointmentReducer";
import sbiPro from "./sbiProReducer";
import counselling from "./counsellingReducer";
import trainingVideo from "./trainingVideoReducer";
import rank from "./rankReducer";

const rootReducer = combineReducers({
  errors,
  alert,
  auth,
  common,
  donation,
  profile,
  family,
  locationDropdown,
  masterDataDropdown,
  searchMember,
  matrimonial,
  wallet,
  withdrawal,
  team,
  designation,
  appointment,
  sbiPro,
  counselling,
  trainingVideo,
  rank,
});

export default rootReducer;
