import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  pdfDocumentCreated,
  resetPDF,
  pdfListUpdated,
  pdfUpdated,
  pdfDeleted,
  pdfError,
  pdfSearchParameterUpdate,
  loadingOnPDFSubmit,
  loadingPDFList,
} from "@reducers/adminPDFReducer";

export const getPDFs = (pdfParams) => async (dispatch) => {
  try {
    const config = {
      "Content-Type": "application/json",
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach((key) => {
            if (params[key] !== null && params[key] !== undefined) {
              searchParams.append(key, params[key]);
            }
          });
          return searchParams.toString();
        },
      },
    };

    const query = pdfParams.query ? pdfParams.query : {};
    pdfParams.query = query;
    config.params = pdfParams;

    dispatch(loadingPDFList());

    const res = await api.get(`/api/admin/pdfs`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(pdfSearchParameterUpdate(pdfParams));
      dispatch(pdfListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching PDFs";
      dispatch(pdfError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        pdfError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching PDFs";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const createPDF = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    dispatch(loadingOnPDFSubmit());

    const res = await api.post(`/api/admin/pdfs`, formData, config);
    if (res.data.status === true) {
      dispatch(pdfDocumentCreated(res.data.response));
      dispatch(setAlert("PDF document uploaded successfully.", "success"));
      if (navigate) {
        navigate(`/admin/pdfs`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(pdfError());
        dispatch(setAlert(res.data.message, "danger"));

        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          pdfError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      dispatch(setAlert(err.response?.message || "Error uploading PDF", "danger"));
    }
  }
};

export const updatePDF = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": formData instanceof FormData ? "multipart/form-data" : "application/json",
      },
    };
    const res = await api.put(`/api/admin/pdfs/${id}`, formData, config);
    if (res.data.status === true) {
      dispatch(pdfUpdated(res.data.response));
      dispatch(setAlert("PDF document updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/pdfs`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(pdfError());
        dispatch(setAlert(res.data.message, "danger"));

        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          pdfError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      dispatch(setAlert(err.response?.message || "Error updating PDF", "danger"));
    }
  }
};

export const deletePDF = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/pdfs/${id}`, config);

    dispatch(pdfDeleted(id));
    dispatch(setAlert("PDF document deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        pdfError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.message || "Error deleting PDF", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetPDF());
};

export const removePDFErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};
