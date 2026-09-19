import {
  FaCalendarAlt,
  FaClipboardList,
  FaUserCheck,
  FaHandPaper,
  FaComments,
} from "react-icons/fa";

/**
 * Appointment section icons – consistent SVG icons instead of emoji
 */
const AppointmentIcons = {
  calendar: FaCalendarAlt,
  clipboard: FaClipboardList,
  personCheck: FaUserCheck,
  fingerprint: FaHandPaper,
  counselling: FaComments,
};

export const getAppointmentIcon = (key) => AppointmentIcons[key] || null;
