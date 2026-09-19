import { familyService } from "@src/services/familyService";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";

import {
  FAMILY_REQUEST,
  FAMILY_TREE_REQUEST,
  FAMILY_SET,
  FAMILY_FLAT_SET,
  FAMILY_TREE_SET,
  FAMILY_FAIL,
} from "@src/reducers/familyReducer";

const handleApiErrors = (dispatch, dataOrError) => {
  const errors = dataOrError?.errors || dataOrError?.response?.data?.errors || [];
  const firstErrorMsg = Array.isArray(errors) && errors[0] ? (errors[0].msg ?? errors[0].message) : null;
  const message =
    dataOrError?.response?.data?.message ||
    dataOrError?.message ||
    firstErrorMsg ||
    dataOrError?.response?.statusText ||
    "Something went wrong";

  if (Array.isArray(errors) && errors.length > 0) {
    errors.forEach((e) => dispatch(setErrorsList(e.msg || e.message || message, e.path)));
  }
  dispatch(setAlert(message, "danger"));
  dispatch(FAMILY_FAIL(message));
};

export const initFamily = (payload) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_REQUEST());
    const res = await familyService.initFamily(payload);
    if (res?.status === true) {
      dispatch(FAMILY_SET(res.response));
      dispatch(setAlert(res.message || "Family initialized", "success"));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    handleApiErrors(dispatch, err);
    return null;
  }
};

export const getFamilyFlat = (params = {}) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_REQUEST());
    const res = await familyService.getFamilyFlat(params);
    if (res?.status === true) {
      dispatch(FAMILY_FLAT_SET(res.response));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    handleApiErrors(dispatch, err);
    return null;
  }
};

export const getFamilyTree = () => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_TREE_REQUEST());
    const res = await familyService.getFamilyTree();
    if (res?.status === true) {
      dispatch(FAMILY_TREE_SET(res.response));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    handleApiErrors(dispatch, err);
    return null;
  }
};

export const createFamilyMemberAction = (payload) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_REQUEST());
    const res = await familyService.createMember(payload);
    if (res?.status === true) {
      dispatch(setAlert("Member created", "success"));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    handleApiErrors(dispatch, err);
    return null;
  }
};

export const updateFamilyMemberAction = (memberId, payload) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_REQUEST());
    const res = await familyService.updateMember(memberId, payload);
    if (res?.status === true) {
      dispatch(setAlert("Member updated", "success"));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    handleApiErrors(dispatch, err);
    return null;
  }
};

export const createFamilyMarriageAction = (payload) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_REQUEST());
    const res = await familyService.createMarriage(payload);
    if (res?.status === true) {
      dispatch(setAlert("Marriage created", "success"));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    const validationError = err?.response?.status === 400;
    handleApiErrors(dispatch, err);
    return { ok: false, validationError };
  }
};

export const addChildToMarriageAction = (marriageId, payload) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_REQUEST());
    const res = await familyService.addChildToMarriage(marriageId, payload);
    if (res?.status === true) {
      dispatch(setAlert("Child added", "success"));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    return { ok: false, validationError: res?.response?.status === 400 };
  } catch (err) {
    const validationError = err?.response?.status === 400;
    handleApiErrors(dispatch, err);
    return { ok: false, validationError };
  }
};

export const updateChildOrderAction = (marriageId, childId, payload) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_REQUEST());
    const res = await familyService.updateChildOrder(marriageId, childId, payload);
    if (res?.status === true) {
      dispatch(setAlert("Child order updated", "success"));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    throw new Error(res?.message || "Child order update failed");
  } catch (err) {
    handleApiErrors(dispatch, err);
    throw err;
  }
};

export const updateMarriageAction = (marriageId, payload) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_REQUEST());
    const res = await familyService.updateMarriage(marriageId, payload);
    if (res?.status === true) {
      dispatch(setAlert("Marriage updated", "success"));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    handleApiErrors(dispatch, err);
    return null;
  }
};

export const deleteFamilyMemberAction = (memberId, options = {}) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(FAMILY_REQUEST());
    const res = await familyService.deleteMember(memberId, options);
    if (res?.status === true) {
      const msg =
        options.mode === "strict"
          ? "Member deleted"
          : "Member and subtree deleted";
      dispatch(setAlert(msg, "success"));
      return res.response;
    }
    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    if (err?.response?.status === 400 && err?.response?.data?.errors?.[0]?.msg) {
      dispatch(setAlert(err.response.data.errors[0].msg, "danger"));
      dispatch(FAMILY_FAIL(err.response.data.errors[0].msg));
      return null;
    }
    handleApiErrors(dispatch, err);
    return null;
  }
};

