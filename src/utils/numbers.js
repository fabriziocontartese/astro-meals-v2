// src/utils/numbers.js

export function roundIfNumber(val) {
    return typeof val === "number" && Number.isFinite(val) ? Math.round(val) : val;
  }
  
  export function toPositiveNumberOrNull(s) {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  
  export function toNonNegativeIntOrNull(s) {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : null;
  }
  