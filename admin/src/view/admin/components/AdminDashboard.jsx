import React from "react";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { Container, Row } from "react-bootstrap";

const AdminDashboard = ({}) => {
  return (
    <Container fluid>
      <Row className="card-dashboard-container">Admin Dashboard</Row>
    </Container>
  );
};

AdminDashboard.propTypes = {
  adminAuth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  adminAuth: state.adminAuth,
});

export default connect(mapStateToProps, {})(AdminDashboard);
