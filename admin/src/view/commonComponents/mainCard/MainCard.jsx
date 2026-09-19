import { Container, Row, Col } from "react-bootstrap";
import React from "react";

const MainCard = ({ children }) => {
  return (
    <Container className="main-card">
      <Row>
        <Col>{children}</Col>
      </Row>
    </Container>
  );
};

export default MainCard;
