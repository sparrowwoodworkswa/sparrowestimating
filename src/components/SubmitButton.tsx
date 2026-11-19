"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, icon, className = "btn", pendingText = "Saving…" }: { children: React.ReactNode; icon?: string; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {icon && <span className="material-symbols-outlined">{pending ? "progress_activity" : icon}</span>}
      {pending ? pendingText : children}
    </button>
  );
}
