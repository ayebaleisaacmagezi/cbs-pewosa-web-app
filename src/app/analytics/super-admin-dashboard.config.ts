/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AnalyticsWidgetDefinition } from './models/analytics-dashboard.model';
export const SUPER_ADMIN_DASHBOARD_AREAS = [
  { id: 'overview', titleKey: 'labels.superAdmin.Institution at a glance' },
  { id: 'reports', titleKey: 'labels.superAdmin.Trends and collections' },
  { id: 'system', titleKey: 'labels.superAdmin.System operations' },
  { id: 'executive', titleKey: 'labels.superAdmin.Executive overview' },
  { id: 'daily', titleKey: 'labels.superAdmin.Daily operations' },
  { id: 'credit', titleKey: 'labels.superAdmin.Credit performance' },
  { id: 'finance', titleKey: 'labels.superAdmin.Finance' },
  { id: 'branch', titleKey: 'labels.superAdmin.Branch performance' },
  { id: 'teller', titleKey: 'labels.superAdmin.Teller oversight' },
  { id: 'risk', titleKey: 'labels.superAdmin.Risk and compliance' },
  { id: 'members', titleKey: 'labels.superAdmin.Member services' },
  { id: 'monitoring', titleKey: 'labels.superAdmin.System monitoring' },
  { id: 'products', titleKey: 'labels.superAdmin.Loan products' },
  { id: 'savings', titleKey: 'labels.superAdmin.Savings and shares' },
  { id: 'alerts', titleKey: 'labels.superAdmin.Alerts and notifications' }
];
export const SUPER_ADMIN_DASHBOARD_WIDGETS: AnalyticsWidgetDefinition[] = [
  {
    id: 'overview-0',
    titleKey: 'labels.superAdmin.Loan portfolio',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-balance',
    icon: 'database',
    area: 'overview',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'overview-1',
    titleKey: 'labels.superAdmin.Active loans',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-active',
    icon: 'file-alt',
    area: 'overview',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'overview-2',
    titleKey: 'labels.superAdmin.PAR over 30 days',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-par30',
    icon: 'exclamation-triangle',
    area: 'overview',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'overview-3',
    titleKey: 'labels.superAdmin.Loans in arrears',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-arrears',
    icon: 'clock',
    area: 'overview',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'overview-4',
    titleKey: 'labels.superAdmin.Active clients',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-active',
    icon: 'user',
    area: 'overview',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'overview-5',
    titleKey: 'labels.superAdmin.New active members MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-mtd',
    icon: 'user-plus',
    area: 'overview',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'overview-6',
    titleKey: 'labels.superAdmin.Loan decisions pending',
    type: 'metric',
    layout: 'metric',
    adapter: 'approval-total',
    icon: 'shield-alt',
    area: 'overview',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'overview-7',
    titleKey: 'labels.superAdmin.Expense decisions pending',
    type: 'metric',
    layout: 'metric',
    adapter: 'expense-total',
    icon: 'receipt',
    area: 'overview',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-0',
    titleKey: 'labels.superAdmin.Total assets',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-1',
    titleKey: 'labels.superAdmin.Total liabilities',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-2',
    titleKey: 'labels.superAdmin.Total equity',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-3',
    titleKey: 'labels.superAdmin.Net surplus YTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-4',
    titleKey: 'labels.superAdmin.Total loan portfolio',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-balance',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-5',
    titleKey: 'labels.superAdmin.Total savings',
    type: 'metric',
    layout: 'metric',
    adapter: 'savings-total',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-6',
    titleKey: 'labels.superAdmin.Total shares',
    type: 'metric',
    layout: 'metric',
    adapter: 'shares-total',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-7',
    titleKey: 'labels.superAdmin.PAR > 30 days',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-par30',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-8',
    titleKey: 'labels.superAdmin.Collection rate MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-9',
    titleKey: 'labels.superAdmin.Membership growth',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-10',
    titleKey: 'labels.superAdmin.Loan disbursements MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-11',
    titleKey: 'labels.superAdmin.Active loans',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-active',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-12',
    titleKey: 'labels.superAdmin.Active clients',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-active',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-13',
    titleKey: 'labels.superAdmin.Branch ranking',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-branch-ranking',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-14',
    titleKey: 'labels.superAdmin.Top 5 loan products',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-top-products',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-15',
    titleKey: 'labels.superAdmin.Cash position',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-16',
    titleKey: 'labels.superAdmin.Month progress',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-17',
    titleKey: 'labels.superAdmin.Composite performance score',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-18',
    titleKey: 'labels.superAdmin.Regulatory compliance status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'executive-19',
    titleKey: 'labels.superAdmin.Alerts and notifications',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'executive',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-0',
    titleKey: 'labels.superAdmin.Daily transaction volume',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-1',
    titleKey: 'labels.superAdmin.Daily cash position',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-2',
    titleKey: 'labels.superAdmin.Teller shortage/overage',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-3',
    titleKey: 'labels.superAdmin.Pending approvals',
    type: 'metric',
    layout: 'metric',
    adapter: 'approval-total',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-4',
    titleKey: 'labels.superAdmin.Reversed transactions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-5',
    titleKey: 'labels.superAdmin.Failed standing orders',
    type: 'metric',
    layout: 'metric',
    adapter: 'standing-failed-today',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-6',
    titleKey: 'labels.superAdmin.Loan disbursements today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-7',
    titleKey: 'labels.superAdmin.Loan repayments today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-8',
    titleKey: 'labels.superAdmin.Savings deposits today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-9',
    titleKey: 'labels.superAdmin.Savings withdrawals today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-10',
    titleKey: 'labels.superAdmin.New members onboarded today',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-today',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-11',
    titleKey: 'labels.superAdmin.EOD reconciliation status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-12',
    titleKey: 'labels.superAdmin.GL balancing status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-13',
    titleKey: 'labels.superAdmin.Branch activity summary',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-14',
    titleKey: 'labels.superAdmin.Teller performance',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-15',
    titleKey: 'labels.superAdmin.Mobile money transactions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-16',
    titleKey: 'labels.superAdmin.SMS delivery rate',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'daily-17',
    titleKey: 'labels.superAdmin.System uptime',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'daily',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-0',
    titleKey: 'labels.superAdmin.My loan portfolio',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-1',
    titleKey: 'labels.superAdmin.My active loans',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-2',
    titleKey: 'labels.superAdmin.My active clients',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-3',
    titleKey: 'labels.superAdmin.Disbursed MTD vs target',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-4',
    titleKey: 'labels.superAdmin.Collection rate MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-5',
    titleKey: 'labels.superAdmin.PAR > 30 days',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-par30',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-6',
    titleKey: 'labels.superAdmin.Loans in arrears',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-arrears',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-7',
    titleKey: 'labels.superAdmin.Arrears recovered MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-8',
    titleKey: 'labels.superAdmin.Total collected MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-9',
    titleKey: 'labels.superAdmin.Interest income MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-10',
    titleKey: 'labels.superAdmin.Fees and commissions MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-11',
    titleKey: 'labels.superAdmin.Applications received MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-12',
    titleKey: 'labels.superAdmin.Applications approved MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-13',
    titleKey: 'labels.superAdmin.Client visits MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-14',
    titleKey: 'labels.superAdmin.My composite score MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-15',
    titleKey: 'labels.superAdmin.My KPI status summary',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-16',
    titleKey: "labels.superAdmin.Today's due loans",
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-17',
    titleKey: 'labels.superAdmin.Overdue loans',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-arrears',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-18',
    titleKey: 'labels.superAdmin.Pending applications',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-19',
    titleKey: 'labels.superAdmin.Pipeline',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-20',
    titleKey: 'labels.superAdmin.My daily target progress',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-21',
    titleKey: 'labels.superAdmin.My MTD target progress',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-22',
    titleKey: 'labels.superAdmin.Top arrears clients',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-23',
    titleKey: 'labels.superAdmin.Arrears follow-up actions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'credit-24',
    titleKey: 'labels.superAdmin.Action plan for tomorrow',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'credit',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-0',
    titleKey: 'labels.superAdmin.Trial balance status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-1',
    titleKey: 'labels.superAdmin.Total debits',
    type: 'metric',
    layout: 'metric',
    adapter: 'journal-debits-mtd',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-2',
    titleKey: 'labels.superAdmin.Total credits',
    type: 'metric',
    layout: 'metric',
    adapter: 'journal-credits-mtd',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-3',
    titleKey: 'labels.superAdmin.Cash position',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-4',
    titleKey: 'labels.superAdmin.Bank balances',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-5',
    titleKey: 'labels.superAdmin.Mobile money float',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-6',
    titleKey: 'labels.superAdmin.Interest income MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-7',
    titleKey: 'labels.superAdmin.Interest expense MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-8',
    titleKey: 'labels.superAdmin.Fee income MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-9',
    titleKey: 'labels.superAdmin.Operating expenses MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-10',
    titleKey: 'labels.superAdmin.Net surplus MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-11',
    titleKey: 'labels.superAdmin.Budget vs actual',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-12',
    titleKey: 'labels.superAdmin.Loan loss provision',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-13',
    titleKey: 'labels.superAdmin.Pending journal entries',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-14',
    titleKey: 'labels.superAdmin.Unposted transactions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-15',
    titleKey: 'labels.superAdmin.Bank reconciliation status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-16',
    titleKey: 'labels.superAdmin.EOD status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-17',
    titleKey: 'labels.superAdmin.EOM status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-18',
    titleKey: 'labels.superAdmin.Year-end status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-19',
    titleKey: 'labels.superAdmin.Statutory deductions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-20',
    titleKey: 'labels.superAdmin.Withholding tax payable',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-21',
    titleKey: 'labels.superAdmin.Fixed assets NBV',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-22',
    titleKey: 'labels.superAdmin.Depreciation MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-23',
    titleKey: 'labels.superAdmin.Suspense account balance',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'finance-24',
    titleKey: 'labels.superAdmin.Cash shortage/overage',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'finance',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-0',
    titleKey: 'labels.superAdmin.Branch portfolio',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-balance',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-1',
    titleKey: 'labels.superAdmin.Branch savings',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-2',
    titleKey: 'labels.superAdmin.Branch shares',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-3',
    titleKey: 'labels.superAdmin.Branch active clients',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-active',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-4',
    titleKey: 'labels.superAdmin.Branch active loans',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-active',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-5',
    titleKey: 'labels.superAdmin.Branch PAR > 30 days',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-par30',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-6',
    titleKey: 'labels.superAdmin.Branch collection rate',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-7',
    titleKey: 'labels.superAdmin.Branch disbursements MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-8',
    titleKey: 'labels.superAdmin.Branch arrears',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-arrears',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-9',
    titleKey: 'labels.superAdmin.Branch cash position',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-10',
    titleKey: 'labels.superAdmin.Branch teller performance',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-11',
    titleKey: 'labels.superAdmin.Branch officer performance',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-12',
    titleKey: 'labels.superAdmin.Branch daily activity',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-13',
    titleKey: 'labels.superAdmin.Branch new members MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-mtd',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-14',
    titleKey: 'labels.superAdmin.Branch pending approvals',
    type: 'metric',
    layout: 'metric',
    adapter: 'approval-total',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-15',
    titleKey: 'labels.superAdmin.Branch EOD status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-16',
    titleKey: 'labels.superAdmin.Branch top officers',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-17',
    titleKey: 'labels.superAdmin.Branch bottom officers',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-18',
    titleKey: 'labels.superAdmin.Branch alerts',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'branch-19',
    titleKey: 'labels.superAdmin.Branch month progress',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'branch',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-0',
    titleKey: 'labels.superAdmin.My drawer balance',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-1',
    titleKey: 'labels.superAdmin.Opening float',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-2',
    titleKey: 'labels.superAdmin.Total receipts today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-3',
    titleKey: 'labels.superAdmin.Total payments today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-4',
    titleKey: 'labels.superAdmin.Expected closing',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-5',
    titleKey: 'labels.superAdmin.My transactions today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-6',
    titleKey: 'labels.superAdmin.My deposits today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-7',
    titleKey: 'labels.superAdmin.My withdrawals today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-8',
    titleKey: 'labels.superAdmin.My loan repayments today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-9',
    titleKey: 'labels.superAdmin.My loan disbursements today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-10',
    titleKey: 'labels.superAdmin.My share purchases today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-11',
    titleKey: 'labels.superAdmin.My pending approvals',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-12',
    titleKey: 'labels.superAdmin.My reversals today',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-13',
    titleKey: 'labels.superAdmin.My CTR flags',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-14',
    titleKey: 'labels.superAdmin.My cash limit status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-15',
    titleKey: 'labels.superAdmin.My variance EOD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-16',
    titleKey: 'labels.superAdmin.Member search',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true },
    link: '/navigation'
  },
  {
    id: 'teller-17',
    titleKey: 'labels.superAdmin.Quick actions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true },
    link: '/home'
  },
  {
    id: 'teller-18',
    titleKey: 'labels.superAdmin.My EOD status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'teller-19',
    titleKey: 'labels.superAdmin.Notifications',
    type: 'list',
    layout: 'half',
    adapter: 'notifications-list',
    icon: 'users',
    area: 'teller',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-0',
    titleKey: 'labels.superAdmin.PAR > 30 days',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-par30',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-1',
    titleKey: 'labels.superAdmin.PAR by ageing',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-ageing',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-2',
    titleKey: 'labels.superAdmin.Loan loss provisions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-3',
    titleKey: 'labels.superAdmin.Loan classification',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-classification',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-4',
    titleKey: 'labels.superAdmin.Non-performing loans',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-5',
    titleKey: 'labels.superAdmin.Write-offs MTD/YTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'writeoffs-mtd-ytd',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-6',
    titleKey: 'labels.superAdmin.Recoveries on written-off',
    type: 'metric',
    layout: 'metric',
    adapter: 'writeoff-recoveries',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-7',
    titleKey: 'labels.superAdmin.CTR filed',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-8',
    titleKey: 'labels.superAdmin.STR filed',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-9',
    titleKey: 'labels.superAdmin.AML alerts',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-10',
    titleKey: 'labels.superAdmin.Backdated transactions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-11',
    titleKey: 'labels.superAdmin.Reversed transactions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-12',
    titleKey: 'labels.superAdmin.Audit trail exceptions',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-13',
    titleKey: 'labels.superAdmin.Transaction mismatches',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-14',
    titleKey: 'labels.superAdmin.Loan loss reserve coverage',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-15',
    titleKey: 'labels.superAdmin.Capital adequacy ratio',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-16',
    titleKey: 'labels.superAdmin.Liquidity ratio',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-17',
    titleKey: 'labels.superAdmin.Top 10 exposures',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-top-exposures',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-18',
    titleKey: 'labels.superAdmin.Guarantor exposure',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-19',
    titleKey: 'labels.superAdmin.Collateral coverage',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-20',
    titleKey: 'labels.superAdmin.Regulatory compliance status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-21',
    titleKey: 'labels.superAdmin.Suspicious activity trend',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-22',
    titleKey: 'labels.superAdmin.Arrears vs savings',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-23',
    titleKey: 'labels.superAdmin.Dormant accounts',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'risk-24',
    titleKey: 'labels.superAdmin.Watchlist members',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'risk',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-0',
    titleKey: 'labels.superAdmin.Total members',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-total',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-1',
    titleKey: 'labels.superAdmin.Active members',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-active',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-2',
    titleKey: 'labels.superAdmin.Dormant members',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-3',
    titleKey: 'labels.superAdmin.New members MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-mtd',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-4',
    titleKey: 'labels.superAdmin.Member exits MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-5',
    titleKey: 'labels.superAdmin.Member growth rate',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-6',
    titleKey: 'labels.superAdmin.Members by category',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-by-category',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-7',
    titleKey: 'labels.superAdmin.Members by gender',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-by-gender',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-8',
    titleKey: 'labels.superAdmin.Members by district',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-9',
    titleKey: 'labels.superAdmin.Pending applications',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-10',
    titleKey: 'labels.superAdmin.Approved applications MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-11',
    titleKey: 'labels.superAdmin.Rejected applications MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-12',
    titleKey: 'labels.superAdmin.Member complaints',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-13',
    titleKey: 'labels.superAdmin.Member inquiries',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-14',
    titleKey: 'labels.superAdmin.SMS sent MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-15',
    titleKey: 'labels.superAdmin.SMS delivery rate',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-16',
    titleKey: 'labels.superAdmin.Top members by savings',
    type: 'metric',
    layout: 'metric',
    adapter: 'savings-top-members',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-17',
    titleKey: 'labels.superAdmin.Top members by shares',
    type: 'metric',
    layout: 'metric',
    adapter: 'shares-top-members',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-18',
    titleKey: 'labels.superAdmin.Members with loans',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-member-loans',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'members-19',
    titleKey: 'labels.superAdmin.Members with arrears',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-member-arrears',
    icon: 'users',
    area: 'members',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-0',
    titleKey: 'labels.superAdmin.System uptime',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-1',
    titleKey: 'labels.superAdmin.Active users',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-2',
    titleKey: 'labels.superAdmin.Failed login attempts',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-3',
    titleKey: 'labels.superAdmin.Locked accounts',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-4',
    titleKey: 'labels.superAdmin.Database size',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-5',
    titleKey: 'labels.superAdmin.Backup status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-6',
    titleKey: 'labels.superAdmin.Last backup time',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-7',
    titleKey: 'labels.superAdmin.API response time',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-8',
    titleKey: 'labels.superAdmin.Error log',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-9',
    titleKey: 'labels.superAdmin.Audit trail size',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-10',
    titleKey: 'labels.superAdmin.Scheduled jobs status',
    type: 'list',
    layout: 'half',
    adapter: 'jobs-list',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-11',
    titleKey: 'labels.superAdmin.SMS gateway status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-12',
    titleKey: 'labels.superAdmin.Mobile money API status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-13',
    titleKey: 'labels.superAdmin.Bank integration status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-14',
    titleKey: 'labels.superAdmin.Pending system alerts',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-15',
    titleKey: 'labels.superAdmin.User activity summary',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-16',
    titleKey: 'labels.superAdmin.Report generation queue',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-17',
    titleKey: 'labels.superAdmin.Disk space usage',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-18',
    titleKey: 'labels.superAdmin.CPU usage',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'monitoring-19',
    titleKey: 'labels.superAdmin.Memory usage',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'monitoring',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'products-0',
    titleKey: 'labels.superAdmin.Active loan products',
    type: 'metric',
    layout: 'metric',
    adapter: 'products-active',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-1',
    titleKey: 'labels.superAdmin.Products in draft',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-2',
    titleKey: 'labels.superAdmin.Products suspended',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-3',
    titleKey: 'labels.superAdmin.Products retired',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-4',
    titleKey: 'labels.superAdmin.Product performance',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-5',
    titleKey: 'labels.superAdmin.Product profitability',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-6',
    titleKey: 'labels.superAdmin.Product default rate',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-7',
    titleKey: 'labels.superAdmin.Product growth',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-8',
    titleKey: 'labels.superAdmin.Top performing product',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-9',
    titleKey: 'labels.superAdmin.Lowest performing product',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-10',
    titleKey: 'labels.superAdmin.Product parameter changes',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-11',
    titleKey: 'labels.superAdmin.Product version history',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-12',
    titleKey: 'labels.superAdmin.Product approval status',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-13',
    titleKey: 'labels.superAdmin.Product review dates',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-14',
    titleKey: 'labels.superAdmin.Product mix',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-product-mix',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-15',
    titleKey: 'labels.superAdmin.Product interest rates',
    type: 'metric',
    layout: 'metric',
    adapter: 'products-rates',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-16',
    titleKey: 'labels.superAdmin.Product fee structure',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-17',
    titleKey: 'labels.superAdmin.Product collateral requirements',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-18',
    titleKey: 'labels.superAdmin.Product eligibility criteria',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'products-19',
    titleKey: 'labels.superAdmin.Product campaign performance',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'chart-line',
    area: 'products',
    visibleTo: { superAdminOnly: true },
    link: '/products/loan-products'
  },
  {
    id: 'savings-0',
    titleKey: 'labels.superAdmin.Total savings',
    type: 'metric',
    layout: 'metric',
    adapter: 'savings-total',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-1',
    titleKey: 'labels.superAdmin.Total shares',
    type: 'metric',
    layout: 'metric',
    adapter: 'shares-total',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-2',
    titleKey: 'labels.superAdmin.Savings growth MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-3',
    titleKey: 'labels.superAdmin.Shares growth MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-4',
    titleKey: 'labels.superAdmin.New savings accounts MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-5',
    titleKey: 'labels.superAdmin.New share purchases MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-6',
    titleKey: 'labels.superAdmin.Savings deposits MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-7',
    titleKey: 'labels.superAdmin.Savings withdrawals MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-8',
    titleKey: 'labels.superAdmin.Net savings MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-9',
    titleKey: 'labels.superAdmin.Interest paid on savings MTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-10',
    titleKey: 'labels.superAdmin.Average savings balance',
    type: 'metric',
    layout: 'metric',
    adapter: 'savings-average',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-11',
    titleKey: 'labels.superAdmin.Savings by product',
    type: 'metric',
    layout: 'metric',
    adapter: 'savings-by-product',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-12',
    titleKey: 'labels.superAdmin.Top savers',
    type: 'metric',
    layout: 'metric',
    adapter: 'savings-top-members',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-13',
    titleKey: 'labels.superAdmin.Top shareholders',
    type: 'metric',
    layout: 'metric',
    adapter: 'shares-top-members',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-14',
    titleKey: 'labels.superAdmin.Dormant savings accounts',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-15',
    titleKey: 'labels.superAdmin.Fixed deposits',
    type: 'metric',
    layout: 'metric',
    adapter: 'fixed-deposits-count',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-16',
    titleKey: 'labels.superAdmin.Fixed deposits maturing',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-17',
    titleKey: 'labels.superAdmin.Standing orders',
    type: 'metric',
    layout: 'metric',
    adapter: 'standing-count',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-18',
    titleKey: 'labels.superAdmin.Failed standing orders',
    type: 'metric',
    layout: 'metric',
    adapter: 'standing-failed-mtd',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-19',
    titleKey: 'labels.superAdmin.Dividends payable',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-20',
    titleKey: 'labels.superAdmin.Dividends paid YTD',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-21',
    titleKey: 'labels.superAdmin.Share capital growth',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-22',
    titleKey: 'labels.superAdmin.Savings growth trend',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-23',
    titleKey: 'labels.superAdmin.Shares vs savings ratio',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'savings-24',
    titleKey: 'labels.superAdmin.Compulsory savings',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'money-bill',
    area: 'savings',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-0',
    titleKey: 'labels.superAdmin.Loan in arrears > 30 days',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-age30',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-1',
    titleKey: 'labels.superAdmin.Loan in arrears > 90 days',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-age90',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-2',
    titleKey: 'labels.superAdmin.Loan in arrears > 180 days',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-age180',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-3',
    titleKey: 'labels.superAdmin.Loan in arrears > 360 days',
    type: 'metric',
    layout: 'metric',
    adapter: 'portfolio-age360',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-4',
    titleKey: 'labels.superAdmin.PAR > 30 days above target',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-5',
    titleKey: 'labels.superAdmin.Collection rate < 90%',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-6',
    titleKey: 'labels.superAdmin.Teller shortage',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-7',
    titleKey: 'labels.superAdmin.Teller overage',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-8',
    titleKey: 'labels.superAdmin.CTR threshold reached',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-9',
    titleKey: 'labels.superAdmin.AML structuring detected',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-10',
    titleKey: 'labels.superAdmin.Backdated transaction',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-11',
    titleKey: 'labels.superAdmin.Reversed transaction',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-12',
    titleKey: 'labels.superAdmin.Failed login attempts',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-13',
    titleKey: 'labels.superAdmin.GL imbalance',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-14',
    titleKey: 'labels.superAdmin.EOD not closed',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-15',
    titleKey: 'labels.superAdmin.Bank reconciliation pending',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-16',
    titleKey: 'labels.superAdmin.Loan loss provision required',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-17',
    titleKey: 'labels.superAdmin.Fixed deposit maturing',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-18',
    titleKey: 'labels.superAdmin.Standing order failed',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-19',
    titleKey: 'labels.superAdmin.SMS delivery failed',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-20',
    titleKey: 'labels.superAdmin.Mobile money API down',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-21',
    titleKey: 'labels.superAdmin.System backup failed',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-22',
    titleKey: 'labels.superAdmin.Low disk space',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-23',
    titleKey: 'labels.superAdmin.Product review due',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-24',
    titleKey: 'labels.superAdmin.Officer KPI behind',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-25',
    titleKey: 'labels.superAdmin.Composite score < 60%',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-26',
    titleKey: 'labels.superAdmin.Suspicious activity',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-27',
    titleKey: 'labels.superAdmin.Dormant account reactivation',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-28',
    titleKey: 'labels.superAdmin.Large transaction',
    type: 'metric',
    layout: 'metric',
    adapter: 'not-connected',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  },
  {
    id: 'alerts-29',
    titleKey: 'labels.superAdmin.New member onboarded',
    type: 'metric',
    layout: 'metric',
    adapter: 'members-today',
    icon: 'tasks',
    area: 'alerts',
    visibleTo: { superAdminOnly: true }
  }
];
