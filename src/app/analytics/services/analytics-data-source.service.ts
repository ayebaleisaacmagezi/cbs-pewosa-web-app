/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpContext } from '@angular/common/http';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { SUPPRESS_HTTP_ERROR_ALERT } from 'app/core/http/error-handler.interceptor';
import { Logger } from 'app/core/logger/logger.service';
const log = new Logger('Dashboard API');
import { TranslateService } from '@ngx-translate/core';

import { Observable, forkJoin, of, defer } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap, timeout } from 'rxjs/operators';

import {
  AnalyticsFilters,
  AnalyticsTimescale,
  AnalyticsWidgetDefinition,
  AnalyticsWidgetState
} from '../models/analytics-dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsDataSourceService {
  private http = inject(HttpClient);
  private authenticationService = inject(AuthenticationService);
  private translateService = inject(TranslateService);

  private reportCache = new Map<string, Observable<any>>();
  /** Potentially better formatting? */
  loadWidget(widget: AnalyticsWidgetDefinition, filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    log.info('Widget load', { widget: widget.id, adapter: widget.adapter, filters });
    return defer(() => this.loadWidgetSource(widget, filters)).pipe(
      tap((state) => {
        if (state.error) log.warn('Widget source unavailable', { widget: widget.id });
      }),
      catchError((error) => {
        log.error('Widget failed before request or during transformation', {
          widget: widget.id,
          type: error?.name,
          status: error?.status
        });
        return of({ loading: false, empty: false, error: true });
      })
    );
  }

  private loadWidgetSource(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    switch (widget.adapter) {
      case 'not-connected':
        return of({ loading: false, empty: false, unavailable: true, noteKey: 'labels.superAdmin.Not connected' });
      case 'portfolio-balance':
      case 'portfolio-active':
      case 'portfolio-par30':
      case 'portfolio-arrears':
      case 'portfolio-age30':
      case 'portfolio-age90':
      case 'portfolio-age180':
      case 'portfolio-age360':
        return this.loadPortfolioMetric(widget, filters);
      case 'portfolio-branch-ranking':
      case 'portfolio-top-products':
      case 'portfolio-top-exposures':
      case 'portfolio-product-mix':
      case 'portfolio-ageing':
      case 'portfolio-classification':
        return this.loadPortfolioBreakdown(widget, filters);
      case 'portfolio-member-loans':
      case 'portfolio-member-arrears':
        return this.loadPortfolioMemberCount(widget, filters);
      case 'members-active':
      case 'members-total':
      case 'members-mtd':
      case 'members-today':
        return this.loadMemberMetric(widget, filters);
      case 'members-by-category':
      case 'members-by-gender':
        return this.loadMemberBreakdown(widget, filters);
      case 'products-active':
      case 'products-rates':
        return this.loadLoanProducts(widget);
      case 'journal-debits-mtd':
      case 'journal-credits-mtd':
        return this.loadJournalMetric(widget, filters);
      case 'savings-total':
      case 'savings-average':
      case 'savings-by-product':
      case 'savings-top-members':
        return this.loadSavingsMetric(widget, filters);
      case 'shares-total':
      case 'shares-top-members':
        return this.loadShareMetric(widget, filters);
      case 'fixed-deposits-count':
        return this.loadFixedDepositCount(filters);
      case 'standing-count':
      case 'standing-failed-today':
      case 'standing-failed-mtd':
        return this.loadStandingMetric(widget, filters);
      case 'writeoffs-mtd-ytd':
      case 'writeoff-recoveries':
        return this.loadWriteOffMetric(widget, filters);
      case 'expense-total':
        return this.loadExpenseMetric(filters);
      case 'client-total':
        return this.loadTrendMetric(filters, 'client');
      case 'loan-total':
        return this.loadTrendMetric(filters, 'loan');
      case 'collection-total':
        return this.loadAmountMetric(filters, 'Demand Vs Collection');
      case 'disbursement-total':
        return this.loadAmountMetric(filters, 'Disbursal Vs Awaitingdisbursal');
      case 'client-loan-trends':
        return this.loadTrendChart(filters);
      case 'collection-breakdown':
        return this.loadAmountChart(filters, 'Demand Vs Collection', 'labels.inputs.Amount Collected');
      case 'disbursement-breakdown':
        return this.loadAmountChart(filters, 'Disbursal Vs Awaitingdisbursal', 'labels.catalogs.Disbursement');
      case 'approval-total':
      case 'branch-workload':
        return this.loadApprovalSummary(widget, filters);
      case 'users-count':
      case 'jobs-count':
      case 'audits-count':
      case 'notifications-count':
      case 'jobs-list':
      case 'notifications-list':
        return this.loadOperations(widget);
      default:
        return of({
          loading: false,
          empty: true
        });
    }
  }

  clearCache(): void {
    log.info('Clearing dashboard cache', { entries: this.reportCache.size });
    this.reportCache.clear();
  }

  private loadTrendMetric(filters: AnalyticsFilters, type: 'client' | 'loan'): Observable<AnalyticsWidgetState> {
    return this.loadTrendSeries(filters, type).pipe(
      map((series) => ({
        loading: false,
        empty: false,
        metricValue: series.reduce((sum, value) => sum + value, 0),
        contextKey: this.getTimescaleKey(filters.timescale)
      })),
      catchError(() =>
        of({
          loading: false,
          error: true,
          empty: false
        })
      )
    );
  }

  private loadAmountMetric(filters: AnalyticsFilters, reportName: string): Observable<AnalyticsWidgetState> {
    return this.runReport(reportName, this.buildReportParams(filters)).pipe(
      map((response) => {
        const [
          pending,
          complete
        ] = this.extractAmountPair(response, reportName);
        return {
          loading: false,
          empty: false,
          metricValue: complete
        };
      }),
      catchError(() =>
        of({
          loading: false,
          error: true,
          empty: false
        })
      )
    );
  }

  private loadTrendChart(filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    return forkJoin([
      this.loadTrendSeries(filters, 'client'),
      this.loadTrendSeries(filters, 'loan')
    ]).pipe(
      map(
        ([
          clients,
          loans
        ]) => ({
          loading: false,
          empty: clients.every((value) => value === 0) && loans.every((value) => value === 0),
          labels: this.getTimescaleLabels(filters.timescale),
          translateLabels: false,
          datasets: [
            {
              labelKey: 'labels.inputs.Clients',
              data: clients,
              backgroundColor: '#1565c0',
              borderColor: '#1565c0',
              borderWidth: 1
            },
            {
              labelKey: 'labels.menus.Loans',
              data: loans,
              backgroundColor: '#2e7d32',
              borderColor: '#2e7d32',
              borderWidth: 1
            }
          ],
          details: [
            {
              labelKey: 'labels.inputs.Clients',
              value: clients.reduce((sum, value) => sum + value, 0)
            },
            {
              labelKey: 'labels.menus.Loans',
              value: loans.reduce((sum, value) => sum + value, 0)
            }
          ]
        })
      ),
      catchError(() =>
        of({
          loading: false,
          error: true,
          empty: false
        })
      )
    );
  }

  private loadAmountChart(
    filters: AnalyticsFilters,
    reportName: string,
    completeLabelKey: string
  ): Observable<AnalyticsWidgetState> {
    return this.runReport(reportName, this.buildReportParams(filters)).pipe(
      map((response) => {
        const [
          pending,
          complete
        ] = this.extractAmountPair(response, reportName);
        const pendingAmount = Math.max(0, pending);
        const completeAmount = Math.max(0, complete);
        return {
          loading: false,
          empty: pendingAmount === 0 && completeAmount === 0,
          labels: [
            'labels.status.Pending',
            completeLabelKey
          ],
          translateLabels: true,
          datasets: [
            {
              labelKey: completeLabelKey,
              data: [
                pendingAmount,
                completeAmount
              ],
              backgroundColor: [
                '#1e88e5',
                '#d32f2f'
              ],
              borderWidth: 0
            }
          ],
          details: [
            {
              labelKey: 'labels.status.Pending',
              value: pendingAmount
            },
            {
              labelKey: completeLabelKey,
              value: completeAmount
            }
          ]
        };
      }),
      catchError(() =>
        of({
          loading: false,
          error: true,
          empty: false
        })
      )
    );
  }

  private loadTrendSeries(filters: AnalyticsFilters, type: 'client' | 'loan'): Observable<number[]> {
    const reportName = this.getTrendReportName(filters.timescale, type);
    const labels = this.getTimescaleLabels(filters.timescale);
    const valueField = type === 'client' ? 'count' : 'lcount';

    return this.runReport(reportName, this.buildReportParams(filters)).pipe(
      map((response: any[]) =>
        labels.map((label) => {
          const entry = response.find((item) => this.resolveTrendLabel(item, filters.timescale) === label);
          return Number(entry?.[valueField] || 0);
        })
      )
    );
  }

  private buildReportParams(filters: AnalyticsFilters): Record<string, string | number> {
    const params: Record<string, string | number> = {
      genericResultSet: 'false'
    };

    // Just avoid forcing an invalid id
    const officeId = filters.officeId ?? this.authenticationService.getCredentials()?.officeId;
    if (!Number.isInteger(officeId) || officeId < 1) throw new Error('No report office selected');
    params['R_officeId'] = officeId;

    return params;
  }

  private runReport(reportName: string, params: Record<string, string | number>): Observable<any> {
    return this.runReportPath(`/runreports/${reportName}`, params);
  }

  private queueParameters(filters: AnalyticsFilters, page: number): Record<string, string | number> {
    const params: Record<string, string | number> = { bucket: 'PORTFOLIO', page, size: 200 };
    if (filters.officeId != null) params['officeId'] = filters.officeId;
    return params;
  }

  private portfolioPages(
    filters: AnalyticsFilters,
    page = 0,
    accumulated: any[] = [],
    expected?: number
  ): Observable<any[]> {
    return this.runReportPath('/pewosa/loan-servicing/work-queue', this.queueParameters(filters, page)).pipe(
      switchMap((response) => {
        const total = Number(response?.totalElements);
        if (
          !Array.isArray(response?.content) ||
          !Number.isInteger(total) ||
          total < 0 ||
          total > 5000 ||
          (expected !== undefined && expected !== total)
        )
          throw new Error('Incomplete or changing portfolio');
        const rows = accumulated.concat(response.content);
        if (rows.length === total) return of(rows);
        if (!response.content.length || rows.length > total || page >= 24) throw new Error('Incomplete portfolio');
        return this.portfolioPages(filters, page + 1, rows, total);
      })
    );
  }

  private loadPortfolioMetric(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    if (widget.adapter === 'portfolio-active') {
      return this.runReportPath('/pewosa/loan-servicing/work-queue', this.queueParameters(filters, 0)).pipe(
        map((response) => {
          const total = Number(response?.totalElements);
          if (!Array.isArray(response?.content) || !Number.isInteger(total) || total < 0)
            throw new Error('Invalid portfolio count');
          return { loading: false, empty: false, metricValue: total, noteKey: 'labels.superAdmin.Portfolio scope' };
        })
      );
    }
    return this.portfolioPages(filters).pipe(
      map((rows) => {
        const currencies = new Map<string, { outstanding: number; risk: number }>();
        const seen = new Set<number>();
        let arrears = 0;
        const ageThreshold = widget.adapter.startsWith('portfolio-age')
          ? Number(widget.adapter.replace('portfolio-age', ''))
          : 0;
        rows.forEach((loan) => {
          const principal = Number(loan.principalOutstanding),
            days = Number(loan.daysInArrears);
          if (
            !Number.isInteger(loan.loanId) ||
            seen.has(loan.loanId) ||
            !Number.isFinite(principal) ||
            principal < 0 ||
            !Number.isInteger(days) ||
            days < 0 ||
            !loan.currencyCode ||
            (filters.officeId != null && Number(loan.officeId) !== filters.officeId)
          )
            throw new Error('Invalid portfolio loan');
          seen.add(loan.loanId);
          const totals = currencies.get(loan.currencyCode) || { outstanding: 0, risk: 0 };
          totals.outstanding += principal;
          if (days > 30) totals.risk += principal;
          currencies.set(loan.currencyCode, totals);
          if (days > ageThreshold) arrears++;
        });
        if (widget.adapter === 'portfolio-arrears' || ageThreshold) {
          return { loading: false, empty: false, metricValue: arrears, noteKey: 'labels.superAdmin.Portfolio scope' };
        }
        const amounts = Array.from(currencies.entries()).sort(([a], [b]) => a.localeCompare(b));
        const par = widget.adapter === 'portfolio-par30';
        if (!amounts.length)
          return {
            loading: false,
            empty: false,
            metricValue: 0,
            unit: par ? '%' : undefined,
            noteKey: 'labels.superAdmin.Portfolio scope'
          };
        const value = (total: { outstanding: number; risk: number }) =>
          par ? (total.outstanding > 0 ? (100 * total.risk) / total.outstanding : 0) : total.outstanding;
        if (amounts.length === 1)
          return {
            loading: false,
            empty: false,
            metricValue: value(amounts[0][1]),
            currencyCode: par ? undefined : amounts[0][0],
            unit: par ? '%' : undefined,
            noteKey: 'labels.superAdmin.Portfolio scope'
          };
        return {
          loading: false,
          empty: false,
          metricText: amounts
            .map(
              ([
                code,
                total
              ]) => code + ' ' + value(total).toLocaleString('en-UG', { maximumFractionDigits: 2 }) + (par ? '%' : '')
            )
            .join(' / '),
          noteKey: 'labels.superAdmin.Currencies separate'
        };
      })
    );
  }

  private loadPortfolioBreakdown(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    return this.portfolioPages(filters).pipe(
      map((loans) => {
        const groups = new Map<string, { title: string; count: number; amount: number; currency?: string }>();
        const seen = new Set<number>();
        for (const loan of loans) {
          const amount = Number(loan.principalOutstanding);
          const days = Number(loan.daysInArrears);
          if (
            !Number.isInteger(loan.loanId) ||
            seen.has(loan.loanId) ||
            !Number.isFinite(amount) ||
            amount < 0 ||
            !Number.isInteger(days) ||
            days < 0 ||
            (filters.officeId != null && Number(loan.officeId) !== filters.officeId)
          )
            throw new Error('Invalid loan in portfolio breakdown');
          seen.add(loan.loanId);
          if (widget.adapter === 'portfolio-ageing' && days === 0) continue;

          let key: string;
          let title: string;
          let currency: string | undefined;
          if (widget.adapter === 'portfolio-branch-ranking') {
            if (!Number.isInteger(loan.officeId) || !loan.officeName) throw new Error('Invalid loan office');
            key = String(loan.officeId);
            title = loan.officeName;
          } else if (widget.adapter === 'portfolio-top-exposures') {
            if (!Number.isInteger(loan.clientId) || !loan.clientName || !loan.currencyCode)
              throw new Error('Invalid loan member or currency');
            key = loan.clientId + ':' + loan.currencyCode;
            title = loan.clientName;
            currency = loan.currencyCode;
          } else if (widget.adapter === 'portfolio-ageing') {
            key = days === 0 ? '0' : days <= 30 ? '1-30' : days <= 90 ? '31-90' : days <= 180 ? '91-180' : days <= 360 ? '181-360' : '360+';
            title = key;
          } else if (widget.adapter === 'portfolio-classification') {
            key = loan.classification || 'unclassified';
            title = loan.classification || this.translateService.instant('labels.superAdmin.Unclassified');
          } else {
            if (!loan.productName) throw new Error('Missing loan product');
            key = loan.productName;
            title = key;
          }
          const group = groups.get(key) || { title, count: 0, amount: 0, currency };
          group.count++;
          group.amount += amount;
          groups.set(key, group);
        }
        const exposure = widget.adapter === 'portfolio-top-exposures';
        const mix = widget.adapter === 'portfolio-product-mix';
        const topFive = widget.adapter === 'portfolio-branch-ranking' ||
          widget.adapter === 'portfolio-top-products' || mix;
        const sorted = Array.from(groups.values()).sort((a, b) =>
          exposure
            ? (a.currency || '').localeCompare(b.currency || '') || b.amount - a.amount
            : b.count - a.count || a.title.localeCompare(b.title)
        );
        const exposureCounts = new Map<string, number>();
        const limited = topFive
          ? sorted.slice(0, 5)
          : exposure
            ? sorted.filter((group) => {
                const currency = group.currency || '';
                const count = exposureCounts.get(currency) || 0;
                exposureCounts.set(currency, count + 1);
                return count < 10;
              })
            : sorted;
        return {
          loading: false,
          empty: groups.size === 0,
          rows: limited.map((group) => ({
            title: group.title,
            detail: exposure
              ? group.currency + ' ' + group.amount.toLocaleString('en-UG', { maximumFractionDigits: 2 })
              : mix && loans.length
                ? ((100 * group.count) / loans.length).toLocaleString('en-UG', { maximumFractionDigits: 1 }) + '%'
                : undefined,
            value: exposure || mix ? undefined : group.count
          })),
          noteKey: exposure
            ? 'labels.superAdmin.Exposure scope'
            : mix
              ? 'labels.superAdmin.Product mix scope'
              : widget.adapter === 'portfolio-ageing'
                ? 'labels.superAdmin.Arrears ageing scope'
              : 'labels.superAdmin.Active loan count scope'
        };
      })
    );
  }

  private loadPortfolioMemberCount(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    return this.portfolioPages(filters).pipe(
      map((loans) => {
        const members = new Set<number>();
        for (const loan of loans) {
          const days = Number(loan.daysInArrears);
          if (
            !Number.isInteger(loan.clientId) ||
            !Number.isInteger(days) ||
            days < 0 ||
            (filters.officeId != null && Number(loan.officeId) !== filters.officeId)
          )
            throw new Error('Invalid loan member or office');
          if (widget.adapter === 'portfolio-member-loans' || days > 0) members.add(loan.clientId);
        }
        return {
          loading: false,
          empty: false,
          metricValue: members.size,
          noteKey:
            widget.adapter === 'portfolio-member-arrears'
              ? 'labels.superAdmin.Arrears member scope'
              : 'labels.superAdmin.Active loan member scope'
        };
      })
    );
  }

  private dateString(value: any): string {
    const text =
      Array.isArray(value) && value.length === 3
        ? String(value[0]) + '-' + String(value[1]).padStart(2, '0') + '-' + String(value[2]).padStart(2, '0')
        : String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text)))
      throw new Error('Invalid business or activation date');
    return text;
  }

  private clientParameters(
    filters: AnalyticsFilters,
    offset: number,
    active: boolean
  ): Record<string, string | number> {
    const params: Record<string, string | number> = {
      offset,
      limit: 100,
      orderBy: 'activationDate',
      sortOrder: 'DESC'
    };
    if (active) params['status'] = 'active';
    if (filters.officeId != null) params['officeId'] = filters.officeId;
    return params;
  }

  private loadMemberMetric(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    if (widget.adapter === 'members-mtd' || widget.adapter === 'members-today') {
      return this.runReportPath('/businessdate/BUSINESS_DATE', {}).pipe(
        switchMap((response) => {
          if (response?.type !== 'BUSINESS_DATE') throw new Error('Invalid business date');
          const businessDate = this.dateString(response.date);
          return this.newMemberPages(
            filters,
            businessDate,
            widget.adapter === 'members-today' ? businessDate : businessDate.slice(0, 7) + '-01'
          );
        }),
        map((count) => ({
          loading: false,
          empty: false,
          metricValue: count,
          noteKey:
            widget.adapter === 'members-today'
              ? 'labels.superAdmin.Today member scope'
              : 'labels.superAdmin.MTD member scope'
        }))
      );
    }
    return this.runReportPath('/clients', this.clientParameters(filters, 0, widget.adapter === 'members-active')).pipe(
      map((response) => {
        const count = Number(response?.totalFilteredRecords);
        if (!Array.isArray(response?.pageItems) || !Number.isInteger(count) || count < 0)
          throw new Error('Invalid member count');
        return {
          loading: false,
          empty: false,
          metricValue: count,
          noteKey:
            widget.adapter === 'members-active'
              ? 'labels.superAdmin.Active member scope'
              : 'labels.superAdmin.Member scope'
        };
      })
    );
  }

  private newMemberPages(
    filters: AnalyticsFilters,
    businessDate: string,
    fromDate: string,
    offset = 0,
    count = 0,
    expected?: number
  ): Observable<number> {
    return this.runReportPath('/clients', this.clientParameters(filters, offset, true)).pipe(
      switchMap((response) => {
        const total = Number(response?.totalFilteredRecords);
        if (
          !Array.isArray(response?.pageItems) ||
          !Number.isInteger(total) ||
          total < 0 ||
          (expected !== undefined && total !== expected)
        )
          throw new Error('Invalid or changing member count');
        const periodStart = fromDate;
        for (const member of response.pageItems) {
          if (filters.officeId != null && Number(member.officeId) !== filters.officeId)
            throw new Error('Invalid member office');
          const date = this.dateString(member.activationDate);
          if (date < periodStart) return of(count);
          if (date <= businessDate) count++;
        }
        const nextOffset = offset + response.pageItems.length;
        if (nextOffset >= total) return of(count);
        if (!response.pageItems.length || nextOffset >= 2500)
          throw new Error('Monthly member count exceeds summary limit');
        return this.newMemberPages(filters, businessDate, fromDate, nextOffset, count, total);
      })
    );
  }

  private clientPages(
    filters: AnalyticsFilters,
    offset = 0,
    accumulated: any[] = [],
    expected?: number
  ): Observable<any[]> {
    return this.runReportPath('/clients', this.clientParameters(filters, offset, false)).pipe(
      switchMap((response) => {
        const total = Number(response?.totalFilteredRecords);
        if (
          !Array.isArray(response?.pageItems) ||
          !Number.isInteger(total) ||
          total < 0 ||
          total > 5000 ||
          (expected !== undefined && total !== expected)
        )
          throw new Error('Incomplete or changing member total');
        const rows = accumulated.concat(response.pageItems);
        if (rows.length === total) return of(rows);
        if (!response.pageItems.length || rows.length > total) throw new Error('Incomplete members');
        return this.clientPages(filters, offset + response.pageItems.length, rows, total);
      })
    );
  }

  private loadMemberBreakdown(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    return this.clientPages(filters).pipe(
      map((members) => {
        const groups = new Map<string, number>();
        const seen = new Set<number>();
        for (const member of members) {
          if (
            !Number.isInteger(member.id) ||
            seen.has(member.id) ||
            (filters.officeId != null && Number(member.officeId) !== filters.officeId)
          )
            throw new Error('Invalid member in breakdown');
          seen.add(member.id);
          const code = widget.adapter === 'members-by-gender' ? member.gender : member.clientType;
          const name = code?.name || 'Unspecified';
          groups.set(name, (groups.get(name) || 0) + 1);
        }
        return {
          loading: false,
          empty: members.length === 0,
          rows: Array.from(groups.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([title, value]) => ({ title, value })),
          noteText: 'Members in the selected scope.'
        };
      })
    );
  }

  private loadLoanProducts(widget: AnalyticsWidgetDefinition): Observable<AnalyticsWidgetState> {
    return this.runReportPath('/loanproducts', {}).pipe(
      map((response) => {
        if (!Array.isArray(response) || response.some((product) => !Number.isInteger(product?.id) || typeof product?.status !== 'string')) {
          throw new Error('Invalid loan product list');
        }
        const active = response.filter((product) => product.status === 'loanProduct.active');
        if (widget.adapter === 'products-rates') {
          return {
            loading: false,
            empty: active.length === 0,
            rows: active.sort((a, b) => String(a.name).localeCompare(String(b.name))).map((product) => {
              const rate = product.interestRatePerPeriod;
              if (!product.name || (rate != null && !Number.isFinite(Number(rate))))
                throw new Error('Invalid loan product rate');
              const period = product.interestRateFrequencyType?.value;
              return {
                title: product.name,
                detail: rate == null
                  ? product.floatingRateName || this.translateService.instant('labels.superAdmin.Rate unavailable')
                  : Number(rate).toLocaleString('en-UG', { maximumFractionDigits: 4 }) + '% / ' +
                    (period || this.translateService.instant('labels.superAdmin.Period unavailable'))
              };
            }),
            noteKey: 'labels.superAdmin.Product rate scope'
          };
        }
        return {
          loading: false,
          empty: false,
          metricValue: active.length,
          noteKey: 'labels.superAdmin.Active product scope'
        };
      })
    );
  }

  private journalPages(
    filters: AnalyticsFilters,
    fromDate: string,
    toDate: string,
    offset = 0,
    accumulated: any[] = [],
    expected?: number
  ): Observable<any[]> {
    const params: Record<string, string | number> = {
      fromDate,
      toDate,
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
      offset,
      limit: 200
    };
    if (filters.officeId != null) params['officeId'] = filters.officeId;
    return this.runReportPath('/journalentries', params).pipe(
      switchMap((response) => {
        const total = Number(response?.totalFilteredRecords);
        if (
          !Array.isArray(response?.pageItems) ||
          !Number.isInteger(total) ||
          total < 0 ||
          total > 5000 ||
          (expected !== undefined && total !== expected)
        )
          throw new Error('Incomplete or changing journal entry total');
        const rows = accumulated.concat(response.pageItems);
        if (rows.length === total) return of(rows);
        if (!response.pageItems.length || rows.length > total) throw new Error('Incomplete journal entries');
        return this.journalPages(filters, fromDate, toDate, offset + response.pageItems.length, rows, total);
      })
    );
  }

  private loadJournalMetric(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    return this.runReportPath('/businessdate/BUSINESS_DATE', {}).pipe(
      switchMap((response) => {
        if (response?.type !== 'BUSINESS_DATE') throw new Error('Invalid business date');
        const businessDate = this.dateString(response.date);
        return this.journalPages(filters, businessDate.slice(0, 7) + '-01', businessDate);
      }),
      map((entries) => {
        const totals = new Map<string, number>();
        const entryType = widget.adapter === 'journal-debits-mtd' ? 2 : 1;
        for (const entry of entries) {
          const amount = Number(entry.amount);
          const code = entry.currency?.code;
          if (
            !Number.isInteger(entry.id) ||
            ![1, 2].includes(Number(entry.entryType?.id)) ||
            !Number.isFinite(amount) ||
            amount < 0 ||
            !code ||
            (filters.officeId != null && Number(entry.officeId) !== filters.officeId)
          )
            throw new Error('Invalid journal entry');
          if (Number(entry.entryType.id) === entryType) totals.set(code, (totals.get(code) || 0) + amount);
        }
        const currencies = Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b));
        if (currencies.length === 1)
          return {
            loading: false,
            empty: false,
            metricValue: currencies[0][1],
            currencyCode: currencies[0][0],
            noteKey: 'labels.superAdmin.Journal MTD scope'
          };
        return {
          loading: false,
          empty: false,
          metricValue: currencies.length ? undefined : 0,
          metricText: currencies.length
            ? currencies.map(([code, total]) => code + ' ' + total.toLocaleString('en-UG', { maximumFractionDigits: 2 })).join(' / ')
            : undefined,
          noteKey: 'labels.superAdmin.Journal MTD scope'
        };
      })
    );
  }

  private savingsPages(
    offset = 0,
    accumulated: any[] = [],
    expected?: number
  ): Observable<any[]> {
    return this.runReportPath('/savingsaccounts', { offset, limit: 200 }).pipe(
      switchMap((response) => {
        const total = Number(response?.totalFilteredRecords);
        if (
          !Array.isArray(response?.pageItems) ||
          !Number.isInteger(total) ||
          total < 0 ||
          total > 5000 ||
          (expected !== undefined && total !== expected)
        )
          throw new Error('Incomplete or changing savings account total');
        const rows = accumulated.concat(response.pageItems);
        if (rows.length === total) return of(rows);
        if (!response.pageItems.length || rows.length > total) throw new Error('Incomplete savings accounts');
        return this.savingsPages(offset + response.pageItems.length, rows, total);
      })
    );
  }

  private loadSavingsMetric(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    if (filters.officeId != null)
      return of({
        loading: false,
        empty: false,
        unavailable: true,
        noteKey: 'labels.superAdmin.Savings office unavailable'
      });
    return this.savingsPages().pipe(
      map((accounts) => {
        const totals = new Map<string, { amount: number; count: number }>();
        const groups = new Map<string, { title: string; currency: string; amount: number }>();
        const seen = new Set<number>();
        for (const account of accounts) {
          if (!Number.isInteger(account.id) || seen.has(account.id) || typeof account.status?.active !== 'boolean')
            throw new Error('Invalid savings account');
          seen.add(account.id);
          if (!account.status.active) continue;
          const amount = Number(account.summary?.accountBalance);
          const currency = account.currency?.code;
          if (account.summary?.accountBalance == null || !Number.isFinite(amount) || !currency)
            throw new Error('Invalid savings account balance');
          const total = totals.get(currency) || { amount: 0, count: 0 };
          total.amount += amount;
          total.count++;
          totals.set(currency, total);
          if (widget.adapter === 'savings-by-product' || widget.adapter === 'savings-top-members') {
            const byProduct = widget.adapter === 'savings-by-product';
            const id = byProduct ? account.savingsProductId : account.clientId;
            const name = byProduct ? account.savingsProductName : account.clientName;
            if (!Number.isInteger(id) || !name) throw new Error('Invalid savings account owner or product');
            const key = id + ':' + currency;
            const group = groups.get(key) || { title: name, currency, amount: 0 };
            group.amount += amount;
            groups.set(key, group);
          }
        }
        if (widget.adapter === 'savings-by-product' || widget.adapter === 'savings-top-members') {
          const sorted = Array.from(groups.values()).sort((a, b) =>
            a.currency.localeCompare(b.currency) || b.amount - a.amount
          );
          const counts = new Map<string, number>();
          const visible = widget.adapter === 'savings-top-members'
            ? sorted.filter((group) => {
                const count = counts.get(group.currency) || 0;
                counts.set(group.currency, count + 1);
                return count < 10;
              })
            : sorted;
          return {
            loading: false,
            empty: visible.length === 0,
            rows: visible.map((group) => ({
              title: group.title,
              detail: group.currency + ' ' + group.amount.toLocaleString('en-UG', { maximumFractionDigits: 2 })
            })),
            noteKey:
              widget.adapter === 'savings-top-members'
                ? 'labels.superAdmin.Top savers scope'
                : 'labels.superAdmin.Savings balance scope'
          };
        }
        const average = widget.adapter === 'savings-average';
        const amounts = Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b));
        const amountFor = (total: { amount: number; count: number }) => average ? total.amount / total.count : total.amount;
        if (amounts.length === 1)
          return {
            loading: false,
            empty: false,
            metricValue: amountFor(amounts[0][1]),
            currencyCode: amounts[0][0],
            noteKey: average
              ? 'labels.superAdmin.Average savings scope'
              : 'labels.superAdmin.Savings balance scope'
          };
        return {
          loading: false,
          empty: false,
          metricValue: amounts.length ? undefined : 0,
          metricText: amounts.length
            ? amounts.map(([code, total]) => code + ' ' + amountFor(total).toLocaleString('en-UG', { maximumFractionDigits: 2 })).join(' / ')
            : undefined,
          noteKey: average
            ? 'labels.superAdmin.Average savings scope'
            : 'labels.superAdmin.Savings balance scope'
        };
      })
    );
  }

  private sharePages(offset = 0, accumulated: any[] = [], expected?: number): Observable<any[]> {
    return this.runReportPath('/accounts/share', { offset, limit: 200 }).pipe(
      switchMap((response) => {
        const total = Number(response?.totalFilteredRecords);
        if (
          !Array.isArray(response?.pageItems) ||
          !Number.isInteger(total) ||
          total < 0 ||
          total > 5000 ||
          (expected !== undefined && total !== expected)
        )
          throw new Error('Incomplete or changing share account total');
        const rows = accumulated.concat(response.pageItems);
        if (rows.length === total) return of(rows);
        if (!response.pageItems.length || rows.length > total) throw new Error('Incomplete share accounts');
        return this.sharePages(offset + response.pageItems.length, rows, total);
      })
    );
  }

  private loadShareMetric(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    if (filters.officeId != null)
      return of({
        loading: false,
        empty: false,
        unavailable: true,
        noteText: 'The share account list does not expose branch IDs.'
      });
    return this.sharePages().pipe(
      map((accounts) => {
        const members = new Map<number, { title: string; shares: number }>();
        const seen = new Set<number>();
        let total = 0;
        for (const account of accounts) {
          const shares = Number(account.summary?.totalApprovedShares);
          if (
            !Number.isInteger(account.id) ||
            seen.has(account.id) ||
            account.summary?.totalApprovedShares == null ||
            !Number.isInteger(shares) ||
            shares < 0
          )
            throw new Error('Invalid active share account');
          seen.add(account.id);
          total += shares;
          if (widget.adapter === 'shares-top-members') {
            if (!Number.isInteger(account.clientId) || !account.clientName)
              throw new Error('Invalid share account member');
            const member = members.get(account.clientId) || { title: account.clientName, shares: 0 };
            member.shares += shares;
            members.set(account.clientId, member);
          }
        }
        if (widget.adapter === 'shares-total')
          return {
            loading: false,
            empty: false,
            metricValue: total,
            noteText: 'Approved share count across accessible branches.'
          };
        return {
          loading: false,
          empty: members.size === 0,
          rows: Array.from(members.values())
            .sort((a, b) => b.shares - a.shares || a.title.localeCompare(b.title))
            .slice(0, 10)
            .map((member) => ({ title: member.title, value: member.shares })),
          noteText: 'Top members by approved share count.'
        };
      })
    );
  }

  private loadFixedDepositCount(filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    if (filters.officeId != null)
      return of({
        loading: false,
        empty: false,
        unavailable: true,
        noteText: 'The fixed deposit account list does not expose branch IDs.'
      });
    return this.runReportPath('/fixeddepositaccounts', { paged: 'true', offset: 0, limit: 1 }).pipe(
      map((response) => {
        const total = Number(response?.totalFilteredRecords);
        if (!Number.isInteger(total) || total < 0 || !Array.isArray(response?.pageItems))
          throw new Error('Invalid fixed deposit account count');
        return {
          loading: false,
          empty: false,
          metricValue: total,
          noteText: 'All fixed deposit accounts visible to your account.'
        };
      })
    );
  }

  private standingPages(
    path: string,
    params: Record<string, string | number>,
    offset = 0,
    accumulated: any[] = [],
    expected?: number
  ): Observable<any[]> {
    return this.runReportPath(path, { ...params, offset, limit: 200 }).pipe(
      switchMap((response) => {
        const total = Number(response?.totalFilteredRecords);
        if (
          !Array.isArray(response?.pageItems) ||
          !Number.isInteger(total) ||
          total < 0 ||
          total > 5000 ||
          (expected !== undefined && total !== expected)
        )
          throw new Error('Incomplete or changing standing instruction total');
        const rows = accumulated.concat(response.pageItems);
        if (rows.length === total) return of(rows);
        if (!response.pageItems.length || rows.length > total) throw new Error('Incomplete standing instructions');
        return this.standingPages(path, params, offset + response.pageItems.length, rows, total);
      })
    );
  }

  private loadStandingMetric(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    const countInstructions = widget.adapter === 'standing-count';
    const date$ = countInstructions
      ? of('')
      : this.runReportPath('/businessdate/BUSINESS_DATE', {}).pipe(
          map((response) => {
            if (response?.type !== 'BUSINESS_DATE') throw new Error('Invalid business date');
            return this.dateString(response.date);
          })
        );
    return date$.pipe(
      switchMap((businessDate) => {
        const params: Record<string, string | number> = countInstructions
          ? {}
          : {
              fromDate: widget.adapter === 'standing-failed-today' ? businessDate : businessDate.slice(0, 7) + '-01',
              toDate: businessDate,
              dateFormat: 'yyyy-MM-dd',
              locale: 'en'
            };
        return this.standingPages(
          countInstructions ? '/standinginstructions' : '/standinginstructionrunhistory',
          params
        );
      }),
      map((rows) => {
        let count = 0;
        for (const row of rows) {
          if (!Number.isInteger(row.fromOffice?.id)) throw new Error('Invalid standing instruction office');
          if (filters.officeId != null && row.fromOffice.id !== filters.officeId) continue;
          if (countInstructions || row.status === 'failed') count++;
        }
        return {
          loading: false,
          empty: false,
          metricValue: count,
          noteText: countInstructions
            ? 'Configured standing instructions in the selected scope.'
            : widget.adapter === 'standing-failed-today'
              ? 'Failed standing instruction runs today.'
              : 'Failed standing instruction runs this month.'
        };
      })
    );
  }

  private loadWriteOffMetric(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    if (filters.officeId != null)
      return of({
        loading: false,
        empty: false,
        unavailable: true,
        noteText: 'The write-off register does not expose branch IDs for this filter.'
      });
    return this.runReportPath('/businessdate/BUSINESS_DATE', {}).pipe(
      switchMap((response) => {
        if (response?.type !== 'BUSINESS_DATE') throw new Error('Invalid business date');
        const businessDate = this.dateString(response.date);
        const path = '/pewosa/loan-servicing/write-off-report';
        if (widget.adapter === 'writeoffs-mtd-ytd')
          return forkJoin({
            mtd: this.runReportPath(path, { fromDate: businessDate.slice(0, 7) + '-01', toDate: businessDate }),
            ytd: this.runReportPath(path, { fromDate: businessDate.slice(0, 4) + '-01-01', toDate: businessDate })
          });
        return this.runReportPath(path, {}).pipe(map((all) => ({ all })));
      }),
      map((reports: any) => {
        const rowsFor = (report: any): any[] => {
          if (
            !Array.isArray(report?.writeOffs) ||
            !Number.isInteger(report?.recordCount) ||
            report.recordCount !== report.writeOffs.length ||
            report.writeOffs.length > 5000
          )
            throw new Error('Invalid write-off report');
          return report.writeOffs;
        };
        const totals = new Map<string, { mtd: number; ytd: number }>();
        const collect = (rows: any[], field: 'mtd' | 'ytd', recovered: boolean) => {
          for (const row of rows) {
            const code = row.currencyCode;
            const amount = Number(recovered ? row.recoveredAfterWriteOff : row.amountWrittenOff);
            if (!code || !Number.isFinite(amount) || amount < 0) throw new Error('Invalid write-off amount');
            const total = totals.get(code) || { mtd: 0, ytd: 0 };
            total[field] += amount;
            totals.set(code, total);
          }
        };
        if (widget.adapter === 'writeoffs-mtd-ytd') {
          collect(rowsFor(reports.ytd), 'ytd', false);
          collect(rowsFor(reports.mtd), 'mtd', false);
        } else {
          collect(rowsFor(reports.all), 'ytd', true);
        }
        const amounts = Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b));
        if (widget.adapter === 'writeoffs-mtd-ytd')
          return {
            loading: false,
            empty: amounts.length === 0,
            rows: amounts.flatMap(([code, total]) => [
              { title: code + ' MTD', detail: total.mtd.toLocaleString('en-UG', { maximumFractionDigits: 2 }) },
              { title: code + ' YTD', detail: total.ytd.toLocaleString('en-UG', { maximumFractionDigits: 2 }) }
            ]),
            noteText: 'Executed write-offs in the accessible branches.'
          };
        if (amounts.length === 1)
          return {
            loading: false,
            empty: false,
            metricValue: amounts[0][1].ytd,
            currencyCode: amounts[0][0],
            noteText: 'Cumulative recoveries on executed write-offs.'
          };
        return {
          loading: false,
          empty: false,
          metricValue: amounts.length ? undefined : 0,
          metricText: amounts.length
            ? amounts.map(([code, total]) => code + ' ' + total.ytd.toLocaleString('en-UG', { maximumFractionDigits: 2 })).join(' / ')
            : undefined,
          noteText: 'Cumulative recoveries on executed write-offs.'
        };
      })
    );
  }

  private loadExpenseMetric(filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    return this.runReportPath('/pewosa/teller/expense-approvals', {}).pipe(
      map((response) => {
        const rows = this.operationRows(response).filter((row) => row.status === 'PENDING');
        if (filters.officeId != null && rows.some((row) => row.officeId == null)) {
          return {
            loading: false,
            empty: false,
            unavailable: true,
            noteKey: 'labels.superAdmin.Expense branch unavailable'
          };
        }
        const selected =
          filters.officeId == null ? rows : rows.filter((row) => Number(row.officeId) === filters.officeId);
        return {
          loading: false,
          empty: false,
          metricValue: selected.length,
          noteKey: 'labels.superAdmin.Expense scope'
        };
      })
    );
  }

  private operationRows(response: any): any[] {
    const rows = Array.isArray(response) ? response : response?.pageItems;
    if (!Array.isArray(rows)) throw new Error('Invalid operations response');
    return rows;
  }

  private loadOperations(widget: AnalyticsWidgetDefinition): Observable<AnalyticsWidgetState> {
    const source = widget.adapter.split('-')[0];
    const params: Record<string, string | number> =
      source === 'audits'
        ? { offset: 0, limit: 50, paged: 'true', orderBy: 'id', sortOrder: 'DESC' }
        : source === 'notifications'
          ? { isRead: 'false', limit: 50 }
          : {};
    return this.runReportPath('/' + source, params).pipe(
      map((response) => {
        const rows = this.operationRows(response);
        return {
          loading: false,
          empty: widget.type === 'list' && rows.length === 0,
          metricValue: rows.length,
          noteKey:
            source === 'audits' || source === 'notifications'
              ? 'labels.superAdmin.First fifty records'
              : 'labels.superAdmin.Institution records',
          rows: rows.slice(0, 5).map((item) =>
            source === 'jobs'
              ? {
                  title: item.displayName || item.name || String(item.jobId),
                  detailKey:
                    item.active === true
                      ? 'labels.superAdmin.Active'
                      : item.active === false
                        ? 'labels.superAdmin.Inactive'
                        : 'labels.superAdmin.Status unavailable'
                }
              : {
                  title: item.content || item.message || item.title || String(item.id),
                  detail: String(item.createdOn || item.createdAt || '')
                }
          )
        };
      }),
      catchError(() => of({ loading: false, empty: false, error: true }))
    );
  }

  private loadApprovalSummary(
    widget: AnalyticsWidgetDefinition,
    filters: AnalyticsFilters
  ): Observable<AnalyticsWidgetState> {
    return this.approvalPages(filters.officeId ?? undefined).pipe(
      map((result) => {
        const branches = new Map<number, { title: string; value: number }>();
        result.rows.forEach((item) => {
          const branch = branches.get(item.officeId) || { title: item.officeName || String(item.officeId), value: 0 };
          branch.value++;
          branches.set(item.officeId, branch);
        });
        return {
          loading: false,
          empty: widget.type === 'list' && !result.rows.length,
          metricValue: result.total,
          noteKey: result.partial
            ? 'labels.superAdmin.Partial workload'
            : filters.officeId == null
              ? 'labels.superAdmin.All branch approvals'
              : 'labels.superAdmin.Selected office approvals',
          rows: Array.from(branches.values())
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        };
      }),
      catchError(() => of({ loading: false, empty: false, error: true }))
    );
  }

  private approvalPages(
    officeId?: number,
    page = 0,
    accumulated: any[] = []
  ): Observable<{ rows: any[]; total: number; partial: boolean }> {
    const params: Record<string, string | number> = { page, size: 100 };
    if (officeId !== undefined) params['officeId'] = officeId;
    return this.runReportPath('/pewosa/loan-applications/approval-queue', params).pipe(
      switchMap((response) => {
        const batch = this.operationRows(response);
        const rows = accumulated.concat(batch);
        const total = Number(response.totalFilteredRecords);
        if (!Number.isFinite(total) || total < rows.length) throw new Error('Invalid approval count');
        if (rows.length < total && batch.length && page < 9) return this.approvalPages(officeId, page + 1, rows);
        return of({ rows, total, partial: rows.length < total });
      })
    );
  }

  private runReportPath(path: string, params: Record<string, string | number>): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params)
      .sort()
      .forEach((key) => {
        httpParams = httpParams.set(key, String(params[key]));
      });
    const key = this.authenticationService.getCredentials()?.userId + ':' + path + ':' + httpParams.toString();
    const cached = this.reportCache.get(key);
    if (cached) {
      log.info('Cache hit', { path, params });
      return cached;
    }
    const result = defer(() => {
      const started = Date.now();
      log.info('Request started', { path, params, timeoutMs: 30000 });
      return this.http
        .get<any>(path, { params: httpParams, context: new HttpContext().set(SUPPRESS_HTTP_ERROR_ALERT, true) })
        .pipe(
          timeout(30000),
          tap({
            next: (response) =>
              log.info('Response received', {
                path,
                elapsedMs: Date.now() - started,
                rows: Array.isArray(response)
                  ? response.length
                  : Array.isArray(response?.pageItems)
                    ? response.pageItems.length
                    : undefined,
                total: response?.totalFilteredRecords,
                shape: Array.isArray(response) ? 'array' : typeof response
              }),
            error: (error) =>
              log.error('Request failed', {
                path,
                elapsedMs: Date.now() - started,
                status: error?.status,
                type: error?.name
              })
          })
        );
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.reportCache.set(key, result);
    return result;
  }

  private extractAmountPair(response: any[], reportName: string): [
    number,
    number
  ] {
    const firstRow = response?.[0] || {};
    const numericEntries = Object.entries(firstRow)
      .map(
        ([
          key,
          value
        ]) => ({
          key: key.toLowerCase(),
          value: Number(value)
        })
      )
      .filter((entry) => !Number.isNaN(entry.value));

    // Match by report field names first so we do not depend on raw object value ordering
    const pendingValue = this.findValueByKeys(numericEntries, [
      'pending',
      'awaiting',
      'demand'
    ]);
    const completeValue = this.findValueByKeys(
      numericEntries,
      reportName === 'Demand Vs Collection' ? [
            'collection',
            'collected'
          ] : [
            'disburs',
            'disbursement',
            'disbursal'
          ]
    );

    if (pendingValue !== undefined && completeValue !== undefined) {
      return [
        pendingValue,
        completeValue
      ];
    }

    // Keep a small numeric fallback for unexpected report shapes.
    const values = numericEntries.map((entry) => entry.value).slice(0, 2);

    return [
      values[0] || 0,
      values[1] || 0
    ];
  }

  private findValueByKeys(entries: { key: string; value: number }[], keys: string[]): number | undefined {
    return entries.find((entry) => keys.some((key) => entry.key.includes(key)))?.value;
  }

  private getTrendReportName(timescale: AnalyticsTimescale, type: 'client' | 'loan'): string {
    const base = type === 'client' ? 'ClientTrendsBy' : 'LoanTrendsBy';
    return `${base}${timescale}`;
  }

  private resolveTrendLabel(entry: any, timescale: AnalyticsTimescale): string {
    switch (timescale) {
      case 'Day':
        return this.formatDayLabel(entry?.days);
      case 'Week':
        return `${entry?.Weeks ?? ''}`;
      case 'Month':
        return `${entry?.Months ?? ''}`;
      default:
        return '';
    }
  }

  private getTimescaleLabels(timescale: AnalyticsTimescale): string[] {
    const labels: string[] = [];
    const cursor = new Date();

    switch (timescale) {
      case 'Day':
        while (labels.length < 12) {
          cursor.setDate(cursor.getDate() - 1);
          labels.push(this.formatDayLabel(cursor));
        }
        break;
      case 'Week':
        while (labels.length < 12) {
          cursor.setDate(cursor.getDate() - 7);
          labels.push(`${this.getWeekNumber(cursor)}`);
        }
        break;
      case 'Month':
        while (labels.length < 12) {
          labels.push(cursor.toLocaleString(this.getActiveLocale(), { month: 'long' }));
          cursor.setMonth(cursor.getMonth() - 1);
        }
        break;
    }

    return labels.reverse();
  }

  private formatDayLabel(value: any): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return `${date.getDate()}/${date.getMonth() + 1}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    return Math.ceil(((date.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7);
  }

  private getActiveLocale(): string {
    // Reuse the active month labels to follow the selected translation locale
    return this.translateService.currentLang || this.translateService.defaultLang || 'en-US';
  }

  private getTimescaleKey(timescale: AnalyticsTimescale): string {
    switch (timescale) {
      case 'Day':
        return 'labels.buttons.Day';
      case 'Week':
        return 'labels.buttons.Week';
      case 'Month':
      default:
        return 'labels.buttons.Month';
    }
  }
}
