import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { removeAlertMsg } from "@reducers/alert";

const ShowAlert = ({ alerts = [], toastOptions = {}, dispatch }) => {
  const shownRef = useRef(null);

  useEffect(() => {
    if (!alerts?.length) {
      shownRef.current = null;
      return;
    }
    const key = alerts.map((a) => `${a.alertType}:${a.msg}`).join("|");
    // Prevent duplicate display (e.g. React Strict Mode double-invoke)
    if (shownRef.current === key) return;
    shownRef.current = key;

    alerts.forEach((alert) => {
      if (!alert.alertType || !alert.msg) return;
      const opts = { ...toastOptions, toastId: `${alert.alertType}-${alert.msg}` };
      switch (alert.alertType) {
        case "info":
          toast.info(alert.msg, opts);
          break;
        case "success":
          toast.success(alert.msg, opts);
          break;
        case "warning":
          toast.warning(alert.msg, opts);
          break;
        case "error":
        case "danger":
          toast.error(alert.msg, opts);
          break;
        default:
          break;
      }
    });
    dispatch(removeAlertMsg());
  }, [alerts, dispatch]);

  return <ToastContainer />;
};

ShowAlert.propTypes = {
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      alertType: PropTypes.string.isRequired,
      msg: PropTypes.string.isRequired,
    })
  ),
  toastOptions: PropTypes.object,
};

const mapStateToProps = (state) => ({
  alerts: state.alert,
});

export default connect(mapStateToProps)(ShowAlert);
