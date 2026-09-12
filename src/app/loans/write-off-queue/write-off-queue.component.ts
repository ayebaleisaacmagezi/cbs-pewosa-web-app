/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LoanWriteOffQueueItem, LoanWriteOffReport } from '../pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from '../pewosa-loan-servicing.service';

@Component({
  selector: 'mifosx-write-off-queue',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatProgressBarModule, MatSelectModule, MatTableModule],
  templateUrl: './write-off-queue.component.html',
  styleUrls: ['./write-off-queue.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WriteOffQueueComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PewosaLoanServicingService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateService = inject(TranslateService);

  readonly statuses = ['SUBMITTED', 'COMMITTEE_RECOMMENDED', 'BOARD_APPROVED', 'REJECTED', 'EXECUTED'];
  readonly displayedColumns = ['accountNo', 'clientName', 'officeName', 'amount', 'reason', 'requestedOn', 'action'];
  readonly filters = this.fb.group({
    status: ['SUBMITTED'],
    fromDate: [new Date(new Date().getFullYear(), 0, 1).toISOString().substring(0, 10)],
    toDate: [new Date().toISOString().substring(0, 10)]
  });
  rows: LoanWriteOffQueueItem[] = [];
  report: LoanWriteOffReport | null = null;
  loading = false;
  errorMessage: string | null = null;

  ngOnInit(): void { this.loadQueue(); }

  loadQueue(): void {
    this.loading = true;
    this.errorMessage = null;
    this.service.getWriteOffQueue(this.filters.value.status || 'SUBMITTED').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => { this.rows = response.content; this.loading = false; this.cdr.markForCheck(); },
      error: (error) => { this.errorMessage = error.error?.defaultUserMessage || this.translateService.instant('Failed to load write-off queue.'); this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = null;
    this.service.getWriteOffReport(this.filters.value.fromDate || '', this.filters.value.toDate || '').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => { this.report = response; this.loading = false; this.cdr.markForCheck(); },
      error: (error) => { this.errorMessage = error.error?.defaultUserMessage || this.translateService.instant('Failed to load write-off report.'); this.loading = false; this.cdr.markForCheck(); }
    });
  }

  downloadReport(): void {
    if (!this.report) return;
    const blob = new Blob([JSON.stringify(this.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `write-off-register-${this.report.fromDate}-${this.report.toDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
