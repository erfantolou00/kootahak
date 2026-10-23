import type { AnalyticsNamedCount } from "@/types/analytics";

const faNumber = new Intl.NumberFormat("fa-IR");

const DEVICE_LABELS: Record<string, string> = {
  desktop: "دسکتاپ",
  mobile: "موبایل",
  tablet: "تبلت",
  smarttv: "تلویزیون",
  wearable: "پوشیدنی",
  console: "کنسول",
  embedded: "توکار",
  unknown: "نامشخص",
};

export function formatCount(value: number): string {
  return faNumber.format(value);
}

export function deviceLabel(key: string): string {
  return DEVICE_LABELS[key.toLowerCase()] ?? key;
}

export function browserLabel(key: string): string {
  if (!key || key.toLowerCase() === "unknown") return "نامشخص";
  return key;
}

export function namedSeries(
  items: AnalyticsNamedCount[],
  labelFor: (name: string) => string,
): { labels: string[]; series: number[] } {
  return {
    labels: items.map((item) => labelFor(item.name)),
    series: items.map((item) => item.count),
  };
}

export function sumCounts(items: { count: number }[]): number {
  return items.reduce((sum, item) => sum + item.count, 0);
}

export function currentJalaliWeekCount(weeks: { count: number }[]): number {
  const dayPart = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    day: "numeric",
    timeZone: "Asia/Tehran",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "day")?.value;
  const day = Number(dayPart ?? "1");
  const index = Math.min(Math.ceil(day / 7), 4) - 1;
  return weeks[index]?.count ?? 0;
}
