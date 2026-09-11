/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatStep, MatStepLabel, MatStepper } from '@angular/material/stepper';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { TellerBeneficiary, TellerFinancialStep, TellerFinancialStepType, TellerOnboarding } from './teller-api.models';
import { TellerApiService } from './teller-api.service';

@Component({
  selector: 'mifosx-cashier-onboarding',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIconButton,
    MatIcon,
    MatStepper,
    MatStep,
    MatStepLabel
  ],
  templateUrl: './cashier-onboarding.component.html',
  styleUrls: [
    './staff-workspace.scss',
    './cashier-onboarding.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashierOnboardingComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly tellerApi = inject(TellerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  onboarding: TellerOnboarding | null = null;
  loading = false;
  submitting = false;
  message = '';
  messageType: 'error' | 'success' | '' = '';

  startForm = this.formBuilder.group({
    nationalId: [
      '',
      Validators.required
    ],
    mobileNo: [
      '',
      Validators.required
    ]
  });

  checklistForm = this.formBuilder.group({
    bioDataCaptured: [false],
    photoCaptured: [false],
    signatureCaptured: [false],
    fingerprintCaptured: [false],
    membershipFeePaid: [false],
    annualSubscriptionPaid: [false],
    minimumSharesPurchased: [false],
    savingsAccountOpened: [false],
    memberCardIssued: [false],
    passbookIssued: [false],
    mobileBankingRegistered: [false],
    smsAlertsRegistered: [false],
    welcomePackPrinted: [false],
    documentsFiled: [false],
    unavailableReason: ['']
  });

  beneficiaryForm = this.formBuilder.group({
    fullName: [
      '',
      Validators.required
    ],
    relationship: [
      '',
      Validators.required
    ],
    mobileNo: [''],
    allocationPercentage: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(100)
      ]
    ]
  });

  readonly financialStepDefinitions: { stepType: TellerFinancialStepType; label: string }[] = [
    { stepType: 'MEMBERSHIP_FEE', label: 'Membership fee' },
    { stepType: 'ANNUAL_SUBSCRIPTION', label: 'Annual subscription' },
    { stepType: 'MINIMUM_SHARES', label: 'Minimum shares' },
    { stepType: 'SAVINGS_OPENING', label: 'Savings opening' },
    { stepType: 'INITIAL_DEPOSIT', label: 'Initial deposit' }
  ];
  financialTrackingForm = this.formBuilder.group({
    steps: this.formBuilder.array(
      this.financialStepDefinitions.map((definition) =>
        this.formBuilder.group({
          stepType: [definition.stepType],
          status: ['PENDING' as TellerFinancialStep['status']],
          transactionReference: [''],
          coreEntityId: [null as number | null],
          amount: [null as number | null],
          currencyCode: ['']
        })
      )
    )
  });

  beneficiaries: TellerBeneficiary[] = [];

  get beneficiaryTotal(): number {
    return this.beneficiaries
      .filter((item) => item.active !== false)
      .reduce((sum, item) => sum + item.allocationPercentage, 0);
  }

  get financialStepsForm() {
    return this.financialTrackingForm.controls.steps;
  }

  ngOnInit(): void {
    const reference = this.route.snapshot.paramMap.get('reference');
    const clientId = Number(this.route.snapshot.queryParamMap.get('clientId') || 0) || undefined;
    if (reference) this.load(reference, clientId);
  }

  startOnboarding(): void {
    if (this.startForm.invalid || this.submitting) return;
    const value = this.startForm.getRawValue();
    this.submitting = true;
    this.tellerApi
      .startOnboarding({ nationalId: value.nationalId || '', mobileNo: value.mobileNo || '', checklist: {} })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (onboarding) => {
          this.onboarding = onboarding;
          void this.router.navigate([
            '/staff-workspaces/cashier/onboarding',
            onboarding.reference
          ]);
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  openClientRegistration(): void {
    if (!this.onboarding) return;
    void this.router.navigate(['/clients/create'], {
      queryParams: { onboardingReference: this.onboarding.reference, workspace: 'cashier' }
    });
  }

  addBeneficiary(): void {
    if (this.beneficiaryForm.invalid) return;
    const value = this.beneficiaryForm.getRawValue();
    const beneficiary: TellerBeneficiary = {
      fullName: value.fullName || '',
      relationship: value.relationship || '',
      mobileNo: value.mobileNo || undefined,
      allocationPercentage: Number(value.allocationPercentage),
      active: true
    };
    if (this.beneficiaryTotal + beneficiary.allocationPercentage > 100) {
      this.showMessage('Beneficiary allocation cannot exceed 100%.', 'error');
      return;
    }
    this.beneficiaries = [
      ...this.beneficiaries,
      beneficiary
    ];
    this.beneficiaryForm.reset();
  }

  deactivateBeneficiary(index: number): void {
    this.beneficiaries = this.beneficiaries.map((beneficiary, itemIndex) =>
      itemIndex === index ? { ...beneficiary, active: false } : beneficiary
    );
  }

  save(): void {
    if (!this.onboarding || this.submitting) return;
    if (!this.validateFinancialSteps()) return;
    this.submitting = true;
    this.tellerApi
      .saveOnboarding(this.onboarding.reference, {
        checklist: this.checklist(),
        unavailableReason: this.checklistForm.value.unavailableReason || undefined,
        beneficiaries: this.beneficiaries,
        financialSteps: this.changedFinancialSteps()
      })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (onboarding) => {
          this.apply(onboarding);
          this.showMessage('Onboarding progress was saved.', 'success');
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  complete(): void {
    if (!this.onboarding || this.submitting) return;
    if (!this.validateFinancialSteps()) return;
    if (!this.onboarding.clientId) {
      this.showMessage('Create the Fineract member record before completing onboarding.', 'error');
      return;
    }
    if (!this.beneficiaries.some((item) => item.active !== false) || this.beneficiaryTotal !== 100) {
      this.showMessage('At least one active beneficiary is required and allocations must total 100%.', 'error');
      return;
    }
    this.submitting = true;
    this.tellerApi
      .saveOnboarding(this.onboarding.reference, {
        checklist: this.checklist(),
        unavailableReason: this.checklistForm.value.unavailableReason || undefined,
        beneficiaries: this.beneficiaries,
        financialSteps: this.changedFinancialSteps()
      })
      .subscribe({
        next: () =>
          this.tellerApi
            .completeOnboarding(this.onboarding!.reference)
            .pipe(finalize(() => (this.submitting = false)))
            .subscribe({
              next: (onboarding) => {
                this.apply(onboarding);
                this.showMessage('Member onboarding is complete.', 'success');
              },
              error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
            }),
        error: (error: unknown) => {
          this.submitting = false;
          this.showMessage(this.tellerApi.mapError(error).message, 'error');
        }
      });
  }

  private load(reference: string, clientId?: number): void {
    this.loading = true;
    this.tellerApi
      .getOnboarding(reference)
      .pipe(
        switchMap((onboarding) => {
          if (clientId && onboarding.clientId !== clientId) {
            return this.tellerApi.saveOnboarding(reference, { clientId });
          }
          return of(onboarding);
        })
      )
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (onboarding) => this.apply(onboarding),
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  private apply(onboarding: TellerOnboarding): void {
    this.onboarding = onboarding;
    this.beneficiaries = onboarding.beneficiaries || [];
    this.startForm.patchValue({ nationalId: onboarding.nationalId || '', mobileNo: onboarding.mobileNo || '' });
    this.checklistForm.patchValue({ ...onboarding.checklist, unavailableReason: onboarding.unavailableReason || '' });
    this.financialStepsForm.controls.forEach((control, index) => {
      const stepType = this.financialStepDefinitions[index].stepType;
      const step = onboarding.financialSteps?.find((item) => item.stepType === stepType);
      control.patchValue({
        stepType,
        status: step?.status || 'PENDING',
        transactionReference: step?.transactionReference || '',
        coreEntityId: step?.coreEntityId || null,
        amount: step?.amount || null,
        currencyCode: step?.currencyCode || ''
      });
    });
    this.changeDetectorRef.markForCheck();
  }

  private checklist(): Record<string, boolean> {
    const { unavailableReason: _unavailableReason, ...checklist } = this.checklistForm.getRawValue();
    return Object.fromEntries(
      Object.entries(checklist).map(
        ([
          key,
          value
        ]) => [
          key,
          Boolean(value)
        ]
      )
    );
  }

  private changedFinancialSteps(): TellerFinancialStep[] {
    const current = new Map(
      (this.onboarding?.financialSteps || []).map((step) => [
        step.stepType,
        step
      ])
    );
    return this.financialStepsForm.getRawValue().flatMap((value) => {
      const stepType = value.stepType as TellerFinancialStepType;
      const step: TellerFinancialStep = {
        stepType,
        status: value.status || 'PENDING',
        transactionReference: value.transactionReference?.trim() || undefined,
        coreEntityType: stepType === 'SAVINGS_OPENING' && value.coreEntityId ? 'SAVINGS' : undefined,
        coreEntityId: value.coreEntityId || undefined,
        amount: value.amount || undefined,
        currencyCode: value.currencyCode?.trim() || undefined
      };
      const previous = current.get(stepType);
      const unchanged =
        previous?.status === step.status &&
        (previous.transactionReference || '') === (step.transactionReference || '') &&
        Number(previous.coreEntityId || 0) === Number(step.coreEntityId || 0) &&
        Number(previous.amount || 0) === Number(step.amount || 0) &&
        (previous.currencyCode || '') === (step.currencyCode || '');
      return unchanged ? [] : [step];
    });
  }

  private validateFinancialSteps(): boolean {
    const invalidStepIndex = this.financialStepsForm.getRawValue().findIndex((step) => {
      if (step.status !== 'POSTED') return false;
      return step.stepType === 'SAVINGS_OPENING' ? !step.coreEntityId : !step.transactionReference?.trim();
    });
    if (invalidStepIndex < 0) return true;

    const label = this.financialStepDefinitions[invalidStepIndex].label;
    this.showMessage(`${label} requires a posted transaction or account reference.`, 'error');
    return false;
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    this.message = message;
    this.messageType = type;
    this.changeDetectorRef.markForCheck();
  }
}
