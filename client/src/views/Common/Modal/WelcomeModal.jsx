import React from "react";
import PropTypes from "prop-types";
import { Col, Modal, Button, Badge } from "react-bootstrap";
import { connect } from "react-redux";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import CopyIcon from "../CopyIcon";
import { setAlert } from "@src/actions/alert";

const WelcomeModal = ({
  show,
  onHide,
  name,
  memberId,
  password,
  userStatus,
  setAlert,
  common: { commonSettings },
}) => {
  const handleCopyMemberId = () => {
    navigator.clipboard.writeText(memberId);
    setAlert("Member ID copied to clipboard", "success");
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    setAlert("Password copied to clipboard", "success");
  };

  const appName = commonSettings?.abbreviation || "";
  const isActive = userStatus === 1; // 1 = Active, 4 = Guest

  return (
    <Modal
      show={show}
      size="sm"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      className="logout-modal"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header className="logout-modal-header" closeButton={false}>
        <Modal.Title className="logout-modal-title">
          {isActive ? (
            <FaCheckCircle className="logout-icon welcome-icon-success" />
          ) : (
            <FaExclamationCircle className="logout-icon welcome-icon-warning" />
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="logout-modal-body text-preserve-line-breaks">
        <p>
          <strong>
            {isActive ? `Congratulations ${name}!` : `Welcome ${name}!`}
          </strong>
        </p>

        {isActive ? (
          <p>
            You have successfully registered for the Community Portal
            {appName && (
              <>
                &nbsp;by&nbsp;
                <strong>{appName.toUpperCase()}</strong>
              </>
            )}
            . Your payment has been processed and your account is now{" "}
            <strong>ACTIVE</strong>.
          </p>
        ) : (
          <p>
            You have registered for the Community Portal
            {appName && (
              <>
                &nbsp;by&nbsp;
                <strong>{appName.toUpperCase()}</strong>
              </>
            )}
            . However, your payment is incomplete. Please complete the payment
            to activate your account.
          </p>
        )}

        <div className="d-grid welcome-credentials-section">
          <div className="welcome-credential-item">
            <span className="wallet-label">Member ID:</span>{" "}
            <span className="wallet-value">
              {memberId}
              <CopyIcon textToCopy={memberId} onCopy={handleCopyMemberId} />
            </span>
          </div>
          <div className="welcome-credential-item">
            <span className="wallet-label">Password:</span>{" "}
            <span className="wallet-value">
              {password}
              <CopyIcon textToCopy={password} onCopy={handleCopyPassword} />
            </span>
          </div>
          <div className="welcome-status-badge">
            <Badge bg={isActive ? "success" : "warning"}>
              Status: {isActive ? "ACTIVE" : "GUEST"}
            </Badge>
          </div>
        </div>

        {isActive ? (
          <p>
            Thank you for joining our community platform! Together, we can unite
            communities, support education, sports, culture, and make a
            meaningful impact through donations and social initiatives.
          </p>
        ) : (
          <p className="welcome-guest-message">
            Please complete your payment to activate your account and access all
            features. You can log in with the credentials above and complete the
            payment from your dashboard.
          </p>
        )}
      </Modal.Body>

      <Modal.Footer className="logout-modal-footer">
        <Col className="text-center">
          <Button type="button" className="btn-logout-cancel" onClick={onHide}>
            {isActive ? "Go to Login" : "Close"}
          </Button>
        </Col>
      </Modal.Footer>
    </Modal>
  );
};

WelcomeModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  memberId: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  userStatus: PropTypes.number.isRequired,
  setAlert: PropTypes.func.isRequired,
  common: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { setAlert })(WelcomeModal);
