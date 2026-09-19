import {
  ADMIN_APPOINTMENTS_REQUEST,
  ADMIN_APPOINTMENTS_SUCCESS,
  ADMIN_APPOINTMENTS_ERROR,
  ADMIN_APPOINTMENT_APPROVE_CANCEL_REQUEST,
  ADMIN_APPOINTMENT_APPROVE_CANCEL_SUCCESS,
  ADMIN_APPOINTMENT_APPROVE_CANCEL_ERROR,
  ADMIN_APPOINTMENT_REJECT_CANCEL_REQUEST,
  ADMIN_APPOINTMENT_REJECT_CANCEL_SUCCESS,
  ADMIN_APPOINTMENT_REJECT_CANCEL_ERROR,
  ADMIN_APPOINTMENT_CANCEL_REQUEST,
  ADMIN_APPOINTMENT_CANCEL_SUCCESS,
  ADMIN_APPOINTMENT_CANCEL_ERROR,
} from "@src/actions/adminAppointmentActions";

const initialState = {
  appointments: [],
  pagination: {},
  designations: [],
  loading: false,
  processing: false,
};

export default function adminAppointmentReducer(
  state = initialState,
  action
) {
  switch (action.type) {
    case ADMIN_APPOINTMENTS_REQUEST:
      return { ...state, loading: true };
    case ADMIN_APPOINTMENTS_SUCCESS:
      return {
        ...state,
        loading: false,
        appointments: action.payload.appointments || [],
        pagination: action.payload.pagination || {},
        designations: action.payload.designations || [],
      };
    case ADMIN_APPOINTMENTS_ERROR:
      return { ...state, loading: false };

    case ADMIN_APPOINTMENT_APPROVE_CANCEL_REQUEST:
    case ADMIN_APPOINTMENT_REJECT_CANCEL_REQUEST:
    case ADMIN_APPOINTMENT_CANCEL_REQUEST:
      return { ...state, processing: true };
    case ADMIN_APPOINTMENT_APPROVE_CANCEL_SUCCESS:
    case ADMIN_APPOINTMENT_APPROVE_CANCEL_ERROR:
    case ADMIN_APPOINTMENT_REJECT_CANCEL_SUCCESS:
    case ADMIN_APPOINTMENT_REJECT_CANCEL_ERROR:
    case ADMIN_APPOINTMENT_CANCEL_SUCCESS:
    case ADMIN_APPOINTMENT_CANCEL_ERROR:
      return { ...state, processing: false };

    default:
      return state;
  }
}
