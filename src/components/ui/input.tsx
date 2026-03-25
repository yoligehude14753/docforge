import * as React from "react";
import { cn } from "@/lib/utils";

const fieldClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
  }
>(({ className, label, error, id, ...props }, ref) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(fieldClassName, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    error?: string;
  }
>(({ className, label, error, id, ...props }, ref) => {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(fieldClassName, "min-h-[100px] resize-y", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p
          id={`${textareaId}-error`}
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});

Textarea.displayName = "Textarea";
