import React from "react";

const STEPS = [
  { label: "Patient", icon: "👤" },
  { label: "Hospital", icon: "🏥" },
  { label: "Payment", icon: "💳" },
];

export default function Stepper({ current }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: "0", marginBottom: "24px",
    }}>
      {STEPS.map((s, i) => {
        const done    = i < current;
        const active  = i === current;
        const future  = i > current;
        return (
          <React.Fragment key={i}>
            {/* Node */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: "0 0 auto" }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: "50%",
                background: done ? "var(--teal)" : active ? "var(--blue)" : "var(--border)",
                color: done || active ? "#fff" : "var(--ink-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: done ? "16px" : "18px",
                fontWeight: 700,
                boxShadow: active ? "0 0 0 4px rgba(45,91,227,0.18)" : "none",
                transition: "all 0.3s",
              }}>
                {done ? "✓" : s.icon}
              </div>
              <span style={{
                fontSize: "11px", fontWeight: active ? 600 : 400,
                color: done ? "var(--teal-dark)" : active ? "var(--blue)" : "var(--ink-muted)",
                whiteSpace: "nowrap",
              }}>{s.label}</span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: "2px", maxWidth: 80, margin: "0 4px",
                marginBottom: "18px", // align with circle centers
                background: i < current ? "var(--teal)" : "var(--border)",
                transition: "background 0.4s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
