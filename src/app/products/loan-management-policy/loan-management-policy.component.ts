/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { ProductsService } from 'app/products/products.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import {
  LoanManagementPolicyDefinition,
  LoanPolicyApprovalLevel,
  LoanPolicyDisbursementMethod,
  LoanPolicyDocumentRequirement,
  LoanPolicyProductOption
} from './loan-management-policy.models';
import { LoanManagementPolicyService } from './loan-management-policy.service';

@Component({
  selector: 'mifosx-loan-management-policy',
  standalone: true,
  imports: [...STANDALONE_SHARED_IMPORTS],
  templateUrl: './loan-management-policy.component.html',
  styleUrls: ['./loan-management-policy.component.scss']
})
export class LoanManagementPolicyComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly policyService = inject(LoanManagementPolicyService);
  private readonly productsService = inject(ProductsService);

  loanProducts: LoanPolicyProductOption[] = [];
  selectedProduct: LoanPolicyProductOption | null = null;
  policyVersion = 0;
  configured = false;
  loading = false;
  saving = false;
  message = '';
  messageType: 'success' | 'error' | '' = '';

  readonly disbursementMethods: Array<{ code: LoanPolicyDisbursementMethod; label: string }> = [
    { code: 'ACCOUNT_CREDIT', label: 'labels.inputs.Account credit' },
    { code: 'CASH', label: 'labels.inputs.Cash' },
    { code: 'CHEQUE', label: 'labels.inputs.Cheque' },
    { code: 'MOBILE_MONEY', label: 'labels.inputs.Mobile money' }
  ];

  policyForm = this.formBuilder.group({
    loanProductId: this.formBuilder.control<number | null>(null, Validators.required),
    active: [true],
    effectiveFrom: this.formBuilder.control<string | null>(null),
    prequalification: this.formBuilder.group({
      requireActiveMember: [true],
      minimumMembershipMonths: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      minimumSavingsBalance: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      minimumSharesBalance: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      minimumSavingsToRequestedAmountRatio: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      minimumSharesToRequestedAmountRatio: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      disallowExistingDefaultedLoan: [true],
      disallowAnyActiveLoan: [false]
    }),
    creditScoring: this.formBuilder.group({
      factors: this.formBuilder.array<FormGroup>([]),
      bands: this.formBuilder.array<FormGroup>([])
    }),
    loanOfficerCanApprove: this.formBuilder.control<false>(false, { nonNullable: true }),
    approvalRouting: this.formBuilder.array<FormGroup>([]),
    documentRequirements: this.formBuilder.array<FormGroup>([]),
    guarantorCollateral: this.formBuilder.group({
      guarantorsRequired: [false],
      minimumGuarantors: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      maximumGuarantors: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      minimumGuaranteeCoveragePercent: [
        100,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(100)
        ]
      ],
      allowSavingsAsSecurity: [true],
      allowSharesAsSecurity: [true],
      collateralRequired: [false],
      collateralRequiredAboveAmount: this.formBuilder.control<number | null>(null, Validators.min(0)),
      acceptedCollateralTypes: this.formBuilder.control<string[]>([], { nonNullable: true }),
      valuationRequired: [false],
      releaseOnFullRepayment: [true]
    }),
    disbursement: this.formBuilder.group({
      allowedMethods: this.formBuilder.control<LoanPolicyDisbursementMethod[]>(['ACCOUNT_CREDIT'], {
        nonNullable: true,
        validators: Validators.required
      }),
      defaultMethod: this.formBuilder.control<LoanPolicyDisbursementMethod>('ACCOUNT_CREDIT', {
        nonNullable: true,
        validators: Validators.required
      }),
      mobileMoneyEnabled: this.formBuilder.control<false>(false, { nonNullable: true })
    }),
    feeSettlementMode: this.formBuilder.control<'DEDUCT_FROM_DISBURSEMENT' | 'PAY_SEPARATELY'>(
      'DEDUCT_FROM_DISBURSEMENT',
      Validators.required
    ),
    groupLending: this.formBuilder.group({
      minimumGroupAgeMonths: [6, [Validators.required, Validators.min(0)]],
      minimumActiveMembers: [5, [Validators.required, Validators.min(2)]],
      requiredRoleCodes: this.formBuilder.control<string[]>(['CHAIRPERSON', 'SECRETARY', 'TREASURER'], {
        nonNullable: true,
        validators: Validators.required
      }),
      requireConstitution: [true],
      requireTraining: [true],
      minimumSavingsToRequestedAmountRatio: [0.2, [Validators.required, Validators.min(0), Validators.max(1)]],
      maximumDelinquentMembers: [0, [Validators.required, Validators.min(0)]],
      minimumAttendanceRate: [75.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      attendanceLookbackMeetings: [10, [Validators.required, Validators.min(1)]],
      jointLiabilityRequired: [true],
      allowedRecoverySources: this.formBuilder.control<string[]>(
        ['GROUP_SOCIAL_FUND', 'GROUP_SAVINGS', 'MEMBER_GUARANTOR_SAVINGS'],
        { nonNullable: true, validators: Validators.required }
      )
    })
  });

  readonly availableGroupRoles = ['CHAIRPERSON', 'SECRETARY', 'TREASURER', 'VICE_CHAIRPERSON', 'MOBILIZER'];
  readonly availableRecoverySources = ['GROUP_SOCIAL_FUND', 'GROUP_SAVINGS', 'MEMBER_GUARANTOR_SAVINGS'];

  get scoringFactors(): FormArray<FormGroup> {
    return this.policyForm.controls.creditScoring.controls.factors;
  }

  get riskBands(): FormArray<FormGroup> {
    return this.policyForm.controls.creditScoring.controls.bands;
  }

  get approvalLevels(): FormArray<FormGroup> {
    return this.policyForm.controls.approvalRouting;
  }

  get documentRequirements(): FormArray<FormGroup> {
    return this.policyForm.controls.documentRequirements;
  }

  get policyStatusLabel(): string {
    if (!this.configured) return 'labels.inputs.Not configured';
    return this.policyForm.controls.active.value ? 'labels.inputs.Active' : 'labels.inputs.Inactive';
  }

  ngOnInit(): void {
    this.loadTemplate();
  }

  loadTemplate(): void {
    this.loading = true;
    forkJoin({
      template: this.policyService.getTemplate(),
      loanProducts: this.productsService.getLoanProducts('loanproducts')
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ template, loanProducts }) => {
          this.loanProducts = loanProducts || [];
          this.resetPolicy(template.policy, 0);
        },
        error: () => this.showMessage('labels.text.Loan policy configuration could not be loaded', 'error')
      });
  }

  selectProduct(loanProductId: number): void {
    this.selectedProduct = this.loanProducts.find((product) => product.id === loanProductId) || null;
    this.loading = true;
    this.message = '';
    this.policyService
      .getPolicy(loanProductId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.policyVersion = response.version;
          this.configured = response.configured;
          this.resetPolicy(response.policy, loanProductId);
          this.policyForm.patchValue({ active: response.active ?? false, effectiveFrom: response.effectiveFrom });
        },
        error: () => {
          this.policyVersion = 0;
          this.configured = false;
          this.resetPolicy(this.createDefaultPolicy(), loanProductId);
          this.showMessage(
            'labels.text.The default policy is shown because the saved policy could not be loaded',
            'error'
          );
        }
      });
  }

  save(): void {
    if (this.policyForm.invalid || this.saving) {
      this.policyForm.markAllAsTouched();
      this.showMessage('labels.text.Complete the required loan policy fields before saving', 'error');
      return;
    }
    const loanProductId = this.policyForm.controls.loanProductId.value as number;
    const raw = this.policyForm.getRawValue();
    this.saving = true;
    this.policyService
      .updatePolicy(loanProductId, {
        effectiveFrom: raw.effectiveFrom,
        active: Boolean(raw.active),
        policy: this.toPolicyDefinition(raw)
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.policyVersion = response.version;
          this.configured = response.configured;
          this.resetPolicy(response.policy, response.loanProductId);
          this.policyForm.patchValue({ active: response.active ?? true, effectiveFrom: response.effectiveFrom });
          this.showMessage('labels.text.Loan policy saved successfully', 'success');
        },
        error: () => this.showMessage('labels.text.Loan policy could not be saved', 'error')
      });
  }

  addDocumentRequirement(): void {
    this.documentRequirements.push(this.createDocumentRequirementGroup());
  }

  removeDocumentRequirement(index: number): void {
    this.documentRequirements.removeAt(index);
  }

  methodEnabled(method: LoanPolicyDisbursementMethod): boolean {
    return this.policyForm.controls.disbursement.controls.allowedMethods.value.includes(method);
  }

  toggleMethod(method: LoanPolicyDisbursementMethod, enabled: boolean): void {
    const disbursement = this.policyForm.controls.disbursement;
    const methods = disbursement.controls.allowedMethods.value.filter((entry) => entry !== method);
    if (enabled) methods.push(method);
    disbursement.controls.allowedMethods.setValue(methods);
    if (!methods.includes(disbursement.controls.defaultMethod.value) && methods.length) {
      disbursement.controls.defaultMethod.setValue(methods[0]);
    }
    disbursement.controls.allowedMethods.markAsDirty();
  }

  private resetPolicy(policy: LoanManagementPolicyDefinition, loanProductId: number): void {
    this.scoringFactors.clear();
    (policy.creditScoring?.factors || []).forEach((factor) =>
      this.scoringFactors.push(
        this.formBuilder.group({
          code: [
            factor.code,
            Validators.required
          ],
          name: [this.factorLabel(factor.code)],
          enabled: [factor.enabled],
          weight: [
            factor.weight,
            [
              Validators.required,
              Validators.min(0),
              Validators.max(100)
            ]
          ],
          fullScoreAt: [
            factor.fullScoreAt ?? this.defaultFullScoreAt(factor.code),
            Validators.min(0.0001)
          ],
          zeroScoreAt: [
            factor.zeroScoreAt ?? (factor.code === 'DEBT_TO_INCOME_RATIO' ? 1 : null),
            Validators.min(0.0001)
          ]
        })
      )
    );
    this.riskBands.clear();
    (policy.creditScoring?.bands || []).forEach((band) => this.riskBands.push(this.formBuilder.group(band)));
    this.approvalLevels.clear();
    (policy.approvalRouting || []).forEach((level) => this.approvalLevels.push(this.createApprovalLevelGroup(level)));
    this.documentRequirements.clear();
    (policy.documentRequirements || []).forEach((requirement) =>
      this.documentRequirements.push(this.createDocumentRequirementGroup(requirement))
    );
    if (policy.groupLending) {
      this.policyForm.controls.groupLending.patchValue(policy.groupLending);
    }
    this.policyForm.patchValue({ ...policy, loanProductId });
  }

  private createApprovalLevelGroup(level: LoanPolicyApprovalLevel): FormGroup {
    return this.formBuilder.group({
      authority: [
        level.authority,
        Validators.required
      ],
      minimumAmount: [
        level.minimumAmount,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      minimumExclusive: [level.minimumExclusive || false],
      maximumAmount: [
        level.maximumAmount,
        Validators.min(0)
      ]
    });
  }

  private createDocumentRequirementGroup(requirement?: LoanPolicyDocumentRequirement): FormGroup {
    return this.formBuilder.group({
      code: [
        requirement?.code || '',
        Validators.required
      ],
      name: [
        requirement ? this.documentLabel(requirement.code) : '',
        Validators.required
      ],
      required: [requirement?.required ?? true],
      requiredBefore: [
        requirement?.requiredBefore || 'SUBMISSION',
        Validators.required
      ],
      acceptedContentTypes: this.formBuilder.control<string[]>(
        requirement?.acceptedContentTypes || [
          'application/pdf',
          'image/jpeg',
          'image/png'
        ],
        { nonNullable: true }
      )
    });
  }

  private toPolicyDefinition(raw: ReturnType<typeof this.policyForm.getRawValue>): LoanManagementPolicyDefinition {
    return {
      prequalification: raw.prequalification,
      creditScoring: {
        factors: raw.creditScoring.factors.map(({ code, enabled, weight, fullScoreAt, zeroScoreAt }) => ({
          code,
          enabled,
          weight,
          ...(code === 'DEBT_TO_INCOME_RATIO' ? { zeroScoreAt } : { fullScoreAt })
        })),
        bands: raw.creditScoring.bands
      },
      loanOfficerCanApprove: false,
      approvalRouting: raw.approvalRouting.map(({ authority, minimumAmount, minimumExclusive, maximumAmount }) => ({
        authority,
        minimumAmount,
        ...(minimumExclusive ? { minimumExclusive: true } : {}),
        maximumAmount
      })),
      documentRequirements: raw.documentRequirements.map(
        ({ code, required, requiredBefore, acceptedContentTypes }) => ({
          code,
          required,
          requiredBefore,
          acceptedContentTypes
        })
      ),
      guarantorCollateral: raw.guarantorCollateral,
      disbursement: raw.disbursement,
      feeSettlementMode: raw.feeSettlementMode,
      groupLending: raw.groupLending
    } as LoanManagementPolicyDefinition;
  }

  private createDefaultPolicy(): LoanManagementPolicyDefinition {
    return {
      prequalification: {
        requireActiveMember: true,
        minimumMembershipMonths: 0,
        minimumSavingsBalance: 0,
        minimumSharesBalance: 0,
        minimumSavingsToRequestedAmountRatio: 0,
        minimumSharesToRequestedAmountRatio: 0,
        disallowExistingDefaultedLoan: true,
        disallowAnyActiveLoan: false
      },
      creditScoring: {
        factors: [
          { code: 'MEMBERSHIP_DURATION', enabled: true, weight: 15, fullScoreAt: 12 },
          { code: 'SAVINGS_BALANCE', enabled: true, weight: 20, fullScoreAt: 0.25 },
          { code: 'SHARES_HELD', enabled: true, weight: 10, fullScoreAt: 0.1 },
          { code: 'PREVIOUS_LOAN_HISTORY', enabled: true, weight: 15, fullScoreAt: 3 },
          { code: 'REPAYMENT_HISTORY', enabled: true, weight: 20, fullScoreAt: 1 },
          { code: 'DEBT_TO_INCOME_RATIO', enabled: true, weight: 15, zeroScoreAt: 1 },
          { code: 'GUARANTOR_COVERAGE', enabled: true, weight: 5, fullScoreAt: 1 }
        ],
        bands: [
          { code: 'LOW', minimumScore: 80, maximumScore: 100, outcome: 'CONTINUE' },
          { code: 'MEDIUM', minimumScore: 60, maximumScore: 79.99, outcome: 'MANUAL_REVIEW' },
          { code: 'HIGH', minimumScore: 40, maximumScore: 59.99, outcome: 'ADDITIONAL_SECURITY' },
          { code: 'VERY_HIGH', minimumScore: 0, maximumScore: 39.99, outcome: 'REJECT' }
        ]
      },
      loanOfficerCanApprove: false,
      approvalRouting: [
        { authority: 'BRANCH_MANAGER', minimumAmount: 0, maximumAmount: 5000000 },
        { authority: 'CREDIT_COMMITTEE', minimumAmount: 5000000, minimumExclusive: true, maximumAmount: 20000000 },
        { authority: 'BOARD', minimumAmount: 20000000, minimumExclusive: true, maximumAmount: null }
      ],
      documentRequirements: [],
      guarantorCollateral: {
        guarantorsRequired: false,
        minimumGuarantors: 0,
        maximumGuarantors: 0,
        minimumGuaranteeCoveragePercent: 100,
        allowSavingsAsSecurity: true,
        allowSharesAsSecurity: true,
        collateralRequired: false,
        collateralRequiredAboveAmount: null,
        acceptedCollateralTypes: [],
        valuationRequired: false,
        releaseOnFullRepayment: true
      },
      disbursement: {
        allowedMethods: [
          'ACCOUNT_CREDIT',
          'CASH',
          'CHEQUE'
        ],
        defaultMethod: 'ACCOUNT_CREDIT',
        mobileMoneyEnabled: false
      },
      feeSettlementMode: 'DEDUCT_FROM_DISBURSEMENT',
      groupLending: {
        minimumGroupAgeMonths: 6,
        minimumActiveMembers: 5,
        requiredRoleCodes: [
          'CHAIRPERSON',
          'SECRETARY',
          'TREASURER'
        ],
        requireConstitution: true,
        requireTraining: true,
        minimumSavingsToRequestedAmountRatio: 0.2,
        maximumDelinquentMembers: 0,
        minimumAttendanceRate: 75.0,
        attendanceLookbackMeetings: 10,
        jointLiabilityRequired: true,
        allowedRecoverySources: [
          'GROUP_SOCIAL_FUND',
          'GROUP_SAVINGS',
          'MEMBER_GUARANTOR_SAVINGS'
        ]
      }
    };
  }

  private factorLabel(code: string): string {
    return `labels.inputs.${code}`;
  }

  private defaultFullScoreAt(code: string): number | null {
    return (
      {
        MEMBERSHIP_DURATION: 12,
        SAVINGS_BALANCE: 0.25,
        SHARES_HELD: 0.1,
        PREVIOUS_LOAN_HISTORY: 3,
        REPAYMENT_HISTORY: 1,
        GUARANTOR_COVERAGE: 1
      }[code] ?? null
    );
  }

  private documentLabel(code: string): string {
    return `labels.inputs.${code}`;
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }
}
