"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      className="button secondary"
      disabled={busy}
      onClick={logout}
    >
      {busy ? "SIGNING OUT…" : "SIGN OUT"}
    </button>
  );
}
