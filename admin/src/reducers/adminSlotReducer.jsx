import {
  ADMIN_SLOTS_REQUEST,
  ADMIN_SLOTS_SUCCESS,
  ADMIN_SLOTS_ERROR,
  ADMIN_SLOT_CREATE_REQUEST,
  ADMIN_SLOT_CREATE_SUCCESS,
  ADMIN_SLOT_CREATE_ERROR,
  ADMIN_SLOT_UPDATE_REQUEST,
  ADMIN_SLOT_UPDATE_SUCCESS,
  ADMIN_SLOT_UPDATE_ERROR,
  ADMIN_SLOT_TOGGLE_REQUEST,
  ADMIN_SLOT_TOGGLE_SUCCESS,
  ADMIN_SLOT_TOGGLE_ERROR,
} from "@src/actions/adminSlotActions";

const initialState = {
  slots: [],
  pagination: {},
  designations: [],
  loading: false,
  processing: false,
};

export default function adminSlotReducer(state = initialState, action) {
  switch (action.type) {
    case ADMIN_SLOTS_REQUEST:
      return { ...state, loading: true };
    case ADMIN_SLOTS_SUCCESS:
      return {
        ...state,
        loading: false,
        slots: action.payload.slots || [],
        pagination: action.payload.pagination || {},
        designations: action.payload.designations || [],
      };
    case ADMIN_SLOTS_ERROR:
      return { ...state, loading: false };

    case ADMIN_SLOT_CREATE_REQUEST:
    case ADMIN_SLOT_UPDATE_REQUEST:
    case ADMIN_SLOT_TOGGLE_REQUEST:
      return { ...state, processing: true };
    case ADMIN_SLOT_CREATE_SUCCESS:
    case ADMIN_SLOT_CREATE_ERROR:
    case ADMIN_SLOT_UPDATE_SUCCESS:
    case ADMIN_SLOT_UPDATE_ERROR:
    case ADMIN_SLOT_TOGGLE_SUCCESS:
    case ADMIN_SLOT_TOGGLE_ERROR:
      return { ...state, processing: false };

    default:
      return state;
  }
}
