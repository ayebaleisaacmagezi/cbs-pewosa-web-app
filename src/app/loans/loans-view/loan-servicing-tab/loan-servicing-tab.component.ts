/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import {
  LoanServicingSummary,
  LoanServicingTimelineEvent,
  LoanServicingTimelineResponse
} from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-loan-servicing-tab',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatPaginator,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe
  ],
  templateUrl: './loan-servicing-tab.component.html',
  styleUrls: ['./loan-servicing-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanServicingTabComponent implements OnInit {
  private readonly servicingService = inject(PewosaLoanServicingService);
  private readonly authService = inject(AuthenticationService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateService = inject(TranslateService);

  loanId!: number;
  loading = false;
  denied = false;
  errorMessage: string | null = null;

  summary: LoanServicingSummary | null = null;
  timelineEvents: LoanServicingTimelineEvent[] = [];
  totalTimelineElements = 0;
  pageIndex = 0;
  pageSize = 50;

  hasReadPermission = false;
  canRestructure = false;
  canWriteOff = false;
  canReleaseSecurity = false;
  canClose = false;

  readonly displayedColumns: string[] = [
    'eventDate',
    'eventType',
    'amount',
    'principalPortion',
    'interestPortion',
    'feePortion',
    'penaltyPortion',
    'outstandingBalanceAfter',
    'referenceNumber',
    'description',
    'createdByName'
  ];

  ngOnInit(): void {
    const parentParams = this.route.parent?.snapshot.params;
    const currentParams = this.route.snapshot.params;
    this.loanId = Number(parentParams?.['loanId'] || currentParams?.['loanId']);

    const credentials = this.authService.getCredentials();
    const permissions: string[] = credentials?.permissions || [];

    this.hasReadPermission =
      permissions.includes('ALL_FUNCTIONS') ||
      permissions.includes('ALL_FUNCTIONS_READ') ||
      permissions.includes('READ_PEWOSALOANSERVICING');

    this.canRestructure =
      permissions.includes('ALL_FUNCTIONS') || permissions.includes('CREATE_PEWOSARESTRUCTURING');
    this.canWriteOff =
      permissions.includes('ALL_FUNCTIONS') || permissions.includes('CREATE_PEWOSAWRITEOFF');
    this.canReleaseSecurity =
      permissions.includes('ALL_FUNCTIONS') || permissions.includes('RELEASE_PEWOSASECURITY');
    this.canClose =
      permissions.includes('ALL_FUNCTIONS') || permissions.includes('CLOSE_PEWOSALOAN');

    if (!this.hasReadPermission) {
      this.denied = true;
      this.errorMessage = this.translateService.instant(
        'Access denied: You lack the READ_PEWOSALOANSERVICING permission to view loan servicing details.'
      );
      this.cdr.markForCheck();
      return;
    }

    if (this.loanId) {
      this.loadServicingData();
    }
  }

  loadServicingData(): void {
    this.loading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    forkJoin({
      summary: this.servicingService.getLoanServicingSummary(this.loanId),
      timeline: this.servicingService.getLoanServicingTimeline(this.loanId, this.pageIndex, this.pageSize)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ summary, timeline }) => {
          this.summary = summary;
          this.timelineEvents = timeline?.events || [];
          this.totalTimelineElements = timeline?.totalElements || 0;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.loading = false;
          if (error?.status === 403) {
            this.denied = true;
            this.errorMessage = this.translateService.instant(
              'Access denied: You do not have permission to view loan servicing details.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant(
                'Failed to load loan servicing details. Please check connectivity and retry.'
              );
          }
          this.cdr.markForCheck();
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTimelineOnly();
  }

  private loadTimelineOnly(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.servicingService
      .getLoanServicingTimeline(this.loanId, this.pageIndex, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (timeline: LoanServicingTimelineResponse) => {
          this.timelineEvents = timeline?.events || [];
          this.totalTimelineElements = timeline?.totalElements || 0;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.loading = false;
          this.errorMessage =
            error?.error?.defaultUserMessage ||
            error?.message ||
            this.translateService.instant('Failed to load servicing timeline.');
          this.cdr.markForCheck();
        }
      });
  }
}
