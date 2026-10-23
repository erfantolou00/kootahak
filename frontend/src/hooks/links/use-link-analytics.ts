"use client";

import { useQueries } from "@tanstack/react-query";
import {
  getBrowserVisits,
  getDailyVisits,
  getDeviceVisits,
  getHourlyVisits,
  getWeeklyVisits,
} from "@/lib/api/analytics";
import type { LinkAnalyticsCharts } from "@/types/analytics";

export function useLinkAnalytics(linkId: number) {
  const enabled = Number.isInteger(linkId) && linkId > 0;
  const [hourly, daily, weekly, browsers, devices] = useQueries({
    queries: [
      {
        queryKey: ["links", "analytics", linkId, "hourly"],
        queryFn: () => getHourlyVisits(linkId),
        enabled,
      },
      {
        queryKey: ["links", "analytics", linkId, "daily"],
        queryFn: () => getDailyVisits(linkId),
        enabled,
      },
      {
        queryKey: ["links", "analytics", linkId, "weekly"],
        queryFn: () => getWeeklyVisits(linkId),
        enabled,
      },
      {
        queryKey: ["links", "analytics", linkId, "browsers"],
        queryFn: () => getBrowserVisits(linkId),
        enabled,
      },
      {
        queryKey: ["links", "analytics", linkId, "devices"],
        queryFn: () => getDeviceVisits(linkId),
        enabled,
      },
    ],
  });

  const error = [hourly, daily, weekly, browsers, devices].find(
    (query) => query.isError,
  )?.error;
  const isPending = [hourly, daily, weekly, browsers, devices].some(
    (query) => query.isPending,
  );

  const data: LinkAnalyticsCharts | undefined =
    hourly.data && daily.data && weekly.data && browsers.data && devices.data
      ? {
          hourly: hourly.data,
          daily: daily.data,
          weekly: weekly.data,
          browsers: browsers.data,
          devices: devices.data,
        }
      : undefined;

  return {
    data,
    error,
    isError: Boolean(error),
    isPending: enabled && isPending && !error,
  };
}
