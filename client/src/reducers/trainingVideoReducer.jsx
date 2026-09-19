import {
  TRAINING_VIDEOS_REQUEST,
  TRAINING_VIDEOS_SUCCESS,
  TRAINING_VIDEOS_ERROR,
} from "@src/actions/trainingVideoActions";

const initialState = {
  videos: [],
  loading: false,
  error: null,
};

export default function trainingVideoReducer(state = initialState, action) {
  switch (action.type) {
    case TRAINING_VIDEOS_REQUEST:
      return { ...state, loading: true, error: null };
    case TRAINING_VIDEOS_SUCCESS:
      return { ...state, loading: false, videos: action.payload || [] };
    case TRAINING_VIDEOS_ERROR:
      return { ...state, loading: false, error: action.payload || { message: "Failed to load training videos" } };
    default:
      return state;
  }
}

