import type {
  AnalyticsNamedCount,
  AnalyticsTimePoint,
} from "@/types/analytics";
import { apiClient } from "./client";

function analyticsPath(linkId: number, chart: string): string {
  return `/api/links/${linkId}/analytics/${chart}`;
}

export async function getHourlyVisits(
  linkId: number,
): Promise<AnalyticsTimePoint[]> {
  const { data } = await apiClient.get<AnalyticsTimePoint[]>(
    analyticsPath(linkId, "hourly"),
  );
  return data;
}

export async function getDailyVisits(
  linkId: number,
): Promise<AnalyticsTimePoint[]> {
  const { data } = await apiClient.get<AnalyticsTimePoint[]>(
    analyticsPath(linkId, "daily"),
  );
  return data;
}

export async function getWeeklyVisits(
  linkId: number,
): Promise<AnalyticsTimePoint[]> {
  const { data } = await apiClient.get<AnalyticsTimePoint[]>(
    analyticsPath(linkId, "weekly"),
  );
  return data;
}

export async function getBrowserVisits(
  linkId: number,
): Promise<AnalyticsNamedCount[]> {
  const { data } = await apiClient.get<AnalyticsNamedCount[]>(
    analyticsPath(linkId, "browsers"),
  );
  return data;
}

export async function getDeviceVisits(
  linkId: number,
): Promise<AnalyticsNamedCount[]> {
  const { data } = await apiClient.get<AnalyticsNamedCount[]>(
    analyticsPath(linkId, "devices"),
  );
  return data;
}
