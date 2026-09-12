/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import {
  LoanApprovalCase,
  LoanApprovalDecision,
  LoanApprovalDecisionRecord
} from '../../pewosa-loan-application.models';
import { PewosaLoanApplicationService } from '../../pewosa-loan-application.service';

@Component({
  selector: 'mifosx-loan-approval-tab',
  standalone: true,
  imports: [...STANDALONE_SHARED_IMPORTS],
  templateUrl: './loan-approval-tab.component.html',
  styleUrls: ['./loan-approval-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanApprovalTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly loanApplicationService = inject(PewosaLoanApplicationService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly loanId = Number(this.route.parent?.snapshot.params['loanId']);
  approvalCase: LoanApprovalCase | null = null;
  loading = false;
  saving = false;
  message = '';
  messageType: 'success' | 'error' | '' = '';

  readonly decisionForm = this.formBuilder.group({
    decision: this.formBuilder.control<LoanApprovalDecision | null>(null, Validators.required),
    comments: [
      '',
      [
        Validators.required,
        Validators.maxLength(4000)
      ]
    ],
    conditions: [''],
    conditionEvidence: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  createRoute(): void {
    if (this.saving) {
      return;
    }
    this.saving = true;
    this.loanApplicationService
      .createApprovalCase(this.loanId)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (approvalCase) => this.updateCase(approvalCase, 'Loan routed to the required independent authority.'),
        error: () =>
          this.showMessage('The approval route could not be created. Complete all approval checks first.', 'error')
      });
  }

  decide(): void {
    if (!this.approvalCase || this.decisionForm.invalid || this.saving) {
      this.decisionForm.markAllAsTouched();
      return;
    }
    const values = this.decisionForm.getRawValue();
    const conditions = (values.conditions || '')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
    const conditionEvidence = (values.conditionEvidence || '')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.decision === 'CONDITIONAL' && !conditions.length) {
      this.showMessage('Enter at least one approval condition.', 'error');
      return;
    }
    if (this.approvalCase.status === 'CONDITIONAL' && !conditionEvidence.length) {
      this.showMessage('Record evidence that every approval condition was resolved.', 'error');
      return;
    }
    this.saving = true;
    this.loanApplicationService
      .decideApproval(this.loanId, {
        expectedVersion: this.approvalCase.version,
        decision: values.decision as LoanApprovalDecision,
        comments: values.comments?.trim() || '',
        conditions,
        conditionEvidence
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (approvalCase) => this.updateCase(approvalCase, 'Approval decision recorded.'),
        error: () =>
          this.showMessage('The decision was rejected. Reload and confirm your authority and case version.', 'error')
      });
  }

  decisionConditions(decision: LoanApprovalDecisionRecord): string[] {
    if (Array.isArray(decision.conditions)) {
      return decision.conditions;
    }
    try {
      return JSON.parse(decision.conditions) as string[];
    } catch {
      return [];
    }
  }

  private load(): void {
    this.loading = true;
    this.loanApplicationService
      .getApprovalCase(this.loanId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (approvalCase) => this.updateCase(approvalCase),
        error: () => {
          this.approvalCase = null;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private updateCase(approvalCase: LoanApprovalCase, message?: string): void {
    this.approvalCase = approvalCase;
    if (message) {
      this.showMessage(message, 'success');
    }
    this.changeDetectorRef.markForCheck();
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    this.changeDetectorRef.markForCheck();
  }
}
