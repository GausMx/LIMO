import React from "react";
import VoucherForm from "./components/VoucherForm.jsx";

const styles = {
  header: {
    background: "var(--blue)",
    color: "#fff",
    padding: "0 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 12px rgba(10,15,30,0.18)",
  },
  headerInner: {
    maxWidth: 760,
    margin: "0 auto",
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontFamily: "var(--font-display)",
    fontSize: "20px",
    letterSpacing: "-0.01em",
  },
  logoIcon: {
    width: 32,
    height: 32,
    background: "var(--teal)",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },
  pill: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "99px",
    padding: "4px 12px",
    fontSize: "11.5px",
    color: "rgba(255,255,255,0.8)",
  },
  hero: {
    background: "linear-gradient(160deg, var(--blue) 0%, #1a3a80 60%, #1e4ab5 100%)",
    padding: "48px 24px 52px",
    color: "#fff",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(26px, 5vw, 40px)",
    lineHeight: 1.2,
    marginBottom: "12px",
    position: "relative",
    zIndex: 1,
  },
  heroSub: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.75)",
    maxWidth: 460,
    margin: "0 auto 24px",
    lineHeight: 1.6,
    position: "relative",
    zIndex: 1,
  },
  heroBadges: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    flexWrap: "wrap",
    position: "relative",
    zIndex: 1,
  },
  heroBadge: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "99px",
    padding: "5px 14px",
    fontSize: "12px",
    color: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(4px)",
  },
  // decorative circle
  deco: {
    position: "absolute",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.04)",
    pointerEvents: "none",
  },
  main: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "32px 16px 60px",
  },
  steps: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    marginBottom: "28px",
  },
  step: {
    background: "var(--surface-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "14px 16px",
    textAlign: "center",
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "var(--blue)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 8px",
  },
  footer: {
    background: "var(--ink)",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    padding: "20px",
    fontSize: "12.5px",
    marginTop: "40px",
  },
};

const STEPS = [
  { icon: "✅", label: "Verify patient identity (BVN/NIN)" },
  { icon: "🏦", label: "Confirm hospital bank account" },
  { icon: "💳", label: "Pay securely via Interswitch" },
  { icon: "🔗", label: "Share redemption link instantly" },
];

export default function App() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>🔒</div>
            HealthLock <span style={{ color: "var(--teal)" }}>Remit</span>
          </div>
          <div style={styles.pill}>Sandbox · Interswitch IPG</div>
        </div>
      </header>

      {/* Hero */}
      <div style={styles.hero}>
        {/* Decorative circles */}
        <div style={{ ...styles.deco, width: 320, height: 320, top: -80, right: -80 }} />
        <div style={{ ...styles.deco, width: 200, height: 200, bottom: -60, left: -40 }} />

        <h1 style={styles.heroTitle}>
          Send Healthcare Vouchers<br />
          <em style={{ fontStyle: "italic", color: "var(--teal)" }}>to Nigeria</em>, Instantly
        </h1>
        <p style={styles.heroSub}>
          Pay from anywhere in the world. Funds go directly to verified hospital accounts.
          No registration. No hassle.
        </p>
        <div style={styles.heroBadges}>
          {["🌍 Diaspora-to-Nigeria", "🔒 BVN/NIN Verified", "🏦 Direct Bank Transfer", "💳 Int'l Cards Welcome"].map(b => (
            <span key={b} style={styles.heroBadge}>{b}</span>
          ))}
        </div>
      </div>

      {/* Main */}
      <main style={styles.main}>
        {/* How it works */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-muted)", fontWeight: 600, marginBottom: "12px" }}>
            How it works
          </p>
          <div style={styles.steps}>
            {STEPS.map((s, i) => (
              <div key={i} style={styles.step}>
                <div style={styles.stepNum}>{i + 1}</div>
                <div style={{ fontSize: "18px", marginBottom: "4px" }}>{s.icon}</div>
                <div style={{ fontSize: "12px", color: "var(--ink-soft)", fontWeight: 500, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <VoucherForm />
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        HealthLock Remit · Powered by Interswitch Sandbox · Built for DiaspoCare Buildathon · No real money in sandbox
      </footer>
    </div>
  );
}
