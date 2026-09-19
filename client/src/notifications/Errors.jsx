import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Form } from "react-bootstrap";

const Errors = ({ errorList, current_key }) => {
  if (current_key in errorList) {
    return (
      <Form.Text className="form-error-message">
        {errorList[current_key]}
      </Form.Text>
    );
  }
  return "";
};

Errors.propTypes = {
  errorList: PropTypes.object.isRequired,
  current_key: PropTypes.string.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps)(Errors);
