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
  "Adebayo Chukwuemeka", "Fatima Bello Ibrahim",
  "Ngozi Adeyemi Osei",  "Emeka Okonkwo Nwachukwu",
  "Halima Abubakar Musa","Seun Adesanya Williams",
  "Chidinma Okafor Eze", "Oluwaseun Adeyinka Balogun",
];

// ─── Helpers ─────────────────────────────────────────────────────────────
const generateRef = () =>
  `HL-${uuidv4().split("-")[0].toUpperCase()}-${Date.now()
    .toString(36)
    .toUpperCase()}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── POST /api/verify-bvn ────────────────────────────────────────────────
app.post("/api/verify-bvn", async (req, res) => {
  try {
    const { bvnOrNin } = req.body;

    if (!bvnOrNin || !/^\d{11}$/.test(bvnOrNin)) {
      return res.status(400).json({
        success: false,
        message: "BVN/NIN must be exactly 11 digits.",
      });
    }

    await sleep(800);

    return res.json({
      success: true,
      message: "Identity verified successfully.",
      maskedId: `****${bvnOrNin.slice(-4)}`,
      sandboxMode: true,
    });
  } catch (err) {
    console.error("BVN ERROR:", err);
    return res.status(500).json({ success: false, message: "BVN verification failed." });
  }
});

// ─── POST /api/verify-name ───────────────────────────────────────────────
app.post("/api/verify-name", async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || accountNumber.length !== 10 || !bankCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid account details.",
      });
    }

    await sleep(1000);

    const idx =
      parseInt(accountNumber.slice(-2), 10) % NAME_POOL.length;

    return res.json({
      success: true,
      accountName: NAME_POOL[idx],
      bankCode,
      accountNumber,
      sandboxMode: true,
    });
  } catch (err) {
    console.error("ACCOUNT VERIFY ERROR:", err);
    return res.status(500).json({ success: false, message: "Account verification failed." });
  }
});

// ─── POST /api/initiate-payment ──────────────────────────────────────────
app.post("/api/initiate-payment", async (req, res) => {
  try {
    const {
      patientName,
      bvnOrNin,
      hospitalName,
      accountNumber,
      bankCode,
      accountName,
      purpose,
      amountNGN,
    } = req.body;

    // 🔒 Strong validation
    if (
      !patientName ||
      !hospitalName ||
      !accountNumber ||
      !bankCode ||
      !purpose ||
      !amountNGN
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    const amt = Number(amountNGN);

    if (isNaN(amt) || amt < 500) {
      return res.status(400).json({
        success: false,
        message: "Amount must be at least ₦500.",
      });
    }

    const ref = generateRef();

    const feeAmount   = Math.round(amt * 0.045);
    const totalAmount = Math.round(amt) + feeAmount;

    vouchers.set(ref, {
      ref,
      status: "pending",
      patientName,
      bvnOrNin: bvnOrNin ? `****${bvnOrNin.slice(-4)}` : null,
      hospitalName,
      accountNumber,
      bankCode,
      accountName,
      purpose,
      amountNGN: Math.round(amt),
      feeAmount,
      totalAmount,
      createdAt: new Date().toISOString(),
      redeemed: false,
    });

    console.log(`✅ Voucher created: ${ref} — ₦${totalAmount}`);

    return res.json({
      success: true,
      ref,
      checkoutParams: {
        merchant_code:
          process.env.INTERSWITCH_MERCHANT_CODE || "MX276405",
        pay_item_id:
          process.env.INTERSWITCH_PAY_ITEM_ID ||
          "Default_Payable_MX276405",
        txn_ref: ref,
        amount: totalAmount * 100,
        currency: "566",
        site_redirect_url: `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/payment-callback`,
      },
    });
  } catch (err) {
    console.error("INIT PAYMENT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate payment (server error).",
    });
  }
});

// ─── POST /api/payment-callback ──────────────────────────────────────────
app.post("/api/payment-callback", async (req, res) => {
  try {
    const { ref, txnref } = req.body;
    const voucherRef = ref || txnref;

    const voucher = vouchers.get(voucherRef);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found.",
      });
    }

    voucher.status = "paid";
    voucher.paidAt = new Date().toISOString();

    vouchers.set(voucherRef, voucher);

    console.log(`💰 Payment confirmed: ${voucherRef}`);

    return res.json({
      success: true,
      ref: voucherRef,
      message: "Payment confirmed. Voucher activated.",
      redeemLink: `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/redeem/${voucherRef}`,
    });
  } catch (err) {
    console.error("PAYMENT CALLBACK ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Payment callback failed.",
    });
  }
});

// ─── GET /api/voucher/:ref ───────────────────────────────────────────────
app.get("/api/voucher/:ref", (req, res) => {
  const voucher = vouchers.get(req.params.ref);

  if (!voucher) {
    return res.status(404).json({
      success: false,
      message: "Voucher not found.",
    });
  }

  return res.json({ success: true, voucher });
});

// ─── POST /api/redeem/:ref ───────────────────────────────────────────────
app.post("/api/redeem/:ref", async (req, res) => {
  try {
    const voucher = vouchers.get(req.params.ref);

    if (!voucher)
      return res.status(404).json({ success: false, message: "Voucher not found." });

    if (voucher.status !== "paid")
      return res.status(400).json({ success: false, message: "Voucher not yet paid." });

    if (voucher.redeemed)
      return res.status(400).json({ success: false, message: "Voucher already redeemed." });

    await sleep(800);

    const transferRef = `HL-TRF-${uuidv4().split("-")[0].toUpperCase()}`;

    voucher.redeemed = true;
    voucher.redeemedAt = new Date().toISOString();
    voucher.transferRef = transferRef;
    voucher.status = "redeemed";

    vouchers.set(req.params.ref, voucher);

    console.log(`🏥 Redeemed: ${req.params.ref} → ${transferRef}`);

    return res.json({
      success: true,
      message: `₦${voucher.amountNGN.toLocaleString()} transferred to ${voucher.accountName} at ${voucher.hospitalName}.`,
      transferRef,
    });
  } catch (err) {
    console.error("REDEEM ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Redemption failed.",
    });
  }
});

// ─── GET /api/fx-rate ────────────────────────────────────────────────────
const FX_CACHE = { rates: null, fetchedAt: 0 };
const FX_TTL = 10 * 60 * 1000;

async function getNGNRates() {
  if (FX_CACHE.rates && Date.now() - FX_CACHE.fetchedAt < FX_TTL) {
    return FX_CACHE.rates;
  }

  try {
    const r = await axios.get("https://open.er-api.com/v6/latest/NGN");
    if (r.data?.rates) {
      FX_CACHE.rates = r.data.rates;
      FX_CACHE.fetchedAt = Date.now();
      return FX_CACHE.rates;
    }
  } catch {}

  return { USD: 0.000625, GBP: 0.0005, EUR: 0.000588, CAD: 0.00084 };
}

app.get("/api/fx-rate", async (req, res) => {
  try {
    const { amount = "1", to = "USD" } = req.query;
    const amountNum = parseFloat(amount) || 1;

    const rates = await getNGNRates();
    const rate = rates[to.toUpperCase()];

    if (!rate) {
      return res.status(400).json({
        success: false,
        message: `Currency ${to} not supported.`,
      });
    }

    return res.json({
      success: true,
      result: amountNum * rate,
      rate,
      from: "NGN",
      to: to.toUpperCase(),
    });
  } catch (err) {
    console.error("FX ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "FX fetch failed.",
    });
  }
});

// ─── Health ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    vouchers: vouchers.size,
    mode: "sandbox-simulation",
  });
});

// ─── Start ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on :${PORT}`);
});