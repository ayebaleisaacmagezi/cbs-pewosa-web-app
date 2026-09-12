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
import { LoanAppraisal, LoanAppraisalRecommendation, LoanAppraisalRequest } from '../../pewosa-loan-application.models';
import { PewosaLoanApplicationService } from '../../pewosa-loan-application.service';

@Component({
  selector: 'mifosx-loan-appraisal-tab',
  standalone: true,
  imports: [...STANDALONE_SHARED_IMPORTS],
  templateUrl: './loan-appraisal-tab.component.html',
  styleUrls: ['./loan-appraisal-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanAppraisalTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly loanApplicationService = inject(PewosaLoanApplicationService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  loanId = Number(this.route.parent?.snapshot.params['loanId']);
  savedAppraisal: LoanAppraisal | null = null;
  loading = false;
  saving = false;
  message = '';
  messageType: 'success' | 'error' | '' = '';

  appraisalForm = this.formBuilder.group({
    monthlyIncome: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ]),
    monthlyExpenses: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0)
    ]),
    existingMonthlyDebt: this.formBuilder.control<number | null>(0, [
      Validators.required,
      Validators.min(0)
    ]),
    notes: [
      '',
      [
        Validators.required,
        Validators.maxLength(4000)
      ]
    ],
    recommendation: this.formBuilder.control<LoanAppraisalRecommendation | null>(null, Validators.required),
    conditions: ['']
  });

  ngOnInit(): void {
    this.loadAppraisal();
  }

  save(): void {
    if (this.appraisalForm.invalid || this.saving) {
      this.appraisalForm.markAllAsTouched();
      this.showMessage('Complete the required appraisal fields before saving.', 'error');
      return;
    }
    const payload = this.buildRequest();
    if (payload.recommendation === 'RECOMMEND_WITH_CONDITIONS' && !payload.conditions.length) {
      this.showMessage('Enter at least one condition for a conditional recommendation.', 'error');
      return;
    }
    const request$ = this.savedAppraisal
      ? this.loanApplicationService.updateAppraisal(this.loanId, payload)
      : this.loanApplicationService.createAppraisal(this.loanId, payload);
    this.saving = true;
    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (appraisal) => {
        this.savedAppraisal = appraisal;
        this.patchForm(appraisal);
        this.showMessage('Appraisal saved. This is a recommendation, not a loan approval.', 'success');
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.showMessage(
          'The appraisal could not be saved. Confirm all submission-stage documents are independently verified.',
          'error'
        );
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  private loadAppraisal(): void {
    this.loading = true;
    this.loanApplicationService
      .getAppraisal(this.loanId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (appraisal) => {
          this.savedAppraisal = appraisal;
          this.patchForm(appraisal);
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.savedAppraisal = null;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private buildRequest(): LoanAppraisalRequest {
    const values = this.appraisalForm.getRawValue();
    return {
      monthlyIncome: values.monthlyIncome as number,
      monthlyExpenses: values.monthlyExpenses as number,
      existingMonthlyDebt: values.existingMonthlyDebt as number,
      notes: values.notes?.trim() || '',
      recommendation: values.recommendation as LoanAppraisalRecommendation,
      conditions: (values.conditions || '')
        .split('\n')
        .map((condition) => condition.trim())
        .filter(Boolean)
    };
  }

  private patchForm(appraisal: LoanAppraisal): void {
    this.appraisalForm.patchValue({ ...appraisal, conditions: appraisal.conditions.join('\n') });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }
}
