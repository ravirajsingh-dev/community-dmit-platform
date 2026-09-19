import { createSlice } from "@reduxjs/toolkit";

const errorSlice = createSlice({
  name: "errors",
  initialState: {},
  reducers: {
    setErrors(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
    removeErrors(state, action) {
      return (state = {});
    },
  },
});

export const { setErrors, removeErrors } = errorSlice.actions;

export default errorSlice.reducer;
