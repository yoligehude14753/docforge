import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  label?: string;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

const selectClassName =
  "w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60";

export function Select({
  value,
  onChange,
  options,
  label,
  className,
  placeholder,
  id,
  disabled,
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {label ? (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={selectClassName}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          aria-hidden
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
