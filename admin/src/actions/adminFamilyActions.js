import { adminFamilyService } from "@src/services/familyService";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";

import {
  adminFamilyRequest,
  adminFamilyTreeRequest,
  adminFamilyError,
  adminFamilyTargetUserSet,
  adminFamilyFlatSet,
  adminFamilyTreeSet,
} from "@src/reducers/adminFamilyReducer";

const handleApiErrors = (dispatch, errOrRes) => {
  // Only treat tokenStatus as auth failure when we have an actual HTTP error (401/403).
  // Do not logout when this is a success response body with empty data (e.g. list API returned status: false).
  const tokenStatus =
    errOrRes?.response?.data?.tokenStatus ?? errOrRes?.tokenStatus ?? null;
  const isAuthErrorResponse =
    errOrRes?.response?.status === 401 || errOrRes?.response?.status === 403;
  if (tokenStatus === 0 && isAuthErrorResponse) {
    dispatch(adminLogout());
    return;
  }

  const errors = errOrRes?.errors || errOrRes?.response?.data?.errors || [];
  const message =
    errOrRes?.message ||
    errOrRes?.response?.data?.message ||
    errOrRes?.response?.statusText ||
    "Something went wrong";

  if (Array.isArray(errors) && errors.length > 0) {
    errors.forEach((e) =>
      dispatch(setErrorsList(e.msg || e.message || message, e.path)),
    );
  }
  dispatch(setAlert(message, "danger"));
  dispatch(adminFamilyError({ msg: message }));
};

export const resolveFamilyUser =
  ({ memberId, userId }) =>
  async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(removeAlert());
      dispatch(adminFamilyRequest());

      const res = await adminFamilyService.resolveUser({ memberId, userId });
      if (res?.status === true) {
        dispatch(adminFamilyTargetUserSet(res.response));
        dispatch(setAlert("User loaded", "success"));
        return res.response;
      }

      handleApiErrors(dispatch, res);
      return null;
    } catch (err) {
      handleApiErrors(dispatch, err);
      return null;
    }
  };

export const loadUserFamilyFlat = (targetUserId) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(adminFamilyRequest());

    const res = await adminFamilyService.getUserFamilyFlat(targetUserId);
    if (res?.status === true) {
      dispatch(adminFamilyFlatSet(res.response));
      return res.response;
    }

    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    handleApiErrors(dispatch, err);
    return null;
  }
};

export const loadUserFamilyTree = (targetUserId) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(adminFamilyTreeRequest());

    const res = await adminFamilyService.getUserFamilyTree(targetUserId);
    if (res?.status === true) {
      dispatch(adminFamilyTreeSet(res.response));
      return res.response;
    }

    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    handleApiErrors(dispatch, err);
    return null;
  }
};

export const initUserFamily = (targetUserId, payload) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(adminFamilyRequest());

    const res = await adminFamilyService.initUserFamily(targetUserId, payload);
    if (res?.status === true) {
      dispatch(setAlert(res.message || "Family initialized", "success"));
      await dispatch(loadUserFamilyFlat(targetUserId));
      return res.response;
    }

    handleApiErrors(dispatch, res);
    return null;
  } catch (err) {
    handleApiErrors(dispatch, err);
    return null;
  }
};

export const createAdminFamilyMember =
  (targetUserId, payload) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(removeAlert());
      dispatch(adminFamilyRequest());

      const res = await adminFamilyService.createMember(targetUserId, payload);
      if (res?.status === true) {
        dispatch(setAlert("Member created", "success"));
        await dispatch(loadUserFamilyFlat(targetUserId));
        return res.response;
      }

      handleApiErrors(dispatch, res);
      return null;
    } catch (err) {
      handleApiErrors(dispatch, err);
      return null;
    }
  };

export const updateAdminFamilyMember =
  (targetUserId, memberId, payload) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(removeAlert());
      dispatch(adminFamilyRequest());

      const res = await adminFamilyService.updateMember(
        targetUserId,
        memberId,
        payload,
      );
      if (res?.status === true) {
        dispatch(setAlert("Member updated", "success"));
        await dispatch(loadUserFamilyFlat(targetUserId));
        return res.response;
      }

      handleApiErrors(dispatch, res);
      return null;
    } catch (err) {
      handleApiErrors(dispatch, err);
      return null;
    }
  };

export const createAdminFamilyMarriage =
  (targetUserId, payload) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(removeAlert());
      dispatch(adminFamilyRequest());

      const res = await adminFamilyService.createMarriage(
        targetUserId,
        payload,
      );
      if (res?.status === true) {
        dispatch(setAlert("Marriage created", "success"));
        await dispatch(loadUserFamilyFlat(targetUserId));
        return res.response;
      }

      handleApiErrors(dispatch, res);
      return null;
    } catch (err) {
      handleApiErrors(dispatch, err);
      return null;
    }
  };

export const addAdminFamilyChild =
  (targetUserId, marriageId, payload) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(removeAlert());
      dispatch(adminFamilyRequest());

      const res = await adminFamilyService.addChildToMarriage(
        targetUserId,
        marriageId,
        payload,
      );
      if (res?.status === true) {
        dispatch(setAlert("Child added", "success"));
        await dispatch(loadUserFamilyFlat(targetUserId));
        return res.response;
      }

      handleApiErrors(dispatch, res);
      return null;
    } catch (err) {
      handleApiErrors(dispatch, err);
      return null;
    }
  };

export const updateAdminFamilyChildOrder =
  (targetUserId, marriageId, childId, payload) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(removeAlert());
      dispatch(adminFamilyRequest());

      const res = await adminFamilyService.updateChildOrder(
        targetUserId,
        marriageId,
        childId,
        payload,
      );
      if (res?.status === true) {
        dispatch(setAlert("Child order updated", "success"));
        await dispatch(loadUserFamilyFlat(targetUserId));
        await dispatch(loadUserFamilyTree(targetUserId));
        return res.response;
      }

      handleApiErrors(dispatch, res);
      return null;
    } catch (err) {
      handleApiErrors(dispatch, err);
      return null;
    }
  };

export const deleteAdminFamilyMember =
  (targetUserId, memberId, options = {}) =>
  async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(removeAlert());
      dispatch(adminFamilyRequest());

      const res = await adminFamilyService.deleteMember(
        targetUserId,
        memberId,
        options,
      );
      if (res?.status === true) {
        const msg =
          options.mode === "strict"
            ? "Member deleted"
            : "Member and subtree deleted";
        dispatch(setAlert(msg, "success"));
        await dispatch(loadUserFamilyFlat(targetUserId));
        await dispatch(loadUserFamilyTree(targetUserId));
        return res.response;
      }

      handleApiErrors(dispatch, res);
      return null;
    } catch (err) {
      handleApiErrors(dispatch, err);
      return null;
    }
  };

export const updateAdminFamilyMarriage =
  (targetUserId, marriageId, payload) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(removeAlert());
      dispatch(adminFamilyRequest());

      const res = await adminFamilyService.updateMarriage(
        targetUserId,
        marriageId,
        payload,
      );
      if (res?.status === true) {
        dispatch(setAlert("Marriage updated", "success"));
        await dispatch(loadUserFamilyFlat(targetUserId));
        await dispatch(loadUserFamilyTree(targetUserId));
        return res.response;
      }

      handleApiErrors(dispatch, res);
      return null;
    } catch (err) {
      handleApiErrors(dispatch, err);
      return null;
    }
  };
