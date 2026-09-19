import {
  APPOINTMENT_HOLDERS_REQUEST,
  APPOINTMENT_HOLDERS_SUCCESS,
  APPOINTMENT_HOLDERS_ERROR,
  APPOINTMENT_BOOK_REQUEST,
  APPOINTMENT_BOOK_SUCCESS,
  APPOINTMENT_BOOK_ERROR,
  APPOINTMENT_MY_REQUEST,
  APPOINTMENT_MY_SUCCESS,
  APPOINTMENT_MY_ERROR,
  APPOINTMENT_CANCEL_REQUEST,
  APPOINTMENT_CANCEL_SUCCESS,
  APPOINTMENT_CANCEL_ERROR,
  APPOINTMENT_RATE_REQUEST,
  APPOINTMENT_RATE_SUCCESS,
  APPOINTMENT_RATE_ERROR,
  APPOINTMENT_ASSIGNED_REQUEST,
  APPOINTMENT_ASSIGNED_SUCCESS,
  APPOINTMENT_ASSIGNED_ERROR,
  APPOINTMENT_ACCEPT_REQUEST,
  APPOINTMENT_ACCEPT_SUCCESS,
  APPOINTMENT_ACCEPT_ERROR,
  APPOINTMENT_COMPLETE_REQUEST,
  APPOINTMENT_COMPLETE_SUCCESS,
  APPOINTMENT_COMPLETE_ERROR,
  APPOINTMENT_REJECT_REQUEST,
  APPOINTMENT_REJECT_SUCCESS,
  APPOINTMENT_REJECT_ERROR,
  APPOINTMENT_REQUEST_CANCEL_REQUEST,
  APPOINTMENT_REQUEST_CANCEL_SUCCESS,
  APPOINTMENT_REQUEST_CANCEL_ERROR,
  APPOINTMENT_TOGGLE_ONLINE_REQUEST,
  APPOINTMENT_TOGGLE_ONLINE_SUCCESS,
  APPOINTMENT_TOGGLE_ONLINE_ERROR,
  SET_APPLIED_PARAMS_BOOK_APPOINTMENT,
  SET_APPLIED_PARAMS_MY_BOOKINGS,
  SET_APPLIED_PARAMS_ASSIGNED_TO_ME,
} from "@src/actions/appointmentActions";

const initialState = {
  holders: [],
  holdersPagination: {},
  holdersDesignationCode: null,
  loadingHolders: false,
  booking: false,
  appliedParamsBookAppointment: null,
  appliedParamsMyBookings: null,
  appliedParamsAssignedToMe: null,
  myAppointments: [],
  myPagination: {},
  loadingMy: false,
  cancelling: false,
  rating: false,
  assignedAppointments: [],
  assignedPagination: {},
  loadingAssigned: false,
  accepting: false,
  completing: false,
  rejecting: false,
  requestingCancel: false,
  togglingOnline: false,
};

export default function appointmentReducer(
  state = initialState,
  action
) {
  switch (action.type) {
    case APPOINTMENT_HOLDERS_REQUEST:
      return { ...state, loadingHolders: true };
    case APPOINTMENT_HOLDERS_SUCCESS:
      return {
        ...state,
        loadingHolders: false,
        holders: action.payload.holders || [],
        holdersPagination: action.payload.pagination || {},
        holdersDesignationCode: action.payload.designationCode,
      };
    case APPOINTMENT_HOLDERS_ERROR:
      return { ...state, loadingHolders: false };

    case APPOINTMENT_BOOK_REQUEST:
      return { ...state, booking: true };
    case APPOINTMENT_BOOK_SUCCESS:
    case APPOINTMENT_BOOK_ERROR:
      return { ...state, booking: false };

    case APPOINTMENT_MY_REQUEST:
      return { ...state, loadingMy: true };
    case APPOINTMENT_MY_SUCCESS:
      return {
        ...state,
        loadingMy: false,
        myAppointments: action.payload.appointments || [],
        myPagination: action.payload.pagination || {},
      };
    case APPOINTMENT_MY_ERROR:
      return { ...state, loadingMy: false };

    case APPOINTMENT_CANCEL_REQUEST:
      return { ...state, cancelling: true };
    case APPOINTMENT_CANCEL_SUCCESS:
    case APPOINTMENT_CANCEL_ERROR:
      return { ...state, cancelling: false };

    case APPOINTMENT_RATE_REQUEST:
      return { ...state, rating: true };
    case APPOINTMENT_RATE_SUCCESS:
    case APPOINTMENT_RATE_ERROR:
      return { ...state, rating: false };

    case APPOINTMENT_ASSIGNED_REQUEST:
      return { ...state, loadingAssigned: true };
    case APPOINTMENT_ASSIGNED_SUCCESS:
      return {
        ...state,
        loadingAssigned: false,
        assignedAppointments: action.payload.appointments || [],
        assignedPagination: action.payload.pagination || {},
      };
    case APPOINTMENT_ASSIGNED_ERROR:
      return { ...state, loadingAssigned: false };

    case APPOINTMENT_ACCEPT_REQUEST:
      return { ...state, accepting: true };
    case APPOINTMENT_ACCEPT_SUCCESS:
    case APPOINTMENT_ACCEPT_ERROR:
      return { ...state, accepting: false };

    case APPOINTMENT_COMPLETE_REQUEST:
      return { ...state, completing: true };
    case APPOINTMENT_COMPLETE_SUCCESS:
    case APPOINTMENT_COMPLETE_ERROR:
      return { ...state, completing: false };

    case APPOINTMENT_REJECT_REQUEST:
      return { ...state, rejecting: true };
    case APPOINTMENT_REJECT_SUCCESS:
    case APPOINTMENT_REJECT_ERROR:
      return { ...state, rejecting: false };

    case APPOINTMENT_REQUEST_CANCEL_REQUEST:
      return { ...state, requestingCancel: true };
    case APPOINTMENT_REQUEST_CANCEL_SUCCESS:
    case APPOINTMENT_REQUEST_CANCEL_ERROR:
      return { ...state, requestingCancel: false };

    case APPOINTMENT_TOGGLE_ONLINE_REQUEST:
      return { ...state, togglingOnline: true };
    case APPOINTMENT_TOGGLE_ONLINE_SUCCESS:
    case APPOINTMENT_TOGGLE_ONLINE_ERROR:
      return { ...state, togglingOnline: false };

    case SET_APPLIED_PARAMS_BOOK_APPOINTMENT:
      return { ...state, appliedParamsBookAppointment: action.payload };
    case SET_APPLIED_PARAMS_MY_BOOKINGS:
      return { ...state, appliedParamsMyBookings: action.payload };
    case SET_APPLIED_PARAMS_ASSIGNED_TO_ME:
      return { ...state, appliedParamsAssignedToMe: action.payload };

    default:
      return state;
  }
}
