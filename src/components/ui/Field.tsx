"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Icon } from "./Icon";

interface Common {
  label: string;
  error?: string;
  className?: string;
}

function ErrorText({ error }: { error?: string }) {
  return error ? <p className="mt-1 px-4 text-xs text-[var(--critical)]">{error}</p> : null;
}

export function TextField({
  label,
  error,
  className = "",
  prefix,
  id,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement> & { prefix?: string }) {
  return (
    <div className={className}>
      <div className={`md-field ${prefix ? "has-prefix" : ""} ${error ? "invalid" : ""}`}>
        <input id={id} placeholder=" " aria-invalid={Boolean(error)} {...rest} />
        <label htmlFor={id}>{label}</label>
        {prefix && <span className="md-prefix">{prefix}</span>}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

export function SelectField({
  label,
  error,
  className = "",
  id,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={className}>
      <div className={`md-field ${error ? "invalid" : ""}`}>
        <select id={id} aria-invalid={Boolean(error)} {...rest}>
          {children}
        </select>
        <label htmlFor={id}>{label}</label>
        <span className="md-trailing">
          <Icon name="expand_more" size={20} />
        </span>
      </div>
      <ErrorText error={error} />
    </div>
  );
}

export function TextArea({
  label,
  error,
  className = "",
  id,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={className}>
      <div className={`md-field ${error ? "invalid" : ""}`}>
        <textarea id={id} placeholder=" " rows={2} {...rest} />
        <label htmlFor={id}>{label}</label>
      </div>
      <ErrorText error={error} />
    </div>
  );
}
