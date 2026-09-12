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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Dates } from 'app/core/utils/dates';
import {
  LoanRecoveryRequest,
  LoanRecoveryResponse,
  LoanServicingSummary,
  LoanWriteOffRequest,
  LoanWriteOffResponse
} from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-loan-write-off',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    ReactiveFormsModule,
    FaIconComponent,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './loan-write-off.component.html',
  styleUrls: ['./loan-write-off.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanWriteOffComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicingService = inject(PewosaLoanServicingService);
  private readonly authService = inject(AuthenticationService);
  private readonly route = inject(ActivatedRoute);
  private readonly dates = inject(Dates);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateService = inject(TranslateService);

  loanId!: number;
  loading = false;
  submitting = false;
  denied = false;
  errorMessage: string | null = null;
  conflictError: string | null = null;
  successMessage: string | null = null;

  summary: LoanServicingSummary | null = null;
  writeOffResult: LoanWriteOffResponse | null = null;
  recoveryResult: LoanRecoveryResponse | null = null;

  canWriteOff = false;
  canRecover = false;

  writeOffForm!: FormGroup;
  recoveryForm!: FormGroup;

  ngOnInit(): void {
    const parentParams = this.route.parent?.snapshot.params;
    const currentParams = this.route.snapshot.params;
    this.loanId = Number(parentParams?.['loanId'] || currentParams?.['loanId']);

    const credentials = this.authService.getCredentials();
    const permissions: string[] = credentials?.permissions || [];
    const hasAll = permissions.includes('ALL_FUNCTIONS');

    this.canWriteOff = hasAll || permissions.includes('CREATE_PEWOSAWRITEOFF');
    this.canRecover = hasAll || permissions.includes('CREATE_PEWOSARECOVERY');

    if (!this.canWriteOff && !this.canRecover) {
      this.denied = true;
      this.errorMessage = this.translateService.instant(
        'Access denied: You lack permissions for write-off and recovery operations.'
      );
      this.cdr.markForCheck();
      return;
    }

    this.initForms();
    if (this.loanId) {
      this.loadSummary();
    }
  }

  private initForms(): void {
    this.writeOffForm = this.fb.group({
      transactionDate: [new Date(), Validators.required],
      reason: ['', Validators.required],
      governanceReference: ['', Validators.required],
      explanation: ['', Validators.required],
      evidenceDocumentIds: [''],
      idempotencyKey: [`WRITEOFF-${Date.now()}`, Validators.required]
    });

    this.recoveryForm = this.fb.group({
      transactionDate: [new Date(), Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      paymentTypeId: [null],
      receiptNumber: [''],
      notes: [''],
      idempotencyKey: [`REC-${Date.now()}`, Validators.required]
    });
  }

  loadSummary(): void {
    this.loading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.servicingService
      .getLoanServicingSummary(this.loanId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.loading = false;
          if (error?.status === 403) {
            this.denied = true;
            this.errorMessage = this.translateService.instant(
              'Access denied: You lack permission to view this loan.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant('Failed to load loan summary.');
          }
          this.cdr.markForCheck();
        }
      });
  }

  submitWriteOff(): void {
    if (this.writeOffForm.invalid || !this.summary) {
      this.writeOffForm.markAllAsTouched();
      return;
    }

    if (this.summary.totalOutstanding <= 0) {
      this.errorMessage = this.translateService.instant(
        'Write-off requires a positive outstanding balance (totalOutstanding > 0.00).'
      );
      this.cdr.markForCheck();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;
    this.conflictError = null;
    this.cdr.markForCheck();

    const formVal = this.writeOffForm.value;
    const txDate = formVal.transactionDate instanceof Date
      ? this.dates.formatDate(formVal.transactionDate, 'yyyy-MM-dd')
      : String(formVal.transactionDate);

    const docIds = formVal.evidenceDocumentIds
      ? String(formVal.evidenceDocumentIds)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const payload: LoanWriteOffRequest = {
      expectedLoanVersion: this.summary.loanVersion,
      idempotencyKey: formVal.idempotencyKey,
      transactionDate: txDate,
      reason: formVal.reason,
      governanceReference: formVal.governanceReference,
      explanation: formVal.explanation,
      evidenceDocumentIds: docIds
    };

    this.servicingService
      .executeWriteOff(this.loanId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: LoanWriteOffResponse) => {
          this.writeOffResult = res;
          if (this.summary) {
            this.summary.loanStatus = 'WRITTEN_OFF';
          }
          this.submitting = false;
          this.successMessage = this.translateService.instant(
            'Loan successfully written off in native ledger.'
          );
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.submitting = false;
          if (error?.status === 409) {
            this.conflictError = this.translateService.instant(
              'Concurrency conflict: Loan version has changed. Please refresh state before writing off.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant('Failed to execute write-off.');
          }
          this.cdr.markForCheck();
        }
      });
  }

  submitRecovery(): void {
    if (this.recoveryForm.invalid || !this.summary) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;
    this.conflictError = null;
    this.cdr.markForCheck();

    const formVal = this.recoveryForm.value;
    const txDate = formVal.transactionDate instanceof Date
      ? this.dates.formatDate(formVal.transactionDate, 'yyyy-MM-dd')
      : String(formVal.transactionDate);

    const payload: LoanRecoveryRequest = {
      expectedLoanVersion: this.summary.loanVersion,
      idempotencyKey: formVal.idempotencyKey,
      transactionDate: txDate,
      amount: Number(formVal.amount),
      paymentTypeId: formVal.paymentTypeId ? Number(formVal.paymentTypeId) : undefined,
      receiptNumber: formVal.receiptNumber || undefined,
      notes: formVal.notes || undefined
    };

    this.servicingService
      .recordRecovery(this.loanId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: LoanRecoveryResponse) => {
          this.recoveryResult = res;
          this.submitting = false;
          this.successMessage = this.translateService.instant(
            'Off-balance sheet recovery payment recorded successfully.'
          );
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.submitting = false;
          if (error?.status === 409) {
            this.conflictError = this.translateService.instant(
              'Concurrency conflict: Loan version has changed. Refresh to load authoritative state.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant('Failed to record recovery payment.');
          }
          this.cdr.markForCheck();
        }
      });
  }
}
