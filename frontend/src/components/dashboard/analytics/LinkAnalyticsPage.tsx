"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTheme } from "next-themes";
import type { ApexOptions } from "apexcharts";
import { useQueryClient } from "@tanstack/react-query";

import { useLinkAnalytics } from "@/hooks/links/use-link-analytics";
import {
  browserLabel,
  currentJalaliWeekCount,
  deviceLabel,
  formatCount,
  namedSeries,
  sumCounts,
} from "@/lib/analytics/labels";
import { shortLinkUrl } from "@/lib/links/short-url";
import type { LinksListResponse } from "@/types/links";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center text-token-sm text-muted-foreground">
      در حال آماده‌سازی نمودار…
    </div>
  ),
});

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
];

type ClickTab = "device" | "browser";
type ViewTab = "hour" | "day" | "week";

interface LinkAnalyticsPageProps {
  linkId: number;
}

export default function LinkAnalyticsPage({ linkId }: LinkAnalyticsPageProps) {
  const analytics = useLinkAnalytics(linkId);
  const cachedLink = useCachedLink(linkId);
  const [clickTab, setClickTab] = useState<ClickTab>("device");
  const [viewTab, setViewTab] = useState<ViewTab>("hour");

  if (!Number.isInteger(linkId) || linkId <= 0) {
    return (
      <main className="p-4 sm:p-6">
        <p className="text-token-sm text-error">شناسه لینک نامعتبر است.</p>
      </main>
    );
  }

  if (analytics.isPending) {
    return <AnalyticsSkeleton />;
  }

  if (analytics.isError || !analytics.data) {
    return (
      <main className="space-y-4 p-4 sm:p-6">
        <BackLink />
        <p className="text-token-sm text-error">{errorText(analytics.error)}</p>
      </main>
    );
  }

  const data = analytics.data;
  const clickItems = clickTab === "device" ? data.devices : data.browsers;
  const clickLabels = namedSeries(
    clickItems,
    clickTab === "device" ? deviceLabel : browserLabel,
  );
  const hourlyTotal = sumCounts(data.hourly);
  const dailyTotal = sumCounts(data.daily);
  const currentWeekTotal = currentJalaliWeekCount(data.weekly);
  const totalClicks = sumCounts(data.devices);
  const viewSeries =
    viewTab === "hour" ? data.hourly : viewTab === "day" ? data.daily : data.weekly;

  return (
    <main className="space-y-6 p-4 sm:space-y-8 sm:p-6">
      <div className="flex flex-col gap-3">
        <BackLink />
        <div>
          <h1 className="h2">{cachedLink?.title ?? "آمار بازدید"}</h1>
          {cachedLink ? (
            <p className="mt-1 text-token-sm text-muted-foreground" dir="ltr">
              {shortLinkUrl(cachedLink.shortCode).replace(/^https?:\/\//, "")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="کل بازدید" value={formatCount(totalClicks)} />
        <StatCard title="۲۴ ساعت اخیر" value={formatCount(hourlyTotal)} />
        <StatCard title="ماه جاری" value={formatCount(dailyTotal)} />
        <StatCard title="هفته جاری" value={formatCount(currentWeekTotal)} />
      </div>

      <section className="surface rounded-token-xl p-5 shadow-token-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="h3">کلیک‌ها</h2>
            <p className="mt-1 text-token-sm text-muted-foreground">
              {clickTab === "device"
                ? "تعداد کلیک بر اساس دستگاه"
                : "تعداد کلیک بر اساس مرورگر"}
            </p>
          </div>
          <ChartTabs
            value={clickTab}
            onChange={setClickTab}
            tabs={[
              { id: "device", label: "دستگاه" },
              { id: "browser", label: "مرورگر" },
            ]}
          />
        </div>
        <div className="mt-4" dir="ltr">
          <DonutChart
            labels={clickLabels.labels}
            series={clickLabels.series}
            chartKey={clickTab}
          />
        </div>
      </section>

      <section className="surface rounded-token-xl p-5 shadow-token-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="h3">بازدید</h2>
            <p className="mt-1 text-token-sm text-muted-foreground">
              {viewTab === "hour"
                ? "بازدید ۲۴ ساعت گذشته"
                : viewTab === "day"
                  ? "بازدید روزهای ماه شمسی جاری"
                  : "بازدید هفته‌های ماه شمسی جاری"}
            </p>
          </div>
          <ChartTabs
            value={viewTab}
            onChange={setViewTab}
            tabs={[
              { id: "hour", label: "ساعتی" },
              { id: "day", label: "روزانه" },
              { id: "week", label: "هفتگی" },
            ]}
          />
        </div>
        <div className="mt-4 overflow-x-auto" dir="ltr">
          <ColumnChart
            chartKey={viewTab}
            name="بازدید"
            categories={viewSeries.map((point) => point.value)}
            series={viewSeries.map((point) => point.count)}
          />
        </div>
      </section>
    </main>
  );
}

function useCachedLink(linkId: number) {
  const queryClient = useQueryClient();

  return useMemo(() => {
    const lists = queryClient.getQueriesData<LinksListResponse>({
      queryKey: ["links", "list"],
    });

    for (const [, data] of lists) {
      const match = data?.links.find((link) => link.id === linkId);
      if (match) return match;
    }

    return undefined;
  }, [queryClient, linkId]);
}

function DonutChart({
  labels,
  series,
  chartKey,
}: {
  labels: string[];
  series: number[];
  chartKey: string;
}) {
  const options = useChartTheme();
  const chartOptions = useMemo<ApexOptions>(
    () => ({
      ...options,
      labels,
      colors: CHART_COLORS,
      legend: {
        position: "bottom",
        fontFamily: "inherit",
        labels: { colors: options.chart?.foreColor },
      },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "کلیک",
                color: options.chart?.foreColor,
                formatter: (value) => {
                  const totals = value.globals.seriesTotals as number[];
                  const sum = totals.reduce((total, item) => total + item, 0);
                  return formatCount(sum);
                },
              },
              value: {
                color: options.chart?.foreColor,
                formatter: (value) => formatCount(Number(value)),
              },
            },
          },
        },
      },
    }),
    [labels, options],
  );

  if (series.length === 0 || series.every((count) => count === 0)) {
    return <EmptyChart text="هنوز کلیکی ثبت نشده" />;
  }

  return (
    <Chart
      key={chartKey}
      type="donut"
      height={320}
      series={series}
      options={chartOptions}
    />
  );
}

function ColumnChart({
  categories,
  series,
  name,
  chartKey,
  minColumnWidth = 72,
}: {
  categories: string[];
  series: number[];
  name: string;
  chartKey: string;
  minColumnWidth?: number;
}) {
  const options = useChartTheme();
  const chartOptions = useMemo<ApexOptions>(
    () => ({
      ...options,
      colors: [CHART_COLORS[0]],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: categories.length > 8 ? "60%" : "46%",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        labels: {
          rotate: categories.length > 6 ? -40 : 0,
          rotateAlways: categories.length > 6,
          style: {
            colors: options.chart?.foreColor,
            fontFamily: "inherit",
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (value) => formatCount(value),
          style: {
            colors: options.chart?.foreColor,
            fontFamily: "inherit",
          },
        },
      },
      grid: {
        borderColor: options.grid?.borderColor,
        strokeDashArray: 4,
      },
    }),
    [categories, options],
  );

  return (
    <div style={{ minWidth: Math.max(280, categories.length * minColumnWidth) }}>
      <Chart
        key={chartKey}
        type="bar"
        height={320}
        series={[{ name, data: series }]}
        options={chartOptions}
      />
    </div>
  );
}

function useChartTheme(): ApexOptions {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const fore = isDark ? "#ededed" : "#111111";
  const grid = isDark ? "#262626" : "#eaeaea";

  return useMemo(
    () => ({
      chart: {
        fontFamily: "inherit",
        foreColor: fore,
        background: "transparent",
        toolbar: { show: false },
      },
      grid: { borderColor: grid },
      tooltip: { theme: isDark ? "dark" : "light" },
    }),
    [fore, grid, isDark],
  );
}

function ChartTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex w-full gap-1 rounded-token-lg bg-muted/70 p-1 sm:w-auto">
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`min-h-11 flex-1 rounded-token-md px-4 text-token-sm font-token-medium transition-colors sm:flex-none ${
              selected
                ? "bg-card text-foreground shadow-token-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={selected}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface rounded-token-xl p-5 shadow-token-sm">
      <p className="label">{title}</p>
      <p className="mt-3 text-token-2xl font-token-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-72 items-center justify-center text-token-sm text-muted-foreground">
      {text}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/links"
      className="inline-flex min-h-11 items-center text-token-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      بازگشت به لینک‌ها
    </Link>
  );
}

function AnalyticsSkeleton() {
  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="h-8 w-48 animate-pulse rounded-token-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-token-xl bg-muted"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-token-xl bg-muted" />
      <div className="h-96 animate-pulse rounded-token-xl bg-muted" />
    </main>
  );
}

function errorText(error: unknown): string {
  const response = (
    error as {
      response?: { status?: number; data?: { message?: string | string[] } };
    }
  )?.response;
  const message = response?.data?.message;
  if (
    typeof message === "string" &&
    message.trim() &&
    !message.startsWith("Cannot ")
  ) {
    return message;
  }
  if (response?.status === 404) return "این لینک پیدا نشد.";
  if (response?.status === 401) return "برای دیدن آمار باید وارد شوید.";
  return "آمار لینک بارگذاری نشد.";
}
