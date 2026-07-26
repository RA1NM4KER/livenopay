"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";

const confirmPhrase = "DELETE";

export function DeleteAccountCard() {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/account/delete", { method: "POST" });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Couldn't delete your account. Please try again.");
      }

      window.location.href = "/login";
    } catch (caught) {
      setIsDeleting(false);
      setError(caught instanceof Error ? caught.message : "Couldn't delete your account. Please try again.");
    }
  }

  const canDelete = confirmText === confirmPhrase && !isDeleting;

  return (
    <Card>
      <CardHeader title="Delete account" eyebrow="Danger zone" />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <p className="text-sm text-muted">
          Permanently deletes your NewinMeter account: your connection to LiveMopay, every synced usage row, and your
          sign-in. This can&apos;t be undone.
        </p>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">
            Type <span className="font-medium text-ink">{confirmPhrase}</span> to confirm
          </span>
          <input
            className="h-9 w-full max-w-xs rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-red-400"
            onChange={(event) => setConfirmText(event.target.value)}
            value={confirmText}
            type="text"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className={`inline-flex h-9 w-fit items-center rounded-md px-3 text-sm font-medium transition ${
            canDelete
              ? "bg-red-600 text-white hover:bg-red-700"
              : "cursor-not-allowed bg-canvas text-muted/60 border border-line"
          }`}
          disabled={!canDelete}
          onClick={() => void handleDelete()}
          type="button"
        >
          {isDeleting ? "Deleting..." : "Delete my account"}
        </button>
      </div>
    </Card>
  );
}
