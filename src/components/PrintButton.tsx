"use client";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button className="docbtn" onClick={() => window.print()}>
      {label}
    </button>
  );
}
