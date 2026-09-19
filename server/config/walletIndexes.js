/**
 * MongoDB Indexes for Admin Wallet Management
 * Optimized for list queries, filters, and transaction lookups.
 */

const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");

async function ensureWalletIndexes() {
  try {
    await Wallet.syncIndexes();
    await WalletTransaction.syncIndexes();
    return { ok: 1 };
  } catch (err) {
    console.error("Wallet index creation error:", err);
    throw err;
  }
}

module.exports = { ensureWalletIndexes };
