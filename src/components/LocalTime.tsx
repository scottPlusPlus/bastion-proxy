"use client";

interface Props {
  date: Date | string;
  className?: string;
}

export function LocalTime({ date, className }: Props) {
  const formatted = new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <time dateTime={new Date(date).toISOString()} className={className} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
