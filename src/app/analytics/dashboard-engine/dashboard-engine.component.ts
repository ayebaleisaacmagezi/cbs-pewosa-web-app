/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* eslint-disable @angular-eslint/prefer-inject */
/** Angular Imports */
import {
  ChangeDetectionStrategy,
  Component,
  ChangeDetectorRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Subscription, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { SUPER_ADMIN_DASHBOARD_AREAS } from '../super-admin-dashboard.config';
import { Logger } from 'app/core/logger/logger.service';

const log = new Logger('Dashboard');
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
/** Custom Services */
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { AnalyticsDataSourceService } from '../services/analytics-data-source.service';
import { AnalyticsVisibilityService } from '../services/analytics-visibility.service';
/** Custom Models */
import {
  AnalyticsDashboardDefinition,
  AnalyticsFilters,
  AnalyticsWidgetDefinition,
  AnalyticsWidgetState
} from '../models/analytics-dashboard.model';
/** Custom Imports */
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { DashboardWidgetComponent } from '../dashboard-widget/dashboard-widget.component';

@Component({
  selector: 'mifosx-analytics-dashboard',
  standalone: true,
  templateUrl: './dashboard-engine.component.html',
  styleUrls: ['./dashboard-engine.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatButtonToggleGroup,
    MatButtonToggle,
    DashboardWidgetComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardEngineComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) dashboard!: AnalyticsDashboardDefinition;
  @Input() offices: any[] = [];

  filtersForm!: UntypedFormGroup;
  visibleWidgets: AnalyticsWidgetDefinition[] = [];
  activeArea = 'all';
  dashboardAreas = SUPER_ADMIN_DASHBOARD_AREAS;
  lastChecked?: Date;

  widgetStateMap: Record<string, AnalyticsWidgetState> = {};

  private filtersSubscription?: Subscription;
  private loadSubscription?: Subscription;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private formBuilder: UntypedFormBuilder,
    private authenticationService: AuthenticationService,
    private analyticsDataSourceService: AnalyticsDataSourceService,
    private analyticsVisibilityService: AnalyticsVisibilityService
  ) {}
  get areaTitleKey(): string {
    return (
      this.dashboardAreas.find((area) => area.id === this.activeArea)?.titleKey ||
      'labels.superAdmin.Institution at a glance'
    );
  }
  get activeWidgets(): AnalyticsWidgetDefinition[] {
    if (!this.isSuperAdmin) return this.visibleWidgets;
    if (this.activeArea === 'all') return this.visibleWidgets;
    return this.visibleWidgets.filter(
      (widget) => (widget.area || (widget.section ? 'system' : 'reports')) === this.activeArea
    );
  }
  widgetsForArea(area: string, type: AnalyticsWidgetDefinition['type']): AnalyticsWidgetDefinition[] {
    return this.visibleWidgets.filter(
      (widget) => widget.type === type && (widget.area || (widget.section ? 'system' : 'reports')) === area
    );
  }
  selectArea(area: string): void {
    this.activeArea = area;
    this.reloadDashboard();
  }

  get metricWidgets(): AnalyticsWidgetDefinition[] {
    return this.activeWidgets.filter((widget) => widget.type === 'metric' && (this.isSuperAdmin || !widget.section));
  }

  get chartWidgets(): AnalyticsWidgetDefinition[] {
    return this.activeWidgets.filter((widget) => widget.type === 'chart');
  }

  get isSuperAdmin(): boolean {
    return !!this.authenticationService.getCredentials()?.permissions?.includes('ALL_FUNCTIONS');
  }

  get operationMetrics(): AnalyticsWidgetDefinition[] {
    return this.isSuperAdmin
      ? []
      : this.visibleWidgets.filter((widget) => widget.type === 'metric' && widget.section === 'operations');
  }
  get operationLists(): AnalyticsWidgetDefinition[] {
    return this.activeWidgets.filter((widget) => widget.type === 'list');
  }

  ngOnInit(): void {
    this.updateVisibleWidgets();
    log.info('Engine initialized', {
      dashboard: this.dashboard?.id,
      offices: this.offices.length,
      superAdmin: this.isSuperAdmin,
      widgets: this.visibleWidgets.map((widget) => widget.id)
    });

    this.filtersForm = this.formBuilder.group({
      officeId: [this.isSuperAdmin ? null : this.resolveDefaultOfficeId()],
      timescale: ['Month']
    });

    this.filtersSubscription = this.filtersForm.valueChanges.subscribe(() => {
      this.reloadDashboard();
    });

    this.reloadDashboard();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dashboard']) {
      this.updateVisibleWidgets();
      if (this.filtersForm) {
        this.reloadDashboard();
      }
    }
    if (
      changes['offices'] &&
      this.filtersForm &&
      !(this.isSuperAdmin && this.filtersForm.value.officeId === null) &&
      !this.offices.some((office) => office.id === this.filtersForm.value.officeId)
    ) {
      this.filtersForm.patchValue(
        {
          officeId: this.resolveDefaultOfficeId()
        },
        { emitEvent: false }
      );
      this.reloadDashboard();
    }
  }
  ngOnDestroy(): void {
    log.info('Engine destroyed; cancelling widget subscriptions');
    if (this.filtersSubscription) {
      this.filtersSubscription.unsubscribe();
    }

    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }
  }

  reloadDashboard(forceRefresh: boolean = false): void {
    if (!this.visibleWidgets.length) {
      log.warn('No visible widgets; check dashboard permissions');
      return;
    }

    if (forceRefresh) {
      this.analyticsDataSourceService.clearCache();
    }

    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }

    const filters = this.filtersForm.getRawValue() as AnalyticsFilters;
    const widgets = this.activeWidgets;
    this.lastChecked = undefined;
    const started = Date.now();
    log.info('Reload started', { filters, forceRefresh, widgets: widgets.length });
    this.widgetStateMap = widgets.reduce(
      (accumulator, widget) => ({
        ...accumulator,
        [widget.id]: {
          loading: true,
          empty: false
        }
      }),
      {}
    );

    this.changeDetector.markForCheck();
    this.loadSubscription = merge(
      ...widgets.map((widget) =>
        this.analyticsDataSourceService.loadWidget(widget, filters).pipe(
          map((state) => ({
            widgetId: widget.id,
            state
          }))
        )
      )
    ).subscribe({
      next: (result) => {
        this.widgetStateMap = { ...this.widgetStateMap, [result.widgetId]: result.state };
        log.info('Widget rendered', {
          widget: result.widgetId,
          error: !!result.state.error,
          empty: result.state.empty,
          elapsedMs: Date.now() - started
        });
        this.changeDetector.markForCheck();
      },
      error: (error) => {
        log.error('Dashboard stream failed', { status: error?.status, type: error?.name });
        this.widgetStateMap = Object.fromEntries(
          Object.entries(this.widgetStateMap).map(
            ([
              id,
              state
            ]) => [
              id,
              state.loading ? { loading: false, empty: false, error: true } : state
            ]
          )
        );
        this.changeDetector.markForCheck();
      },
      complete: () => {
        this.lastChecked = new Date();
        this.changeDetector.markForCheck();
        log.info('Reload complete', { elapsedMs: Date.now() - started });
      }
    });
  }

  private resolveDefaultOfficeId(): number | null {
    const credentials = this.authenticationService.getCredentials();
    const currentOfficeId = credentials?.officeId;

    if (currentOfficeId && this.offices.some((office) => office.id === currentOfficeId)) {
      return currentOfficeId;
    }

    return this.offices[0]?.id ?? null;
  }
  private updateVisibleWidgets(): void {
    this.visibleWidgets = (this.dashboard?.widgets || []).filter((widget) =>
      this.analyticsVisibilityService.canView(widget.visibleTo)
    );
  }
}
