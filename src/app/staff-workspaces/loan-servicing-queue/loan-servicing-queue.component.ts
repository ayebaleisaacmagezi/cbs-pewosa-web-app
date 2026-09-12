/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Dates } from 'app/core/utils/dates';
import {
  LoanWorkQueueBucket,
  LoanWorkQueueItem,
  LoanWorkQueueQuery,
  LoanWorkQueueResponse
} from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-loan-servicing-queue',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    RouterModule,
    MatTableModule,
    MatPaginator,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatCheckboxModule,
    CurrencyPipe,
    DecimalPipe
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './loan-servicing-queue.component.html',
  styleUrls: [
    '../staff-workspace.scss',
    './loan-servicing-queue.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanServicingQueueComponent implements OnInit {
  private readonly servicingService = inject(PewosaLoanServicingService);
  private readonly authService = inject(AuthenticationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly dates = inject(Dates);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateService = inject(TranslateService);

  activeBucket: LoanWorkQueueBucket = 'PORTFOLIO';
  loading = false;
  denied = false;
  errorMessage: string | null = null;

  pageIndex = 0;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;
  readonly pageSizeOptions = [
    10,
    20,
    50,
    100
  ];

  queueItems: LoanWorkQueueItem[] = [];

  readonly displayedColumns: string[] = [
    'accountNo',
    'clientName',
    'productName',
    'principalDisbursed',
    'totalOutstanding',
    'nextPaymentDueDate',
    'nextPaymentAmount',
    'daysInArrears',
    'classification',
    'riskBand',
    'actions'
  ];

  filterForm = this.fb.group({
    assignedToMe: [false],
    classification: [''],
    riskBand: [''],
    dueFrom: [null as Date | null],
    dueTo: [null as Date | null],
    minOverdueDays: [''],
    maxOverdueDays: [''],
    officeId: [''],
    loanOfficerId: ['']
  });

  credentials = this.authService.getCredentials();
  hasServicingPermission = false;

  ngOnInit(): void {
    const permissions = this.credentials?.permissions || [];
    this.hasServicingPermission =
      permissions.includes('ALL_FUNCTIONS') ||
      permissions.includes('ALL_FUNCTIONS_READ') ||
      permissions.includes('READ_PEWOSALOANSERVICING');

    if (!this.hasServicingPermission) {
      this.denied = true;
      this.loading = false;
      this.errorMessage = this.translateService.instant(
        'Access denied: You lack the READ_PEWOSALOANSERVICING permission to view loan servicing queues.'
      );
      this.cdr.markForCheck();
      return;
    }

    this.loadQueue();
  }

  setBucket(bucket: LoanWorkQueueBucket): void {
    if (this.activeBucket === bucket) {
      return;
    }
    this.activeBucket = bucket;
    this.pageIndex = 0;
    this.loadQueue();
  }

  toggleAssignedToMe(checked: boolean): void {
    this.filterForm.patchValue({ assignedToMe: checked });
    if (checked && this.credentials?.staffId) {
      this.filterForm.patchValue({ loanOfficerId: this.credentials.staffId.toString() });
    } else if (!checked) {
      this.filterForm.patchValue({ loanOfficerId: '' });
    }
    this.applyFilters();
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.loadQueue();
  }

  resetFilters(): void {
    this.filterForm.reset({
      assignedToMe: false,
      classification: '',
      riskBand: '',
      dueFrom: null,
      dueTo: null,
      minOverdueDays: '',
      maxOverdueDays: '',
      officeId: '',
      loanOfficerId: ''
    });
    this.pageIndex = 0;
    this.loadQueue();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadQueue();
  }

  retry(): void {
    this.loadQueue();
  }

  loadQueue(): void {
    this.loading = true;
    this.errorMessage = null;
    this.denied = false;
    this.cdr.markForCheck();

    const query: LoanWorkQueueQuery = {
      bucket: this.activeBucket,
      page: this.pageIndex,
      size: this.pageSize
    };

    const formVal = this.filterForm.value;

    if (formVal.classification) {
      query.classification = formVal.classification;
    }
    if (formVal.riskBand) {
      query.riskBand = formVal.riskBand;
    }
    if (formVal.dueFrom) {
      query.dueFrom = this.formatDateParam(formVal.dueFrom);
    }
    if (formVal.dueTo) {
      query.dueTo = this.formatDateParam(formVal.dueTo);
    }
    if (formVal.officeId) {
      const officeNum = Number(formVal.officeId);
      if (!isNaN(officeNum) && officeNum > 0) {
        query.officeId = officeNum;
      }
    }
    if (formVal.assignedToMe && this.credentials?.staffId) {
      query.loanOfficerId = this.credentials.staffId;
    } else if (formVal.loanOfficerId) {
      const officerNum = Number(formVal.loanOfficerId);
      if (!isNaN(officerNum) && officerNum > 0) {
        query.loanOfficerId = officerNum;
      }
    }
    if (formVal.minOverdueDays) {
      const minDays = Number(formVal.minOverdueDays);
      if (!isNaN(minDays) && minDays >= 0) {
        query.minOverdueDays = minDays;
      }
    }
    if (formVal.maxOverdueDays) {
      const maxDays = Number(formVal.maxOverdueDays);
      if (!isNaN(maxDays) && maxDays >= 0) {
        query.maxOverdueDays = maxDays;
      }
    }

    this.servicingService
      .getWorkQueue(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: LoanWorkQueueResponse) => {
          this.queueItems = response?.content || [];
          this.totalElements = response?.totalElements || 0;
          this.totalPages = response?.totalPages || 0;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          if (error?.status === 403) {
            this.denied = true;
            this.errorMessage = this.translateService.instant(
              'Access denied: You do not have permission to view the loan servicing work queue.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant(
                'Failed to load loan servicing queue. Please check connectivity and retry.'
              );
          }
          this.queueItems = [];
          this.cdr.markForCheck();
        }
      });
  }

  private formatDateParam(date: Date | string): string {
    if (date instanceof Date) {
      return this.dates.getDate(date);
    }
    return String(date);
  }

  getClassificationBadgeClass(classification: string): string {
    switch (classification?.toUpperCase()) {
      case 'PERFORMING':
        return 'badge-performing';
      case 'WATCH':
        return 'badge-watch';
      case 'SUBSTANDARD':
        return 'badge-substandard';
      case 'DOUBTFUL':
        return 'badge-doubtful';
      case 'LOSS':
        return 'badge-loss';
      default:
        return 'badge-neutral';
    }
  }

  getRiskBadgeClass(riskBand?: string): string {
    switch (riskBand?.toUpperCase()) {
      case 'LOW':
        return 'badge-risk-low';
      case 'MEDIUM':
        return 'badge-risk-medium';
      case 'HIGH':
        return 'badge-risk-high';
      case 'VERY_HIGH':
        return 'badge-risk-very-high';
      default:
        return 'badge-neutral';
    }
  }
}
