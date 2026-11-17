import type { ReactNode } from "react";
import { BrandFooter } from "../components/BrandFooter";

export function HealthCanvas({
  children,
  wide,
  laptop,
  stage,
}: {
  children: ReactNode;
  wide?: boolean;
  laptop?: boolean;
  stage?: boolean;
}) {
  if (stage) {
    return (
      <div className="health-canvas health-canvas-stage font-system text-health-text">
        <div className="cast-stage-main">{children}</div>
        <BrandFooter />
      </div>
    );
  }
  const frameClass = laptop
    ? "health-frame-laptop"
    : wide
      ? "health-frame-wide"
      : "health-frame";
  return (
    <div className="health-canvas font-system text-health-text">
      <div className={frameClass}>
        {children}
        <BrandFooter />
      </div>
    </div>
  );
}

export function HealthNavBar({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="mb-5">
      <p className="health-nav-title">{eyebrow}</p>
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-large-title">{title}</h1>
        {trailing}
      </div>
    </header>
  );
}

export function HealthCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`health-card-pad ${className}`}>{children}</div>;
}

export function HealthSection({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <section>
      {label && <p className="health-section-label">{label}</p>}
      {children}
    </section>
  );
}

export function MetricBlock({
  value,
  label,
  size = "lg",
  accent,
}: {
  value: string | number;
  label: string;
  size?: "md" | "lg" | "xl";
  accent?: string;
}) {
  const cls =
    size === "xl" ? "text-metric-xl" : size === "md" ? "text-metric-md" : "text-metric-lg";
  return (
    <div className="text-center">
      <p className={cls} style={accent ? { color: accent } : { color: "var(--health-lime)" }}>
        {value}
      </p>
      <p className="text-subhead mt-2 font-medium" style={{ color: "var(--health-cyan)" }}>
        {label}
      </p>
    </div>
  );
}