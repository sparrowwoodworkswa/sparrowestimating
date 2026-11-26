"use client";
import { useState, useTransition } from "react";
import { importActuals, type ImportResult } from "@/app/shop-actions";

export function ActualsImport({ jobId }: { jobId: number }) {
  const [res, setRes] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => setRes(await importActuals(jobId, fd)));
      }}
    >
      <div className="row">
        <input type="file" name="file" accept=".csv,.xlsx" style={{ maxWidth: 320 }} />
        <button className="btn" type="submit" disabled={pending}>{pending ? "Importing" : "Import"}</button>
      </div>
      {res && (
        <div className="note">
          {res.error ? (
            res.error
          ) : (
            <>
              Imported {res.imported} row{res.imported === 1 ? "" : "s"}
              {res.skipped ? `, skipped ${res.skipped} (other jobs or no hours)` : ""}.
              {res.unmatched.length > 0 && (
                <> These task names didn&apos;t match a shop step and were logged as Other: {res.unmatched.join(", ")}.</>
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}
