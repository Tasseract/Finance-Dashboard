interface IconProps {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
}

export function Icon({ name, size = 22, filled = false, className = "" }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`msr ${filled ? "fill" : ""} ${className}`}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
