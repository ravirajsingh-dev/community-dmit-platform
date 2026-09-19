import {
  SBI_PRO_ASSIGNED_REQUEST,
  SBI_PRO_ASSIGNED_SUCCESS,
  SBI_PRO_ASSIGNED_ERROR,
  SBI_PRO_SESSION_REQUEST,
  SBI_PRO_SESSION_SUCCESS,
  SBI_PRO_SESSION_ERROR,
  SBI_PRO_UPLOAD_REQUEST,
  SBI_PRO_UPLOAD_SUCCESS,
  SBI_PRO_UPLOAD_ERROR,
  SBI_PRO_SUBMIT_REQUEST,
  SBI_PRO_SUBMIT_SUCCESS,
  SBI_PRO_SUBMIT_ERROR,
  SBI_PRO_PENDING_VERIFICATION_REQUEST,
  SBI_PRO_PENDING_VERIFICATION_SUCCESS,
  SBI_PRO_PENDING_VERIFICATION_ERROR,
  SBI_PRO_VERIFY_REQUEST,
  SBI_PRO_VERIFY_SUCCESS,
  SBI_PRO_VERIFY_ERROR,
  SBI_PRO_REPORTS_REQUEST,
  SBI_PRO_REPORTS_SUCCESS,
  SBI_PRO_REPORTS_ERROR,
  SBI_PRO_CLIENT_REPORTS_REQUEST,
  SBI_PRO_CLIENT_REPORTS_SUCCESS,
  SBI_PRO_CLIENT_REPORTS_ERROR,
} from "@src/constants/sbiProActionTypes";

const initialState = {
  assignedSessions: [],
  assignedPagination: {},
  loadingAssigned: false,
  currentSession: null,
  loadingSession: false,
  uploading: false,
  uploadingFinger: null,
  submitting: false,
  pendingVerificationSessions: [],
  loadingPendingVerification: false,
  verifying: false,
  myReports: [],
  loadingReports: false,
  clientReports: [],
  loadingClientReports: false,
};

export default function sbiProReducer(state = initialState, action) {
  switch (action.type) {
    case SBI_PRO_ASSIGNED_REQUEST:
      return { ...state, loadingAssigned: true };
    case SBI_PRO_ASSIGNED_SUCCESS:
      return {
        ...state,
        loadingAssigned: false,
        assignedSessions: action.payload?.sessions || [],
        assignedPagination: action.payload?.pagination || {},
      };
    case SBI_PRO_ASSIGNED_ERROR:
      return { ...state, loadingAssigned: false };

    case SBI_PRO_SESSION_REQUEST:
      return { ...state, loadingSession: true };
    case SBI_PRO_SESSION_SUCCESS:
      return {
        ...state,
        loadingSession: false,
        currentSession: action.payload?.session || null,
      };
    case SBI_PRO_SESSION_ERROR:
      return { ...state, loadingSession: false };

    case SBI_PRO_UPLOAD_REQUEST:
      return {
        ...state,
        uploading: true,
        uploadingFinger: action.meta?.fingerType || null,
      };
    case SBI_PRO_UPLOAD_SUCCESS:
      return {
        ...state,
        uploading: false,
        uploadingFinger: null,
        currentSession: action.payload?.session || state.currentSession,
      };
    case SBI_PRO_UPLOAD_ERROR:
      return {
        ...state,
        uploading: false,
        uploadingFinger: null,
      };

    case SBI_PRO_SUBMIT_REQUEST:
      return { ...state, submitting: true };
    case SBI_PRO_SUBMIT_SUCCESS:
      return {
        ...state,
        submitting: false,
        currentSession: action.payload?.session || state.currentSession,
      };
    case SBI_PRO_SUBMIT_ERROR:
      return { ...state, submitting: false };

    case SBI_PRO_PENDING_VERIFICATION_REQUEST:
      return { ...state, loadingPendingVerification: true };
    case SBI_PRO_PENDING_VERIFICATION_SUCCESS:
      return {
        ...state,
        loadingPendingVerification: false,
        pendingVerificationSessions: action.payload?.sessions || [],
      };
    case SBI_PRO_PENDING_VERIFICATION_ERROR:
      return { ...state, loadingPendingVerification: false };

    case SBI_PRO_VERIFY_REQUEST:
      return { ...state, verifying: true };
    case SBI_PRO_VERIFY_SUCCESS: {
      const verifiedAptId = action.payload?.session?.appointmentId;
      const aid = typeof verifiedAptId === "object" ? verifiedAptId?._id : verifiedAptId;
      return {
        ...state,
        verifying: false,
        pendingVerificationSessions: (state.pendingVerificationSessions || []).filter(
          (s) => {
            const sAid = typeof s.appointmentId === "object" ? s.appointmentId?._id : s.appointmentId;
            return String(sAid) !== String(aid);
          }
        ),
      };
    }
    case SBI_PRO_VERIFY_ERROR:
      return { ...state, verifying: false };

    case SBI_PRO_REPORTS_REQUEST:
      return { ...state, loadingReports: true };
    case SBI_PRO_REPORTS_SUCCESS:
      return { ...state, loadingReports: false, myReports: action.payload?.sessions || [] };
    case SBI_PRO_REPORTS_ERROR:
      return { ...state, loadingReports: false };

    case SBI_PRO_CLIENT_REPORTS_REQUEST:
      return { ...state, loadingClientReports: true };
    case SBI_PRO_CLIENT_REPORTS_SUCCESS:
      return { ...state, loadingClientReports: false, clientReports: action.payload?.sessions || [] };
    case SBI_PRO_CLIENT_REPORTS_ERROR:
      return { ...state, loadingClientReports: false };

    default:
      return state;
  }
}
