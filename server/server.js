require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const axios   = require("axios");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const vouchers = new Map();

const NAME_POOL = [
  "Adebayo Chukwuemeka",    "Fatima Bello Ibrahim",
  "Ngozi Adeyemi Osei",     "Emeka Okonkwo Nwachukwu",
  "Halima Abubakar Musa",   "Seun Adesanya Williams",
  "Chidinma Okafor Eze",    "Oluwaseun Adeyinka Balogun",
];

// ─── POST /api/verify-bvn ─────────────────────────────────────────────────────
app.post("/api/verify-bvn", async (req, res) => {
  const { bvnOrNin } = req.body;
  if (!bvnOrNin || !/^\d{11}$/.test(bvnOrNin)) {
    return res.status(400).json({ success: false, message: "BVN/NIN must be exactly 11 digits." });
  }
  // Simulate realistic network delay
  await new Promise(r => setTimeout(r, 800));
  return res.json({
    success:     true,
    message:     "Identity verified successfully.",
    maskedId:    `****${bvnOrNin.slice(-4)}`,
    sandboxMode: true,
  });
});

// ─── POST /api/verify-name ────────────────────────────────────────────────────
app.post("/api/verify-name", async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  if (!accountNumber || accountNumber.length !== 10 || !bankCode) {
    return res.status(400).json({ success: false, message: "Invalid account details." });
  }
  await new Promise(r => setTimeout(r, 1000));
  // Deterministic — same account number always returns same name
  const idx = parseInt(accountNumber.slice(-2), 10) % NAME_POOL.length;
  return res.json({
    success:     true,
    accountName: NAME_POOL[idx],
    bankCode,
    accountNumber,
    sandboxMode: true,
  });
});

// ─── POST /api/initiate-payment ───────────────────────────────────────────────
app.post("/api/initiate-payment", async (req, res) => {
  const {
    patientName, bvnOrNin, hospitalName,
    accountNumber, bankCode, accountName,
    purpose, amountNGN,
  } = req.body;

  if (!patientName || !hospitalName || !accountNumber || !amountNGN) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  const ref         = `HL-${uuidv4().split("-")[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const feeAmount   = Math.round(amountNGN * 0.045);
  const totalAmount = Math.round(amountNGN) + feeAmount;

  vouchers.set(ref, {
    ref,
    status:       "pending",
    patientName,
    bvnOrNin:     bvnOrNin ? `****${bvnOrNin.slice(-4)}` : null,
    hospitalName,
    accountNumber,
    bankCode,
    accountName,
    purpose,
    amountNGN:    Math.round(amountNGN),
    feeAmount,
    totalAmount,
    createdAt:    new Date().toISOString(),
    redeemed:     false,
  });

  console.log(`Voucher created: ${ref} — ₦${totalAmount.toLocaleString()}`);

  return res.json({
    success: true,
    ref,
    checkoutParams: {
      merchant_code:     process.env.INTERSWITCH_MERCHANT_CODE || "MX276405",
      pay_item_id:       process.env.INTERSWITCH_PAY_ITEM_ID   || "Default_Payable_MX276405",
      txn_ref:           ref,
      amount:            totalAmount * 100,
      currency:          "566",
      site_redirect_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-callback`,
    },
  });
});

// ─── POST /api/payment-callback ───────────────────────────────────────────────
app.post("/api/payment-callback", async (req, res) => {
  const { ref, resp, txnref } = req.body;
  const voucherRef = ref || txnref;
  const voucher    = vouchers.get(voucherRef);

  if (!voucher) {
    return res.status(404).json({ success: false, message: "Voucher not found." });
  }

  voucher.status = "paid";
  voucher.paidAt = new Date().toISOString();
  vouchers.set(voucherRef, voucher);
  console.log(`Payment confirmed: ${voucherRef}`);

  return res.json({
    success:    true,
    ref:        voucherRef,
    message:    "Payment confirmed. Voucher activated.",
    redeemLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/redeem/${voucherRef}`,
  });
});

// ─── GET /api/voucher/:ref ────────────────────────────────────────────────────
app.get("/api/voucher/:ref", (req, res) => {
  const voucher = vouchers.get(req.params.ref);
  if (!voucher) {
    return res.status(404).json({ success: false, message: "Voucher not found." });
  }
  return res.json({ success: true, voucher });
});

// ─── POST /api/redeem/:ref ────────────────────────────────────────────────────
app.post("/api/redeem/:ref", async (req, res) => {
  const voucher = vouchers.get(req.params.ref);
  if (!voucher)                  return res.status(404).json({ success: false, message: "Voucher not found." });
  if (voucher.status !== "paid") return res.status(400).json({ success: false, message: "Voucher not yet paid." });
  if (voucher.redeemed)          return res.status(400).json({ success: false, message: "Voucher already redeemed." });

  await new Promise(r => setTimeout(r, 800));

  const transferRef   = `HL-TRF-${uuidv4().split("-")[0].toUpperCase()}`;
  voucher.redeemed    = true;
  voucher.redeemedAt  = new Date().toISOString();
  voucher.transferRef = transferRef;
  voucher.status      = "redeemed";
  vouchers.set(req.params.ref, voucher);

  console.log(`Voucher redeemed: ${req.params.ref} → transfer ${transferRef}`);

  return res.json({
    success:     true,
    message:     `₦${voucher.amountNGN.toLocaleString()} transferred to ${voucher.accountName} at ${voucher.hospitalName}.`,
    transferRef,
  });
});

// ─── GET /api/fx-rate ─────────────────────────────────────────────────────────
const FX_CACHE = { rates: null, fetchedAt: 0 };
const FX_TTL   = 10 * 60 * 1000;

async function getNGNRates() {
  if (FX_CACHE.rates && Date.now() - FX_CACHE.fetchedAt < FX_TTL) {
    return FX_CACHE.rates;
  }
  try {
    const r = await axios.get("https://open.er-api.com/v6/latest/NGN", { timeout: 5000 });
    if (r.data?.rates) {
      FX_CACHE.rates     = r.data.rates;
      FX_CACHE.fetchedAt = Date.now();
      return FX_CACHE.rates;
    }
  } catch (e) { console.warn("open.er-api failed:", e.message); }

  try {
    const r = await axios.get("https://api.exchangerate-api.com/v4/latest/NGN", { timeout: 5000 });
    if (r.data?.rates) {
      FX_CACHE.rates     = r.data.rates;
      FX_CACHE.fetchedAt = Date.now();
      return FX_CACHE.rates;
    }
  } catch (e) { console.warn("exchangerate-api failed:", e.message); }

  return { USD: 0.000625, GBP: 0.000500, EUR: 0.000588, CAD: 0.000840 };
}

app.get("/api/fx-rate", async (req, res) => {
  const { amount = "1", to = "USD" } = req.query;
  const amountNum = parseFloat(amount) || 1;
  try {
    const rates = await getNGNRates();
    const rate  = rates[to.toUpperCase()];
    if (!rate) return res.status(400).json({ success: false, message: `Currency ${to} not supported.` });
    return res.json({ success: true, result: amountNum * rate, rate, from: "NGN", to: to.toUpperCase() });
  } catch {
    const fallback = { USD: 1600, GBP: 2000, EUR: 1700, CAD: 1190 };
    const rate = 1 / (fallback[to.toUpperCase()] || 1600);
    return res.json({ success: true, result: amountNum * rate, rate, fallback: true });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", vouchers: vouchers.size, mode: "sandbox-simulation" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\nHealthLock Remit server on :${PORT}`);
  console.log(`Mode: Sandbox simulation`);
  console.log(`Merchant: ${process.env.INTERSWITCH_MERCHANT_CODE || "MX276405"}\n`);
});