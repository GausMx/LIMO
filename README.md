# 🔒 HealthLock Remit

> Diaspora-to-Nigeria health voucher platform powered by Interswitch

Send verified healthcare vouchers to loved ones in Nigeria — from anywhere in the world. Funds go directly to the hospital's bank account on redemption. No registration required.

---

## ✨ Features

- **Anonymous single-use flow** — no registration/login
- **Patient identity verification** — BVN/NIN (Interswitch Identity API)
- **Hospital bank account verification** — Interswitch Name Enquiry API (NUBAN)
- **Multi-currency FX preview** — live rates via exchangerate.host
- **Interswitch Web Checkout** — international Visa/Mastercard accepted, auto-FX to NGN
- **Secure one-time voucher link** — unique `HL-XXXX` reference code
- **Direct bank transfer on redemption** — Interswitch Single Transfer API
- **Zero database** — in-memory Map (swap with Redis/Postgres for production)

---

## 📁 Folder Structure

```
healthlock-remit/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── VoucherForm.jsx   # Main form (patient + hospital + voucher)
│   │       ├── Modal.jsx         # Reusable modal
│   │       └── banks.js          # Nigerian bank list
│   ├── index.html               # Loads Interswitch inline-checkout.js
│   ├── vite.config.js
│   └── package.json
├── server/                  # Node.js / Express backend
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── package.json             
└── README.md
```

---

## 🚀 Run Locally

### 1. Clone & Install

```bash
git clone https://github.com/GausMx/LIMO.git
cd healthlock-remit
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env with your Interswitch sandbox keys
```

### 3. Start dev servers

```bash
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

---

## 🔑 Interswitch Sandbox Setup

### Sandbox Test Cards (from Interswitch docs)
| Card | Number | Expiry | CVV |
|------|--------|--------|-----|
| Visa | 4000000000000002 | 01/30 | 123 |
| Mastercard | 5061040000000000 | 01/30 | 123 |
| Verve | 5061260000000069 | 01/30 | 123 |

> 💡 **International cards supported via Interswitch IPG** — auto FX to NGN at checkout. Test with sandbox Visa/MC cards from the docs.

---

## 🌐 Deploy

### Frontend → Netlify
### Backend → Render
1. New Web Service → connect same GitHub repo
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `node server.js`

## ⚠️ Disclaimer

This is a **sandbox/buildathon demo**. No real money is transferred. BVN/NIN verification is simulated. Uss Interswitch production credentials and proper KYC/compliance before any live deployment.
