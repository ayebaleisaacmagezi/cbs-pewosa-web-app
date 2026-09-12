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
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Dates } from 'app/core/utils/dates';
import {
  LoanServicingSummary,
  RestructuringDecisionResponse,
  RestructuringExecutionResponse,
  RestructuringProposal
} from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-loan-restructuring',
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
    MatRadioModule,
    MatIconModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './loan-restructuring.component.html',
  styleUrls: ['./loan-restructuring.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanRestructuringComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicingService = inject(PewosaLoanServicingService);
  private readonly authService = inject(AuthenticationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dates = inject(Dates);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateService = inject(TranslateService);

  loanId!: number;
  loading = false;
  submitting = false;
  denied = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  conflictError: string | null = null;

  summary: LoanServicingSummary | null = null;
  activeProposal: RestructuringProposal | null = null;
  executionResult: RestructuringExecutionResponse | null = null;

  canCreate = false;
  canApprove = false;
  canExecute = false;
  currentUserId: number | string | null = null;

  proposalForm!: FormGroup;
  decisionForm!: FormGroup;
  executionForm!: FormGroup;

  ngOnInit(): void {
    const parentParams = this.route.parent?.snapshot.params;
    const currentParams = this.route.snapshot.params;
    this.loanId = Number(parentParams?.['loanId'] || currentParams?.['loanId']);

    const credentials = this.authService.getCredentials();
    const permissions: string[] = credentials?.permissions || [];
    this.currentUserId = credentials?.userId || credentials?.staffId || null;

    const hasAll = permissions.includes('ALL_FUNCTIONS');
    this.canCreate = hasAll || permissions.includes('CREATE_PEWOSARESTRUCTURING');
    this.canApprove = hasAll || permissions.includes('APPROVE_PEWOSARESTRUCTURING');
    this.canExecute = hasAll || permissions.includes('EXECUTE_PEWOSARESTRUCTURING');

    if (!this.canCreate && !this.canApprove && !this.canExecute) {
      this.denied = true;
      this.errorMessage = this.translateService.instant(
        'Access denied: You lack permissions for loan restructuring workflows.'
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
    this.proposalForm = this.fb.group({
      reason: [
        '',
        Validators.required
      ],
      explanation: [''],
      rescheduleFromDate: [
        new Date(),
        Validators.required
      ],
      graceOnPrincipal: [
        null,
        [Validators.min(0)]
      ],
      graceOnInterest: [
        null,
        [Validators.min(0)]
      ],
      extraTerms: [
        null,
        [Validators.min(0)]
      ],
      newInterestRate: [
        null,
        [Validators.min(0)]
      ],
      evidenceDocumentIds: ['']
    });

    this.decisionForm = this.fb.group({
      decision: [
        'APPROVED',
        Validators.required
      ],
      comments: [
        '',
        Validators.required
      ]
    });

    this.executionForm = this.fb.group({
      executionDate: [
        new Date(),
        Validators.required
      ],
      rescheduleReasonId: [
        null,
        [
          Validators.required,
          Validators.min(1)
        ]
      ],
      idempotencyKey: [
        `REST-EXEC-${Date.now()}`,
        Validators.required
      ]
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
              'Access denied: You do not have permission to access loan details.'
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

  submitProposal(): void {
    if (this.proposalForm.invalid || !this.summary) {
      this.proposalForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;
    this.conflictError = null;
    this.cdr.markForCheck();

    const formVal = this.proposalForm.value;
    const rescheduleDate =
      formVal.rescheduleFromDate instanceof Date
        ? this.dates.formatDate(formVal.rescheduleFromDate, 'yyyy-MM-dd')
        : String(formVal.rescheduleFromDate);

    const docIds = formVal.evidenceDocumentIds
      ? String(formVal.evidenceDocumentIds)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const payload = {
      expectedLoanVersion: this.summary.loanVersion,
      reason: formVal.reason,
      explanation: formVal.explanation || undefined,
      rescheduleFromDate: rescheduleDate,
      graceOnPrincipal: formVal.graceOnPrincipal != null ? Number(formVal.graceOnPrincipal) : null,
      graceOnInterest: formVal.graceOnInterest != null ? Number(formVal.graceOnInterest) : null,
      extraTerms: formVal.extraTerms != null ? Number(formVal.extraTerms) : null,
      newInterestRate: formVal.newInterestRate != null ? Number(formVal.newInterestRate) : null,
      evidenceDocumentIds: docIds
    };

    this.servicingService
      .submitRestructuringProposal(this.loanId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (proposal) => {
          this.activeProposal = proposal;
          this.submitting = false;
          this.successMessage = this.translateService.instant('Restructuring proposal submitted successfully.');
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.submitting = false;
          if (error?.status === 409) {
            this.conflictError = this.translateService.instant(
              'Optimistic lock conflict: Loan version has changed. Please refresh and retry.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant('Failed to submit restructuring proposal.');
          }
          this.cdr.markForCheck();
        }
      });
  }

  submitDecision(): void {
    if (this.decisionForm.invalid || !this.activeProposal) {
      this.decisionForm.markAllAsTouched();
      return;
    }

    if (this.isAuthorDeciding()) {
      this.errorMessage = this.translateService.instant(
        'Maker-checker violation: You cannot decide a proposal that you submitted.'
      );
      this.cdr.markForCheck();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;
    this.conflictError = null;
    this.cdr.markForCheck();

    const formVal = this.decisionForm.value;
    const payload = {
      expectedProposalVersion: this.activeProposal.version,
      decision: formVal.decision as 'APPROVED' | 'REJECTED',
      comments: formVal.comments
    };

    this.servicingService
      .recordProposalDecision(this.loanId, this.activeProposal.proposalId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: RestructuringDecisionResponse) => {
          if (this.activeProposal) {
            this.activeProposal.status = res.decision as any;
            this.activeProposal.version = res.version;
          }
          this.submitting = false;
          this.successMessage = this.translateService.instant('Proposal decision recorded: ' + res.decision);
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.submitting = false;
          if (error?.status === 409) {
            this.conflictError = this.translateService.instant(
              'Proposal version conflict: The proposal has been modified by another user.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant('Failed to record proposal decision.');
          }
          this.cdr.markForCheck();
        }
      });
  }

  executeProposal(): void {
    if (this.executionForm.invalid || !this.activeProposal || !this.summary) {
      this.executionForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;
    this.conflictError = null;
    this.cdr.markForCheck();

    const formVal = this.executionForm.value;
    const execDate =
      formVal.executionDate instanceof Date
        ? this.dates.formatDate(formVal.executionDate, 'yyyy-MM-dd')
        : String(formVal.executionDate);

    const payload = {
      expectedProposalVersion: this.activeProposal.version,
      expectedLoanVersion: this.summary.loanVersion,
      rescheduleReasonId: Number(formVal.rescheduleReasonId),
      idempotencyKey: formVal.idempotencyKey,
      executionDate: execDate
    };

    this.servicingService
      .executeRestructuringProposal(this.loanId, this.activeProposal.proposalId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: RestructuringExecutionResponse) => {
          this.executionResult = res;
          if (this.activeProposal) {
            this.activeProposal.status = 'EXECUTED';
          }
          this.submitting = false;
          this.successMessage = this.translateService.instant(
            'Restructuring executed successfully through native Fineract schedule services.'
          );
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.submitting = false;
          if (error?.status === 409) {
            this.conflictError = this.translateService.instant(
              'Execution conflict: Loan version or proposal version is stale. Refresh to obtain latest state.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant('Failed to execute restructuring proposal.');
          }
          this.cdr.markForCheck();
        }
      });
  }

  isAuthorDeciding(): boolean {
    if (!this.activeProposal || !this.currentUserId) {
      return false;
    }
    return String(this.activeProposal.submittedBy) === String(this.currentUserId);
  }
}
