import {
  DESIGNATION_ELIGIBILITY_REQUEST,
  DESIGNATION_ELIGIBILITY_SUCCESS,
  DESIGNATION_ELIGIBILITY_ERROR,
  DESIGNATION_APPLY_REQUEST,
  DESIGNATION_APPLY_SUCCESS,
  DESIGNATION_APPLY_ERROR,
  SET_DESIGNATION_ONLINE,
} from "@src/actions/designationActions";

const initialState = {
  designations: [],
  directCount: 0,
  totalDownlineCount: 0,
  monthlyDirectCount: 0,
  isSbiProLocked: false,
  freeSessionInfo: {},
  hasCompleteAddress: false,
  loadingEligibility: false,
  applying: false,
};

export default function designationReducer(
  state = initialState,
  action
) {
  switch (action.type) {
    case DESIGNATION_ELIGIBILITY_REQUEST:
      return { ...state, loadingEligibility: true };
    case DESIGNATION_ELIGIBILITY_SUCCESS:
      return {
        ...state,
        loadingEligibility: false,
        designations: action.payload.designations || [],
        directCount: action.payload.directCount ?? 0,
        totalDownlineCount: action.payload.totalDownlineCount ?? 0,
        monthlyDirectCount: action.payload.monthlyDirectCount ?? 0,
        isSbiProLocked: action.payload.isSbiProLocked ?? false,
        freeSessionInfo: action.payload.freeSessionInfo ?? {},
        hasCompleteAddress: action.payload.hasCompleteAddress ?? false,
      };
    case DESIGNATION_ELIGIBILITY_ERROR:
      return { ...state, loadingEligibility: false };

    case DESIGNATION_APPLY_REQUEST:
      return { ...state, applying: true };
    case DESIGNATION_APPLY_SUCCESS:
    case DESIGNATION_APPLY_ERROR:
      return { ...state, applying: false };

    case SET_DESIGNATION_ONLINE: {
      const { designationCode, online } = action.payload || {};
      if (designationCode == null || typeof online !== "boolean") return state;
      const designations = (state.designations || []).map((d) =>
        d.designationCode === designationCode ? { ...d, online } : d
      );
      return { ...state, designations };
    }

    default:
      return state;
  }
}
