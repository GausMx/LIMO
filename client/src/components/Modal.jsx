import React, { useEffect } from "react";

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(10,15,30,0.55)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "16px",
    animation: "fadeIn 0.2s ease",
  },
  box: {
    background: "var(--surface-card)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--shadow-lg)",
    padding: "32px",
    maxWidth: "460px",
    width: "100%",
    position: "relative",
    animation: "fadeUp 0.3s ease",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  close: {
    position: "absolute", top: "16px", right: "16px",
    background: "none", border: "none", cursor: "pointer",
    color: "var(--ink-muted)", fontSize: "22px", lineHeight: 1,
    padding: "4px 8px", borderRadius: "6px",
    transition: "background 0.15s",
  },
};

export default function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={styles.box}>
        {onClose && (
          <button style={styles.close} onClick={onClose} aria-label="Close">×</button>
        )}
        {children}
      </div>
    </div>
  );
}
