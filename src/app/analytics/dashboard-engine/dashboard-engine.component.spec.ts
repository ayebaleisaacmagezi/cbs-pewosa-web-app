/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectorRef } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { AnalyticsDataSourceService } from '../services/analytics-data-source.service';
import { AnalyticsVisibilityService } from '../services/analytics-visibility.service';
import { AnalyticsWidgetState } from '../models/analytics-dashboard.model';
import { DashboardEngineComponent } from './dashboard-engine.component';

describe('Dashboard loading', () => {
  it('updates completed cards and OnPush rendering while another request is still pending', () => {
    const fast = new Subject<AnalyticsWidgetState>();
    const slow = new Subject<AnalyticsWidgetState>();
    const markForCheck = jest.fn();
    const component = new DashboardEngineComponent(
      { markForCheck } as unknown as ChangeDetectorRef,
      new UntypedFormBuilder(),
      { getCredentials: () => ({ permissions: ['ALL_FUNCTIONS'], officeId: 1 }) } as unknown as AuthenticationService,
      {
        loadWidget: (widget: { id: string }) => (widget.id === 'fast' ? fast : slow)
      } as unknown as AnalyticsDataSourceService,
      { canView: () => true } as unknown as AnalyticsVisibilityService
    );
    component.dashboard = {
      id: 'test',
      titleKey: 'test',
      widgets: [
        { id: 'fast', titleKey: 'fast', type: 'metric', layout: 'metric', adapter: 'jobs-count', icon: 'tasks' },
        { id: 'slow', titleKey: 'slow', type: 'metric', layout: 'metric', adapter: 'users-count', icon: 'users' }
      ]
    };
    component.ngOnInit();
    markForCheck.mockClear();
    fast.next({ loading: false, empty: false, metricValue: 3 });
    fast.complete();
    expect(component.widgetStateMap['fast'].metricValue).toBe(3);
    expect(component.widgetStateMap['slow'].loading).toBe(true);
    expect(markForCheck).toHaveBeenCalled();
    component.ngOnDestroy();
    slow.next({ loading: false, empty: false, metricValue: 4 });
    expect(component.widgetStateMap['slow'].loading).toBe(true);
  });
});
