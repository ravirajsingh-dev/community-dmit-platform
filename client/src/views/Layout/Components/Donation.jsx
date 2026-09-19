import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { connect } from "react-redux";
import {
  getActiveDonationButtons,
  getDonationSettings,
  clearQRCodeState,
} from "@src/actions/donationActions";
import DonationModal from "@src/views/Common/Modal/DonationModal";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import TopDonations from "@src/views/Common/TopDonations";
import { TOP_DONATIONS_LIMIT } from "@src/constants";

const Donation = ({
  getActiveDonationButtons,
  getDonationSettings,
  clearQRCodeState,
  donationButtons,
  donationSettings,
  loadingDonationButtons,
  loadingDonationSettings,
}) => {
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [isFixedAmount, setIsFixedAmount] = useState(false);

  useEffect(() => {
    getActiveDonationButtons();
    getDonationSettings();
  }, [getActiveDonationButtons, getDonationSettings]);

  // Don't render if donation is disabled
  if (!donationSettings.donationEnabled) {
    return null;
  }

  const handleDonateClick = (button) => {
    if (button.type === "ANY") {
      setSelectedAmount(null);
      setIsFixedAmount(false);
    } else {
      setSelectedAmount(button.amount);
      setIsFixedAmount(true);
    }
    setShowUPIModal(true);
  };

  const handleBankDonateClick = () => {
    setSelectedAmount(null);
    setIsFixedAmount(false);
    setShowBankModal(true);
  };

  if (loadingDonationButtons || loadingDonationSettings) {
    return (
      <section className="donation-options-section">
        <Container>
          <BouncingLoader />
        </Container>
      </section>
    );
  }

  return (
    <>
      <section className="donation-options-section">
        <Container>
          {/* HEADER */}
          <div className="donation-options-header">
            <span className="donation-options-tag">MAKE A DIFFERENCE</span>
            <h2 className="donation-options-title">
              Support Our Mission
              <br />
              <span>Empower Communities Together</span>
            </h2>
            {donationSettings.donationMessage ? (
              <p className="donation-options-intro">
                {donationSettings.donationMessage}
              </p>
            ) : (
              <p className="donation-options-intro">
                <strong>100% of your donation</strong> goes directly toward
                student workshops, sports equipment, and counseling sessions.
              </p>
            )}
          </div>

          {/* UPI DONATION BUTTONS */}
          <div className="donation-section__upi">
            <div className="donation-section__upi-header">
              <h3 className="donation-options-subtitle">Donate via UPI</h3>
              <p className="donation-section__upi-text">
                Choose an amount below and donate instantly using any UPI app.
              </p>
            </div>
            <Row className="donation-options-buttons">
              {donationButtons
                .filter((btn) => btn.isActive)
                .map((button) => (
                  <Col
                    key={button._id}
                    xs={6}
                    sm={4}
                    md={3}
                    lg={3}
                    className="mb-3 donation-options-buttons__col"
                  >
                    <Button
                      variant="primary"
                      className="donation-amount-button w-100"
                      onClick={() => handleDonateClick(button)}
                    >
                      {button.type === "ANY" ? (
                        <div className="donation-amount-value">
                          {button.buttonText || "Donate Any Other Amount"}
                        </div>
                      ) : (
                        <>
                          <div className="donation-amount-value">
                            ₹{button.amount}
                          </div>
                          {button.buttonText && (
                            <div className="donation-amount-label">
                              {button.buttonText}
                            </div>
                          )}
                        </>
                      )}
                    </Button>
                  </Col>
                ))}
            </Row>
          </div>

          {/* BANK DONATION SECTION */}
          <div className="donation-bank-section mt-5">
            <h3 className="donation-options-subtitle">
              Donate via Bank Transfer
            </h3>
            <Row>
              <Col md={8} className="mx-auto">
                <div className="donation-bank-details">
                  <p className="mb-3">
                    Prefer traditional banking? You can safely donate directly
                    to our bank account. Click the button below to view bank
                    details and submit your donation request for verification.
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    className="donation-bank-action-button"
                    onClick={handleBankDonateClick}
                  >
                    Donate via Bank Transfer
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          {/* TOP DONATIONS SECTION */}
          <div className="donation-top-donations-section mt-5">
            <h3 className="donation-options-subtitle">
              Top {TOP_DONATIONS_LIMIT} Donations
            </h3>
            <Row>
              <Col md={10} className="mx-auto">
                <TopDonations limit={TOP_DONATIONS_LIMIT} />
              </Col>
            </Row>
          </div>
        </Container>
      </section>

      {/* UPI DONATION MODAL */}
      <DonationModal
        show={showUPIModal}
        handleClose={() => {
          clearQRCodeState();
          setShowUPIModal(false);
          setSelectedAmount(null);
        }}
        paymentMode="UPI"
        initialAmount={selectedAmount}
        isFixedAmount={isFixedAmount}
        donationSettings={donationSettings}
      />

      {/* BANK DONATION MODAL */}
      <DonationModal
        show={showBankModal}
        handleClose={() => {
          setShowBankModal(false);
          setSelectedAmount(null);
        }}
        paymentMode="BANK"
        initialAmount={null}
        isFixedAmount={false}
        donationSettings={donationSettings}
      />
    </>
  );
};

const mapStateToProps = (state) => ({
  donationButtons: state.donation.donationButtons,
  donationSettings: state.donation.donationSettings,
  loadingDonationButtons: state.donation.loadingDonationButtons,
  loadingDonationSettings: state.donation.loadingDonationSettings,
});

export default connect(mapStateToProps, {
  getActiveDonationButtons,
  getDonationSettings,
  clearQRCodeState,
})(Donation);
