// src/components/ui/CategoryButton.jsx
import React from "react";

export default function CategoryButton({ label, checked, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid var(--gray-6)",
        background: checked ? "var(--accent-5)" : "var(--color-panel)",
        cursor: "pointer",
        fontSize: 12,
        transition: "background 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}
