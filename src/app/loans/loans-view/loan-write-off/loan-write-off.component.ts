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
  LoanDocumentSnapshot,
  LoanWriteOffDecisionRequest,
  LoanWriteOffRequest,
  LoanWriteOffResponse,
  LoanWriteOffSubmissionRequest,
  LoanWriteOffWorkflow
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
  writeOffWorkflow: LoanWriteOffWorkflow | null = null;
  issuedDocument: LoanDocumentSnapshot | null = null;
  issuedDocumentJson = '';
  recoveryResult: LoanRecoveryResponse | null = null;

  canRequestWriteOff = false;
  canCommitteeReview = false;
  canBoardReview = false;
  canExecuteWriteOff = false;
  canIssueDocuments = false;
  canRecover = false;

  writeOffForm!: FormGroup;
  recoveryForm!: FormGroup;
  decisionForm!: FormGroup;

  ngOnInit(): void {
    const parentParams = this.route.parent?.snapshot.params;
    const currentParams = this.route.snapshot.params;
    this.loanId = Number(parentParams?.['loanId'] || currentParams?.['loanId']);

    const credentials = this.authService.getCredentials();
    const permissions: string[] = credentials?.permissions || [];
    const hasAll = permissions.includes('ALL_FUNCTIONS');

    this.canRequestWriteOff = hasAll || permissions.includes('CREATE_PEWOSAWRITEOFF');
    this.canCommitteeReview = hasAll || permissions.includes('APPROVE_PEWOSAWRITEOFF_COMMITTEE');
    this.canBoardReview = hasAll || permissions.includes('APPROVE_PEWOSAWRITEOFF_BOARD');
    this.canExecuteWriteOff = this.canBoardReview;
    this.canIssueDocuments = hasAll || permissions.includes('CREATE_PEWOSALOANDOCUMENT');
    this.canRecover = hasAll || permissions.includes('CREATE_PEWOSARECOVERY');

    if (!this.canRequestWriteOff && !this.canCommitteeReview && !this.canBoardReview && !this.canRecover && !this.canIssueDocuments) {
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
      reason: ['', Validators.required],
      recoveryEfforts: ['', Validators.required],
      legalAction: [''],
      guarantorClaims: [''],
      collateralLiquidation: [''],
      evidenceDocumentIds: ['', Validators.required]
    });

    this.decisionForm = this.fb.group({ comments: ['', Validators.required] });

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
          this.loadWriteOffWorkflow();
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

  private loadWriteOffWorkflow(): void {
    this.servicingService
      .getCurrentWriteOffRequest(this.loanId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (workflow) => {
          this.writeOffWorkflow = workflow.exists === false ? null : workflow;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.loading = false;
          this.errorMessage = error?.error?.defaultUserMessage || this.translateService.instant('Failed to load write-off workflow.');
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
    const docIds = formVal.evidenceDocumentIds
      ? String(formVal.evidenceDocumentIds)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];

    const payload: LoanWriteOffSubmissionRequest = {
      expectedLoanVersion: this.summary.loanVersion,
      reason: formVal.reason,
      recoveryEfforts: formVal.recoveryEfforts,
      legalAction: formVal.legalAction || undefined,
      guarantorClaims: formVal.guarantorClaims || undefined,
      collateralLiquidation: formVal.collateralLiquidation || undefined,
      evidenceDocumentIds: docIds
    };

    this.servicingService
      .submitWriteOffRequest(this.loanId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (workflow) => {
          this.writeOffWorkflow = workflow;
          this.submitting = false;
          this.successMessage = this.translateService.instant('Write-off request submitted for Credit Committee review.');
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
              this.translateService.instant('Failed to submit write-off request.');
          }
          this.cdr.markForCheck();
        }
      });
  }

  recordDecision(level: 'COMMITTEE' | 'BOARD', decision: 'APPROVED' | 'REJECTED'): void {
    if (!this.writeOffWorkflow || this.decisionForm.invalid) {
      this.decisionForm.markAllAsTouched();
      return;
    }
    const payload: LoanWriteOffDecisionRequest = {
      expectedVersion: this.writeOffWorkflow.version,
      decision,
      comments: this.decisionForm.value.comments
    };
    this.submitting = true;
    this.servicingService
      .recordWriteOffDecision(this.loanId, this.writeOffWorkflow.id, level, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (workflow) => {
          this.writeOffWorkflow = workflow;
          this.submitting = false;
          this.successMessage = this.translateService.instant('Write-off decision recorded.');
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.submitting = false;
          this.errorMessage = error?.error?.defaultUserMessage || this.translateService.instant('Failed to record decision.');
          this.cdr.markForCheck();
        }
      });
  }

  executeApprovedWriteOff(): void {
    if (!this.writeOffWorkflow) return;
    const payload: LoanWriteOffRequest = {
      writeOffRequestId: this.writeOffWorkflow.id,
      expectedRequestVersion: this.writeOffWorkflow.version,
      idempotencyKey: `WRITEOFF-${this.writeOffWorkflow.id}`,
      reason: this.writeOffWorkflow.reason
    };
    this.submitting = true;
    this.servicingService
      .executeWriteOff(this.loanId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.writeOffResult = {
            ...result,
            nativeTransactionId: result.nativeTransactionId || result.resourceId,
            totalWrittenOff: this.summary?.totalOutstanding,
            writtenOffPrincipal: this.summary?.principalOutstanding,
            writtenOffInterest: this.summary?.interestOutstanding,
            writtenOffFee: this.summary?.feeChargesOutstanding,
            writtenOffPenalty: this.summary?.penaltyChargesOutstanding
          };
          this.submitting = false;
          this.successMessage = this.translateService.instant('Board-approved write-off posted to the native ledger.');
          this.loadSummary();
        },
        error: (error: any) => {
          this.submitting = false;
          this.errorMessage = error?.error?.defaultUserMessage || this.translateService.instant('Failed to execute write-off.');
          this.cdr.markForCheck();
        }
      });
  }

  issueDocument(documentType: string): void {
    this.submitting = true;
    this.servicingService
      .issueLoanDocument(this.loanId, documentType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (document) => {
          this.issuedDocument = document;
          this.issuedDocumentJson = JSON.stringify(document, null, 2);
          this.submitting = false;
          this.successMessage = this.translateService.instant('Loan document generated from authoritative data.');
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.submitting = false;
          this.errorMessage = error?.error?.defaultUserMessage || this.translateService.instant('Failed to generate document.');
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
      transactionAmount: Number(formVal.amount),
      paymentTypeId: formVal.paymentTypeId ? Number(formVal.paymentTypeId) : undefined,
      receiptNumber: formVal.receiptNumber || undefined,
      notes: formVal.notes || undefined
    };

    this.servicingService
      .recordRecovery(this.loanId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: LoanRecoveryResponse) => {
          this.recoveryResult = {
            ...res,
            recoveryTransactionId: res.recoveryTransactionId || res.resourceId,
            amount: formVal.amount,
            transactionDate: txDate,
            receiptNumber: formVal.receiptNumber || undefined
          };
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

  printIssuedDocument(): void {
    window.print();
  }
}
