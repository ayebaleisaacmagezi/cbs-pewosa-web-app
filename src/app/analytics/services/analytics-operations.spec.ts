/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { AnalyticsDataSourceService } from './analytics-data-source.service';
import { AnalyticsVisibilityService } from './analytics-visibility.service';
import {
  AnalyticsFilters,
  AnalyticsWidgetAdapter,
  AnalyticsWidgetDefinition,
  AnalyticsWidgetState
} from '../models/analytics-dashboard.model';

describe('Super Admin dashboard operations', () => {
  let service: AnalyticsDataSourceService;
  let http: HttpTestingController;
  let permissions: string[];
  const filters: AnalyticsFilters = { officeId: null, timescale: 'Month' };
  function widget(adapter: AnalyticsWidgetAdapter, type: 'metric' | 'list' = 'metric'): AnalyticsWidgetDefinition {
    return { id: adapter, adapter, type, layout: 'metric', titleKey: adapter, icon: 'tasks' };
  }
  beforeEach(() => {
    permissions = ['ALL_FUNCTIONS'];
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions, officeId: 1 }) } },
        { provide: TranslateService, useValue: { currentLang: 'en-US' } }
      ] });
    service = TestBed.inject(AnalyticsDataSourceService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('restricts operations to Super Admin even when staff have read access', () => {
    const visibility = TestBed.inject(AnalyticsVisibilityService);
    permissions = [
      'READ_USER',
      'READ_REPORT',
      'ALL_FUNCTIONS_READ'
    ];
    expect(visibility.canView({ superAdminOnly: true })).toBe(false);
    permissions = ['ALL_FUNCTIONS'];
    expect(visibility.canView({ superAdminOnly: true })).toBe(true);
  });
  it('shows a successful zero count rather than No Data', () => {
    let result: AnalyticsWidgetState;
    service.loadWidget(widget('jobs-count'), filters).subscribe((state) => (result = state));
    http.expectOne('/jobs').flush([]);
    expect(result!.metricValue).toBe(0);
    expect(result!.empty).toBe(false);
    expect(result!.error).toBeUndefined();
  });
  it('distinguishes unavailable sources from empty responses', () => {
    let result: AnalyticsWidgetState;
    service.loadWidget(widget('users-count'), filters).subscribe((state) => (result = state));
    http.expectOne('/users').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(result!.error).toBe(true);
    expect(result!.empty).toBe(false);
  });
  it('shares requests between jobs cards and lists and refreshes after cache clear', () => {
    service.loadWidget(widget('jobs-count'), filters).subscribe();
    service.loadWidget(widget('jobs-list', 'list'), filters).subscribe();
    http.expectOne('/jobs').flush([{ jobId: 1, displayName: 'Posting', active: true }]);
    service.clearCache();
    service.loadWidget(widget('jobs-count'), filters).subscribe();
    http.expectOne('/jobs').flush([]);
  });
  it('reads all approval pages and groups branch workload without an office filter', () => {
    let result: AnalyticsWidgetState;
    service.loadWidget(widget('branch-workload', 'list'), filters).subscribe((state) => (result = state));
    const first = http.expectOne((req) => req.url.endsWith('/approval-queue') && req.params.get('page') === '0');
    expect(first.request.params.has('officeId')).toBe(false);
    first.flush({
      totalFilteredRecords: 101,
      pageItems: Array.from({ length: 100 }, () => ({ officeId: 2, officeName: 'Branch A' }))
    });
    http
      .expectOne((req) => req.url.endsWith('/approval-queue') && req.params.get('page') === '1')
      .flush({ totalFilteredRecords: 101, pageItems: [{ officeId: 3, officeName: 'Branch B' }] });
    expect(result!.metricValue).toBe(101);
    expect(result!.rows).toEqual([
      { title: 'Branch A', value: 100 },
      { title: 'Branch B', value: 1 }
    ]);
  });
  it('passes the selected office to the approval queue', () => {
    service.loadWidget(widget('approval-total'), { ...filters, officeId: 7 }).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/approval-queue'));
    expect(request.request.params.get('officeId')).toBe('7');
    request.flush({ totalFilteredRecords: 0, pageItems: [] });
  });
  it('uses the signed-in office hierarchy for All branches business reports', () => {
    service.loadWidget(widget('collection-total'), filters).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/runreports/Demand Vs Collection'));
    expect(request.request.params.get('R_officeId')).toBe('1');
    request.flush([{ AmountDue: 12, AmountPaid: 8 }]);
  });
});
