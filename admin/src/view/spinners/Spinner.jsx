import React from "react";
import { Container, Row, Col, Image } from "react-bootstrap";

// icons

const Spinner = ({ minHeight = "500px" }) => {
  return (
    <Container 
      className="spinner-container" 
      style={{ "--spinner-min-height": minHeight }}
    >
      <div className="spinner"></div>
    </Container>
  );
};

export default Spinner;
