import React from "react";
import { Container, Row, Col } from "react-bootstrap";

// icons
const NoDataFoundPage = () => {
  return (
    <Container>
      <Row>
        <Col xs={12} className="text-center">
          <Col className="my-3 noDataText">No Data Found</Col>
        </Col>
      </Row>
    </Container>
  );
};

export default NoDataFoundPage;
