/**
 * runWithTransactionRetry - Enterprise Fintech Transaction Retry Utility
 *
 * Uses MongoDB driver's session.withTransaction() for correct transaction lifecycle
 * and retry handling. Manual startTransaction/commitTransaction/abortTransaction
 * can cause "Given transaction number X does not match" (NoSuchTransaction) errors
 * when retrying on TransientTransactionError.
 *
 * Use when: Multi-document operations must be all-or-nothing.
 * Retryable: WriteConflict, TransientTransactionError, MongoError 251.
 */

const mongoose = require("mongoose");

const isRetryableError = (err) => {
  if (!err) return false;
  const msg = (err.message && String(err.message)) || "";
  const code = err.code;
  return (
    msg.includes("WriteConflict") ||
    msg.includes("TransientTransactionError") ||
    msg.includes("UnknownTransactionCommitResult") ||
    (code === 251 && msg.includes("transaction"))
  );
};

/**
 * Run operation inside a MongoDB transaction. Uses withTransaction() which
 * automatically retries on TransientTransactionError and correctly manages
 * transaction numbers.
 *
 * @param {function(session): Promise<any>} operationFn - Async function receiving mongoose ClientSession
 * @returns {Promise<any>} - Result of operationFn after successful commit
 *
 * @example
 * await runWithTransactionRetry(async (session) => {
 *   await WalletBucket.findOneAndUpdate(..., { session });
 *   await Wallet.findOneAndUpdate(..., { session });
 * });
 */
const runWithTransactionRetry = async (operationFn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operationFn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  runWithTransactionRetry,
  isRetryableTransactionError: isRetryableError,
};
