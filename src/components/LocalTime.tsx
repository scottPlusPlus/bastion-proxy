"use client";

interface Props {
  date: Date | string;
  className?: string;
}

export function LocalTime({ date, className }: Props) {
  const d = new Date(date);
  const datePart = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <time dateTime={d.toISOString()} className={className} suppressHydrationWarning>
      <span className="block">{datePart}</span>
      <span className="block text-base-content/40">{timePart}</span>
    </time>
  );
}
