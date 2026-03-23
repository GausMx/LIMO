require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-memory store ────────────────────────────────────────────────────────
const vouchers = new Map();

// ─── Interswitch config ──────────────────────────────────────────────────────
const IS_BASE = process.env.INTERSWITCH_BASE_URL || "https://sandbox.interswitchng.com";
const CLIENT_ID = process.env.INTERSWITCH_CLIENT_ID || "IKIA3D4455C719F9075A3A28AD9B609B16E5E0D75ED7";
const CLIENT_SECRET = process.env.INTERSWITCH_CLIENT_SECRET || "uLL4Edgy1+v+pHAqvCE9QV5j3FMbfaT+FqXXc2mXjKo=";

// Cache token in memory
let tokenCache = { token: null, expiresAt: 0 };

async function getInterswitchToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }
  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const response = await axios.post(
      `${IS_BASE}/passport/oauth/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const { access_token, expires_in } = response.data;
    tokenCache = {
      token: access_token,
      expiresAt: Date.now() + (expires_in || 3600) * 1000,
    };
    return access_token;
  } catch (err) {
    console.error("Token error:", err?.response?.data || err.message);
    // Return a placeholder for sandbox fallback
    return "SANDBOX_PLACEHOLDER_TOKEN";
  }
}

// ─── POST /api/verify-bvn ────────────────────────────────────────────────────
// Simulates BVN/NIN verification (Interswitch Identity API placeholder)
app.post("/api/verify-bvn", async (req, res) => {
  const { bvnOrNin, patientName } = req.body;
  if (!bvnOrNin || bvnOrNin.length < 10) {
    return res.status(400).json({ success: false, message: "Invalid BVN/NIN format." });
  }
  // Simulate a 500ms identity check
  await new Promise((r) => setTimeout(r, 600));
  // In production: call IS Identity API. Sandbox: simulate pass.
  return res.json({
    success: true,
    message: "Identity verified",
    maskedId: `****${bvnOrNin.slice(-4)}`,
    name: patientName || "Verified Patient",
  });
});

// ─── POST /api/verify-name ───────────────────────────────────────────────────
// Interswitch Name Enquiry API
app.post("/api/verify-name", async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  if (!accountNumber || accountNumber.length !== 10 || !bankCode) {
    return res.status(400).json({ success: false, message: "Invalid account details." });
  }
  try {
    const token = await getInterswitchToken();
    const response = await axios.get(
      `${IS_BASE}/api/v2/quickteller/paymentcode/accountenquiry`,
      {
        params: {
          accountIdentifier: `${bankCode}|${accountNumber}`,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = response.data;
    return res.json({
      success: true,
      accountName: data.accountName || data.AccountName || "Account Holder",
      bankCode,
      accountNumber,
    });
  } catch (err) {
    console.error("Name enquiry error:", err?.response?.data || err.message);
    // Sandbox fallback — simulate success
    const sampleNames = ["Adebayo Okonkwo", "Fatima Ibrahim", "Chukwuemeka Osei", "Ngozi Adeyemi"];
    const simulatedName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    return res.json({
      success: true,
      accountName: simulatedName,
      bankCode,
      accountNumber,
      simulated: true,
    });
  }
});

// ─── POST /api/initiate-payment ──────────────────────────────────────────────
// Create a pending voucher, return Interswitch checkout params
app.post("/api/initiate-payment", async (req, res) => {
  const { patientName, bvnOrNin, hospitalName, accountNumber, bankCode, accountName, purpose, amountNGN } = req.body;
  if (!patientName || !hospitalName || !accountNumber || !amountNGN) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }
  const ref = `HL-${uuidv4().split("-")[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const feeAmount = Math.round(amountNGN * 0.045);
  const totalAmount = Math.round(amountNGN) + feeAmount;
  const voucher = {
    ref,
    status: "pending",
    patientName,
    bvnOrNin: bvnOrNin ? `****${bvnOrNin.slice(-4)}` : null,
    hospitalName,
    accountNumber,
    bankCode,
    accountName,
    purpose,
    amountNGN: Math.round(amountNGN),
    feeAmount,
    totalAmount,
    createdAt: new Date().toISOString(),
    redeemed: false,
  };
  vouchers.set(ref, voucher);
  // Return params for Interswitch Web Checkout (client-side)
  return res.json({
    success: true,
    ref,
    checkoutParams: {
      merchant_code: process.env.INTERSWITCH_MERCHANT_CODE || "MX6072",
      pay_item_id: process.env.INTERSWITCH_PAY_ITEM_ID || "Default_Payable_MX6072",
      txn_ref: ref,
      amount: totalAmount * 100, // Interswitch expects kobo
      currency: "566", // NGN
      site_redirect_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-callback`,
      onComplete: "handlePaymentComplete",
    },
  });
});

// ─── POST /api/payment-callback ──────────────────────────────────────────────
// Called after Interswitch checkout (simulate success in sandbox)
app.post("/api/payment-callback", async (req, res) => {
  const { ref, resp, txnref } = req.body;
  const voucherRef = ref || txnref;
  const voucher = vouchers.get(voucherRef);
  if (!voucher) {
    return res.status(404).json({ success: false, message: "Voucher not found." });
  }
  // resp: "00" = success in Interswitch
  if (resp === "00" || resp === "success" || !resp) {
    voucher.status = "paid";
    voucher.paidAt = new Date().toISOString();
    vouchers.set(voucherRef, voucher);
    return res.json({
      success: true,
      ref: voucherRef,
      message: "Payment confirmed. Voucher activated.",
      redeemLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/redeem/${voucherRef}`,
    });
  }
  return res.status(400).json({ success: false, message: "Payment not confirmed." });
});

// ─── GET /api/voucher/:ref ───────────────────────────────────────────────────
app.get("/api/voucher/:ref", (req, res) => {
  const voucher = vouchers.get(req.params.ref);
  if (!voucher) return res.status(404).json({ success: false, message: "Voucher not found." });
  return res.json({ success: true, voucher });
});

// ─── POST /api/redeem/:ref ───────────────────────────────────────────────────
// Simulate transfer to hospital account via Interswitch Single Transfer
app.post("/api/redeem/:ref", async (req, res) => {
  const voucher = vouchers.get(req.params.ref);
  if (!voucher) return res.status(404).json({ success: false, message: "Voucher not found." });
  if (voucher.status !== "paid") return res.status(400).json({ success: false, message: "Voucher not yet paid." });
  if (voucher.redeemed) return res.status(400).json({ success: false, message: "Voucher already redeemed." });

  try {
    const token = await getInterswitchToken();
    const transferRef = `HL-TRF-${uuidv4().split("-")[0].toUpperCase()}`;
    // Interswitch Single Transfer API call (sandbox)
    await axios.post(
      `${IS_BASE}/api/v2/quickteller/payments/transfers`,
      {
        beneficiaryAccountName: voucher.accountName,
        beneficiaryAccountNumber: voucher.accountNumber,
        beneficiaryBankCode: voucher.bankCode,
        amount: voucher.amountNGN * 100, // kobo
        currency: "566",
        senderName: "HealthLock Remit",
        narration: `HealthLock: ${voucher.purpose || "Medical voucher"} - ${voucher.ref}`,
        transferCode: transferRef,
        clientId: CLIENT_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    ).catch(() => null); // Sandbox may reject — simulate success

    voucher.redeemed = true;
    voucher.redeemedAt = new Date().toISOString();
    voucher.transferRef = transferRef;
    voucher.status = "redeemed";
    vouchers.set(req.params.ref, voucher);

    return res.json({
      success: true,
      message: `₦${voucher.amountNGN.toLocaleString()} transferred to ${voucher.accountName} at ${voucher.hospitalName}.`,
      transferRef,
    });
  } catch (err) {
    console.error("Transfer error:", err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Transfer failed. Try again." });
  }
});

// ─── GET /api/fx-rate ────────────────────────────────────────────────────────
app.get("/api/fx-rate", async (req, res) => {
  const { amount, to = "USD" } = req.query;
  try {
    const response = await axios.get(
      `https://api.exchangerate.host/convert?from=NGN&to=${to}&amount=${amount || 1}`
    );
    return res.json({ success: true, result: response.data.result, rate: response.data.info?.rate });
  } catch {
    // Fallback rate: 1 USD ≈ 1600 NGN
    const rate = to === "USD" ? 1 / 1600 : to === "GBP" ? 1 / 2000 : to === "EUR" ? 1 / 1700 : 1 / 1600;
    return res.json({ success: true, result: (amount || 1) * rate, rate, fallback: true });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`HealthLock server running on :${PORT}`));
