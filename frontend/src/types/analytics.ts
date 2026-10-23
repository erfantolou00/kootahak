export interface AnalyticsTimePoint {
  id: number;
  value: string;
  count: number;
}

export interface AnalyticsNamedCount {
  name: string;
  count: number;
}

export interface LinkAnalyticsCharts {
  hourly: AnalyticsTimePoint[];
  daily: AnalyticsTimePoint[];
  weekly: AnalyticsTimePoint[];
  browsers: AnalyticsNamedCount[];
  devices: AnalyticsNamedCount[];
}
