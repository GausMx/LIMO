import { useState, useCallback } from "react";

export function useFormValidation(rules) {
  const [errors, setErrors] = useState({});

  const validate = useCallback((values) => {
    const next = {};
    for (const [field, checks] of Object.entries(rules)) {
      for (const { test, message } of checks) {
        if (!test(values[field], values)) {
          next[field] = message;
          break;
        }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [rules]);

  const clearField = useCallback((field) => {
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }, []);

  return { errors, validate, clearField, setErrors };
}

// Pre-built rules
export const RULES = {
  patientName: [
    { test: v => v && v.trim().length >= 2, message: "Enter patient's full name (min 2 chars)." },
  ],
  bvnOrNin: [
    { test: v => v && /^\d{11}$/.test(v), message: "BVN/NIN must be exactly 11 digits." },
  ],
  hospitalName: [
    { test: v => v && v.trim().length >= 2, message: "Enter hospital or clinic name." },
  ],
  accountNumber: [
    { test: v => v && /^\d{10}$/.test(v), message: "NUBAN must be exactly 10 digits." },
  ],
  bankCode: [
    { test: v => !!v, message: "Select a bank." },
  ],
  purpose: [
    { test: v => v && v.trim().length >= 4, message: "Describe the purpose (min 4 chars)." },
  ],
  amountNGN: [
    { test: v => !!v && !isNaN(v), message: "Enter a valid amount." },
    { test: v => Number(v) >= 500, message: "Minimum amount is ₦500." },
    { test: v => Number(v) <= 10_000_000, message: "Maximum single voucher is ₦10,000,000." },
  ],
};
