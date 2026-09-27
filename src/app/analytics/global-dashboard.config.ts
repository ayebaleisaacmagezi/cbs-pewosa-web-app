/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AnalyticsDashboardDefinition } from './models/analytics-dashboard.model';

import { SUPER_ADMIN_DASHBOARD_WIDGETS } from './super-admin-dashboard.config';

export const GLOBAL_ANALYTICS_DASHBOARD: AnalyticsDashboardDefinition = {
  id: 'global-dashboard',
  titleKey: 'labels.menus.Dashboard',
  widgets: [
    {
      id: 'clients-total',
      titleKey: 'labels.superAdmin.Client trend total',
      type: 'metric',
      layout: 'metric',
      adapter: 'client-total',
      icon: 'users',
      visibleTo: {
        permissionsAny: [
          'READ_REPORT',
          'READ_CLIENT',
          'ALL_FUNCTIONS'
        ]
      }
    },
    {
      id: 'loans-total',
      titleKey: 'labels.superAdmin.Loan trend total',
      type: 'metric',
      layout: 'metric',
      adapter: 'loan-total',
      icon: 'chart-line',
      visibleTo: {
        permissionsAny: [
          'READ_REPORT',
          'READ_LOAN',
          'ALL_FUNCTIONS'
        ]
      }
    },
    {
      id: 'collection-total',
      titleKey: 'labels.inputs.Amount Collected',
      type: 'metric',
      layout: 'metric',
      adapter: 'collection-total',
      icon: 'money-bill',
      visibleTo: {
        permissionsAny: [
          'READ_REPORT',
          'ALL_FUNCTIONS'
        ]
      }
    },
    {
      id: 'disbursement-total',
      titleKey: 'labels.inputs.Amount Pending / Disbursed',
      type: 'metric',
      layout: 'metric',
      adapter: 'disbursement-total',
      icon: 'money-bill',
      visibleTo: {
        permissionsAny: [
          'READ_REPORT',
          'ALL_FUNCTIONS'
        ]
      }
    },
    {
      id: 'client-loan-trends',
      titleKey: 'labels.inputs.Client Trends',
      type: 'chart',
      layout: 'wide',
      adapter: 'client-loan-trends',
      chartType: 'bar',
      icon: 'chart-line',
      visibleTo: {
        permissionsAny: [
          'READ_REPORT',
          'ALL_FUNCTIONS'
        ]
      }
    },
    {
      id: 'collection-breakdown',
      titleKey: 'labels.inputs.Amount Collected',
      type: 'chart',
      layout: 'half',
      adapter: 'collection-breakdown',
      chartType: 'doughnut',
      icon: 'money-bill',
      visibleTo: {
        permissionsAny: [
          'READ_REPORT',
          'ALL_FUNCTIONS'
        ]
      }
    },
    {
      id: 'disbursement-breakdown',
      titleKey: 'labels.inputs.Amount Pending / Disbursed',
      type: 'chart',
      layout: 'half',
      adapter: 'disbursement-breakdown',
      chartType: 'doughnut',
      icon: 'money-bill',
      visibleTo: {
        permissionsAny: [
          'READ_REPORT',
          'ALL_FUNCTIONS'
        ]
      }
    },
    {
      id: 'approval-total',
      titleKey: 'labels.superAdmin.Pending approvals',
      type: 'metric',
      layout: 'metric',
      adapter: 'approval-total',
      icon: 'tasks',
      section: 'operations',
      visibleTo: { superAdminOnly: true }
    },
    {
      id: 'users-count',
      titleKey: 'labels.superAdmin.User records',
      type: 'metric',
      layout: 'metric',
      adapter: 'users-count',
      icon: 'users',
      section: 'operations',
      visibleTo: { superAdminOnly: true },
      link: '/appusers'
    },
    {
      id: 'jobs-count',
      titleKey: 'labels.superAdmin.Scheduled jobs',
      type: 'metric',
      layout: 'metric',
      adapter: 'jobs-count',
      icon: 'tasks',
      section: 'operations',
      visibleTo: { superAdminOnly: true },
      link: '/system/manage-jobs'
    },
    {
      id: 'audits-count',
      titleKey: 'labels.superAdmin.Audit entries shown',
      type: 'metric',
      layout: 'metric',
      adapter: 'audits-count',
      icon: 'tasks',
      section: 'operations',
      visibleTo: { superAdminOnly: true },
      link: '/system/audit-trails'
    },
    {
      id: 'notifications-count',
      titleKey: 'labels.superAdmin.Notifications shown',
      type: 'metric',
      layout: 'metric',
      adapter: 'notifications-count',
      icon: 'bell',
      section: 'operations',
      visibleTo: { superAdminOnly: true }
    },
    {
      id: 'jobs-list',
      titleKey: 'labels.superAdmin.Scheduled jobs',
      type: 'list',
      layout: 'half',
      adapter: 'jobs-list',
      icon: 'tasks',
      section: 'operations',
      visibleTo: { superAdminOnly: true },
      link: '/system/manage-jobs'
    },
    {
      id: 'notifications-list',
      titleKey: 'labels.superAdmin.Recent notifications',
      type: 'list',
      layout: 'half',
      adapter: 'notifications-list',
      icon: 'bell',
      section: 'operations',
      visibleTo: { superAdminOnly: true }
    },
    {
      id: 'branch-workload',
      titleKey: 'labels.superAdmin.Approval workload by branch',
      type: 'list',
      layout: 'half',
      adapter: 'branch-workload',
      icon: 'users',
      section: 'operations',
      visibleTo: { superAdminOnly: true }
    },
    ...SUPER_ADMIN_DASHBOARD_WIDGETS
  ]
};
