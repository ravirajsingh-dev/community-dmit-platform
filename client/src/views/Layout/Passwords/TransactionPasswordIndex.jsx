import React from "react";
import { connect } from "react-redux";
import SetTransactionPassword from "./SetTransactionPassword";
import ChangeTransactionPassword from "./ChangeTransactionPassword";

const TransactionPasswordIndex = ({ loggedInUser }) => {
  const txnPassword = loggedInUser?.txn_password;

  return (
    <>
      {loggedInUser && !loggedInUser?.isTxnPassSet ? (
        <SetTransactionPassword />
      ) : (
        <ChangeTransactionPassword />
      )}
    </>
  );
};

const mapStateToProps = (state) => ({
  loggedInUser: state.auth.user,
});

export default connect(mapStateToProps, {})(TransactionPasswordIndex);
