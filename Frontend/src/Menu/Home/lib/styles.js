const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 20% 20%, #1a0f2e 0%, #0a0612 60%)",
    color: "#f5f3fa",
    fontFamily: "'Oswald', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem 1rem",
  },

  modalContainer: {
    background: "#1c1a2e",
    border: "1px solid rgba(216, 128, 255, 0.15)",
    borderRadius: "16px",
    padding: "2rem",
    width: "100%",
    maxWidth: "1000px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
  },

  splitLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
    marginTop: "1rem",
  },

  sectionBox: {
    background: "#141224",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "1.5rem",
  },
// roomSection: {
//     ...styles.sectionBox,
//     display: "flex",
//     flexDirection: "column",
//     height: "700px",      // adjust as needed
// },
roomSection: {
    background: "#18142a",
    border: "1px solid #2d2444",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    height: "900px",
},
roomList: {
    flex: 1,
    overflowY: "auto",
    paddingRight: "8px",
    marginTop: "1rem",
},
  title: {
    fontSize: "1.8rem",
    fontWeight: 700,
    marginBottom: "0.2rem",
    background: "linear-gradient(90deg, #d946ef, #ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  sectionHeader: {
    fontSize: "1.2rem",
    fontWeight: 700,
    marginBottom: "1rem",
    color: "#f3d9ff",
  },

  label: {
    fontSize: "0.85rem",
    color: "#c7c0d4",
    marginBottom: "0.3rem",
    display: "block",
    fontWeight: 600,
  },

  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#0a0612",
    color: "#fff",
    fontSize: "0.95rem",
    marginBottom: "1rem",
    boxSizing: "border-box",
  },

  primaryBtn: (disabled) => ({
    width: "100%",
    padding: "0.8rem",
    borderRadius: "8px",
    border: "none",
    background: disabled
      ? "rgba(255,255,255,0.08)"
      : "linear-gradient(90deg, #d946ef, #ec4899)",
    color: disabled ? "#666" : "#fff",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: disabled ? "not-allowed" : "pointer",
    marginTop: "0.5rem",
  }),

  simulateBtn: {
    width: "100%",
    padding: "0.65rem",
    borderRadius: "8px",
    border: "1px dashed #d946ef",
    background: "rgba(217, 70, 239, 0.1)",
    color: "#f3d9ff",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    marginBottom: "1rem",
  },

  roomCardVertical: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(217,70,239,0.2)",
    borderRadius: "10px",
    padding: "1rem",
    marginBottom: "0.75rem",
    cursor: "pointer",
  },

  codeBadge: {
    fontWeight: 800,
    padding: "0.2rem 0.6rem",
    borderRadius: "999px",
    background: "rgba(217,70,239,0.1)",
    border: "1px solid rgba(217,70,239,0.35)",
    color: "#f3d9ff",
    fontSize: "0.8rem",
  },

  inviteBadge: {
    fontWeight: 700,
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
    background: "rgba(74, 222, 128, 0.15)",
    border: "1px solid rgba(74, 222, 128, 0.4)",
    color: "#4ade80",
    fontSize: "0.7rem",
  },

  chatWindow: {
    background: "#141224",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "1rem",
    marginBottom: "1rem",
  },

  chatScroll: {
    maxHeight: "320px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },

  bubble: (kind) => ({
    background:
      kind === "mine"
        ? "linear-gradient(135deg, #d946ef, #ec4899)"
        : kind === "bot"
        ? "rgba(99,102,241,0.18)"
        : "#26233a",
    border: kind === "bot" ? "1px solid rgba(99,102,241,0.35)" : "none",
    color: "#fff",
    padding: "0.6rem 0.9rem",
    fontSize: "0.9rem",
    borderRadius: "12px",
    maxWidth: "85%",
    wordBreak: "break-word",
  }),

  roleBtnRow: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.6rem",
  },

  roleChoiceBtn: (disabled, selected) => ({
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: selected
      ? "1px solid #4ade80"
      : "1px solid rgba(255,255,255,0.2)",
    background: selected
      ? "rgba(74,222,128,0.2)"
      : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.3 : 1,
  }),

  actionBtnGroup: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.8rem",
  },

  confirmBtn: {
    flex: 1,
    padding: "0.5rem",
    borderRadius: "6px",
    border: "none",
    background: "#22c55e",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  cancelBtn: {
    flex: 1,
    padding: "0.5rem",
    borderRadius: "6px",
    border: "none",
    background: "#ef4444",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  deleteDealBtn: {
    width: "100%",
    padding: "0.6rem",
    borderRadius: "6px",
    border: "1px solid rgba(239,68,68,0.5)",
    background: "rgba(239,68,68,0.15)",
    color: "#fca5a5",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    marginTop: "0.8rem",
  },

  errorBox: {
    color: "#f87171",
    fontSize: "0.85rem",
    marginBottom: "0.8rem",
    background: "rgba(239,68,68,0.1)",
    padding: "0.5rem 0.8rem",
    borderRadius: "6px",
    border: "1px solid rgba(239,68,68,0.2)",
  },

  qrBox: {
    marginTop: "0.8rem",
    background: "#0a0612",
    borderRadius: "10px",
    border: "1px solid rgba(217,70,239,0.25)",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.6rem",
  },

  qrImage: {
    width: "180px",
    height: "180px",
    background: "#fff",
    borderRadius: "8px",
  },

  qrStatusText: {
    fontSize: "0.8rem",
    color: "#c7c0d4",
    textAlign: "center",
  },

  pill: (color) => ({
    padding: "0.3rem 0.7rem",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 700,
    background: `${color}22`,
    border: `1px solid ${color}66`,
    color,
  }),

  releaseBtn: {
    flex: 1,
    padding: "0.6rem",
    borderRadius: "6px",
    border: "none",
    background: "linear-gradient(90deg, #22c55e, #16a34a)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  mutualCancelBtn: (requested) => ({
    flex: 1,
    padding: "0.6rem",
    borderRadius: "6px",
    border: "1px solid rgba(239,68,68,0.5)",
    background: requested
      ? "rgba(239,68,68,0.35)"
      : "rgba(239,68,68,0.15)",
    color: "#fca5a5",
    fontWeight: 700,
    cursor: "pointer",
  }),
};

export default styles;