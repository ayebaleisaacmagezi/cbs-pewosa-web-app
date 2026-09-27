/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** refresh options as well */
export type AnalyticsTimescale = 'Day' | 'Week' | 'Month';

export interface AnalyticsFilters {
  officeId?: number | null;
  timescale: AnalyticsTimescale;
}
export interface AnalyticsVisibilityRule {
  permissionsAny?: string[];
  permissionsAll?: string[];
  roles?: string[];
  superAdminOnly?: boolean;
}
export type AnalyticsWidgetLayout = 'metric' | 'wide' | 'half';
export type AnalyticsWidgetType = 'metric' | 'chart' | 'list';
export type AnalyticsChartType = 'bar' | 'doughnut';
export type AnalyticsWidgetAdapter =
  | 'client-total'
  | 'loan-total'
  | 'collection-total'
  | 'disbursement-total'
  | 'client-loan-trends'
  | 'collection-breakdown'
  | 'disbursement-breakdown'
  | 'approval-total'
  | 'users-count'
  | 'jobs-count'
  | 'audits-count'
  | 'notifications-count'
  | 'jobs-list'
  | 'notifications-list'
  | 'branch-workload'
  | 'portfolio-balance'
  | 'portfolio-active'
  | 'portfolio-par30'
  | 'portfolio-arrears'
  | 'portfolio-age30'
  | 'portfolio-age90'
  | 'portfolio-age180'
  | 'portfolio-age360'
  | 'portfolio-branch-ranking'
  | 'portfolio-top-products'
  | 'portfolio-top-exposures'
  | 'portfolio-product-mix'
  | 'portfolio-ageing'
  | 'portfolio-classification'
  | 'portfolio-member-loans'
  | 'portfolio-member-arrears'
  | 'members-active'
  | 'members-total'
  | 'members-mtd'
  | 'members-today'
  | 'members-by-category'
  | 'members-by-gender'
  | 'products-active'
  | 'products-rates'
  | 'journal-debits-mtd'
  | 'journal-credits-mtd'
  | 'savings-total'
  | 'savings-average'
  | 'savings-by-product'
  | 'savings-top-members'
  | 'shares-total'
  | 'shares-top-members'
  | 'standing-count'
  | 'standing-failed-today'
  | 'standing-failed-mtd'
  | 'writeoffs-mtd-ytd'
  | 'writeoff-recoveries'
  | 'fixed-deposits-count'
  | 'expense-total'
  | 'not-connected';
export interface AnalyticsWidgetDefinition {
  id: string;
  titleKey: string;
  type: AnalyticsWidgetType;
  layout: AnalyticsWidgetLayout;
  adapter: AnalyticsWidgetAdapter;
  icon: string;
  chartType?: AnalyticsChartType;
  section?: 'operations';
  area?: string;
  link?: string;
  visibleTo?: AnalyticsVisibilityRule;
}

export interface AnalyticsDashboardDefinition {
  id: string;
  titleKey: string;
  widgets: AnalyticsWidgetDefinition[];
}

export interface AnalyticsChartDataset {
  labelKey: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface AnalyticsDetailItem {
  labelKey: string;
  value: number;
}

export interface AnalyticsWidgetState {
  loading: boolean;
  empty: boolean;
  error?: boolean;
  noteKey?: string;
  noteText?: string;
  rows?: { title: string; detail?: string; detailKey?: string; value?: number }[];
  metricValue?: number;
  metricText?: string;
  currencyCode?: string;
  unit?: string;
  unavailable?: boolean;
  contextKey?: string;
  labels?: string[];
  translateLabels?: boolean;
  datasets?: AnalyticsChartDataset[];
  details?: AnalyticsDetailItem[];
}
