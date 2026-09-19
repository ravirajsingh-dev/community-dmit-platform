import { setErrors } from "@reducers/errors";

export const setErrorsList =
  (msg, err_key = "") =>
  (dispatch) => {
    dispatch(setErrors({ [err_key]: msg }));
  };
