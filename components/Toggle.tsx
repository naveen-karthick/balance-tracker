"use client";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  compact?: boolean;
}

export default function Toggle({ enabled, onChange, label, compact = false }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex items-center transition-colors ${
        compact ? "gap-1.5 rounded-md px-2 py-1" : "gap-3 rounded-lg px-4 py-3"
      } ${enabled ? "bg-indigo-50" : compact ? "bg-transparent" : "bg-gray-50"}`}
    >
      <span
        className={`font-medium ${compact ? "text-xs" : "text-sm"} ${
          enabled ? "text-indigo-900" : compact ? "text-blue-700" : "text-gray-700"
        }`}
      >
        {label}
      </span>
      <div
        className={`relative inline-flex items-center rounded-full transition-colors ${
          compact ? "h-4 w-7" : "h-6 w-11"
        } ${enabled ? "bg-indigo-600" : "bg-gray-300"}`}
      >
        <span
          className={`inline-block transform rounded-full bg-white transition-transform ${
            compact ? "h-3 w-3" : "h-4 w-4"
          } ${enabled ? (compact ? "translate-x-3.5" : "translate-x-6") : "translate-x-0.5"}`}
        />
      </div>
    </button>
  );
}
