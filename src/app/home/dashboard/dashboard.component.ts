/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Logger } from 'app/core/logger/logger.service';
const log = new Logger('Dashboard route');
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { DashboardEngineComponent } from 'app/analytics/dashboard-engine/dashboard-engine.component';
import { GLOBAL_ANALYTICS_DASHBOARD } from 'app/analytics/global-dashboard.config';

/**
 * Dashboard component.
 */
@Component({
  selector: 'mifosx-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [...STANDALONE_SHARED_IMPORTS, DashboardEngineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  /** Dashboard definition */
  dashboardDefinition = GLOBAL_ANALYTICS_DASHBOARD;
  /** Office options from resolver */
  offices: any[] = [];

  constructor() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data: { offices: any[] }) => {
      this.offices = data.offices || [];
      log.info('Route data ready', { offices: this.offices.length });
    });
  }

  ngOnInit() {
    log.info('Dashboard page initialized');
  }
}
