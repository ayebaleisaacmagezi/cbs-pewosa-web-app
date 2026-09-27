/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectorRef, Component, DestroyRef, OnInit, Input, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Observable, finalize, forkJoin, of, tap } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { environment } from '../../../environments/environment';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import {
  LoanManagementPolicyDefinition,
  LoanPolicyApprovalLevel,
  LoanPolicyDisbursementMethod,
  LoanPolicyDocumentRequirement,
  SaveLoanManagementPolicyRequest
} from './loan-management-policy.models';
import { LoanManagementPolicyService } from './loan-management-policy.service';

@Component({
  selector: 'mifosx-loan-management-policy',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatSnackBarModule,
    MatExpansionModule
  ],
  templateUrl: './loan-management-policy.component.html',
  styleUrls: ['./loan-management-policy.component.scss']
})
export class LoanManagementPolicyComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly policyService = inject(LoanManagementPolicyService);
  private readonly authenticationService = inject(AuthenticationService);
  @Input() productId: number | null = null;
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translateService = inject(TranslateService);

  policyVersion = 0;
  configured = false;
  loading = false;
  saving = false;
  policyLoadFailed = false;
  message = '';
  messageType: 'success' | 'error' | '' = '';
  private loadedPolicy: LoanManagementPolicyDefinition | null = null;
  definitionSections: Array<{ title: string; fields: Array<{ label: string; description: string }> }> = [];
  definitionControls: Record<string, FormControl<string>> = {};

  private readonly configuredElsewhere: Record<string, string> = {
    'Product Name': 'General information',
    'Product Description': 'General information',
    'Currency': 'Currency',
    'Membership Required': 'Pre-qualification rules',
    'Minimum Membership Duration': 'Pre-qualification rules',
    'Minimum Shares Needed': 'Pre-qualification rules',
    'Minimum Share Balance': 'Pre-qualification rules',
    'Minimum Principal Amount': 'Terms',
    'Maximum Principal Amount': 'Terms',
    'Minimum Tenor': 'Terms',
    'Maximum Tenor': 'Terms',
    'Repayment Frequency': 'Terms',
    'Amortization Method': 'Terms',
    'Loan Cycle Limit': 'Pre-qualification rules',
    'Nominal Annual Interest Rate': 'Terms',
    'Loan Application Fee': 'Charges',
    'Application Fee Deduction Method': 'Fees and disbursement',
    'Collateral Required': 'Guarantors and collateral',
    'Valuation Requirement': 'Guarantors and collateral',
    'Guarantor Required': 'Guarantors and collateral',
    'Minimum Number of Guarantors': 'Guarantors and collateral',
    'Maximum Number of Guarantors': 'Guarantors and collateral',
    'Minimum Age': 'Pre-qualification rules',
    'Minimum Income': 'Underwriting limits',
    'Debt-to-Income Ratio': 'Underwriting limits',
    'Membership Duration': 'Pre-qualification rules',
    'Documentation Required': 'Required documents',
    'Underwriting Approval Level': 'Approval authority',
    'Disbursement Method': 'Fees and disbursement',
    'Principal Ledger Account': 'Accounting',
    'Interest Income Account': 'Accounting',
    'Fee Income Account': 'Accounting',
    'Penalty Income Account': 'Accounting',
    'Write-off Account': 'Accounting',
    'Suspense Account': 'Accounting'
  };

  fieldKey(section: string, field: string): string {
    return `${section}|${field}`;
  }

  fieldLocation(field: string): string | null {
    return this.configuredElsewhere[field] || null;
  }

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
      minimumAgeYears: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(120),
          Validators.pattern(/^\d+$/)
        ]
      ],
      minimumApprovedShares: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.pattern(/^\d+$/)
        ]
      ],
      maximumConcurrentLoans: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.pattern(/^\d+$/)
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
    underwriting: this.formBuilder.group({
      minimumMonthlyIncome: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      maximumDebtToIncomeRatio: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(1)
        ]
      ]
    }),
    creditScoring: this.formBuilder.group({
      factors: this.formBuilder.array<FormGroup>([]),
      bands: this.formBuilder.array<FormGroup>([])
    }),
    loanOfficerCanApprove: this.formBuilder.control<boolean>(false, { nonNullable: true }),
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
      mobileMoneyEnabled: this.formBuilder.control<boolean>(false, { nonNullable: true })
    }),
    feeSettlementMode: this.formBuilder.control<'DEDUCT_FROM_DISBURSEMENT' | 'PAY_SEPARATELY'>(
      'DEDUCT_FROM_DISBURSEMENT',
      Validators.required
    ),
    groupLending: this.formBuilder.group({
      minimumGroupAgeMonths: [
        6,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      minimumActiveMembers: [
        5,
        [
          Validators.required,
          Validators.min(2)
        ]
      ],
      requiredRoleCodes: this.formBuilder.control<string[]>(
        [
          'CHAIRPERSON',
          'SECRETARY',
          'TREASURER'
        ],
        {
          nonNullable: true,
          validators: Validators.required
        }
      ),
      requireConstitution: [true],
      requireTraining: [true],
      minimumSavingsToRequestedAmountRatio: [
        0.2,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(1)
        ]
      ],
      maximumDelinquentMembers: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      minimumAttendanceRate: [
        75.0,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(100)
        ]
      ],
      attendanceLookbackMeetings: [
        10,
        [
          Validators.required,
          Validators.min(1)
        ]
      ],
      jointLiabilityRequired: [true],
      allowedRecoverySources: this.formBuilder.control<string[]>(
        [
          'GROUP_SOCIAL_FUND',
          'GROUP_SAVINGS',
          'MEMBER_GUARANTOR_SAVINGS'
        ],
        { nonNullable: true, validators: Validators.required }
      )
    })
  });

  readonly availableGroupRoles = [
    'CHAIRPERSON',
    'SECRETARY',
    'TREASURER',
    'VICE_CHAIRPERSON',
    'MOBILIZER'
  ];
  readonly availableRecoverySources = [
    'GROUP_SOCIAL_FUND',
    'GROUP_SAVINGS',
    'MEMBER_GUARANTOR_SAVINGS'
  ];

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

  get canWrite(): boolean {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    return (
      !environment.productionModeEnableRBAC ||
      permissions.includes('ALL_FUNCTIONS') ||
      permissions.includes('UPDATE_PEWOSALOANPOLICY')
    );
  }

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      template: this.policyService.getTemplate(),
      existing: this.productId ? this.policyService.getPolicy(this.productId) : of(null),
      definition: this.http.get<Array<{ title: string; fields: Array<{ label: string; description: string }> }>>(
        new URL('assets/loan-product-definition.json', this.document.baseURI).href
      )
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          if (!this.destroyRef.destroyed) this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: ({ template, existing, definition }) => {
          this.definitionSections = definition;
          this.resetPolicy(existing ? existing.policy : template.policy, this.productId || 0);
          this.policyVersion = existing?.version || 0;
          this.configured = existing?.configured || false;
          this.policyForm.patchValue({
            active: existing ? (existing.active ?? false) : true,
            effectiveFrom: existing?.effectiveFrom || null
          });
          if (!this.canWrite) this.policyForm.disable();
        },
        error: () => {
          this.policyLoadFailed = true;
          this.showMessage('labels.text.Loan policy configuration could not be loaded', 'error');
        }
      });
  }

  prepareSave(): SaveLoanManagementPolicyRequest | null {
    if (!this.canWrite) return null;
    if (this.loading || this.policyLoadFailed) {
      this.showMessage('labels.text.Loan policy configuration could not be loaded', 'error');
      return null;
    }
    // A new product has no ID until the native create succeeds.
    this.policyForm.controls.loanProductId.setValue(this.productId || 0);
    this.policyForm.markAllAsTouched();
    if (this.policyForm.invalid) {
      this.showMessage('labels.text.Complete the required loan policy fields before saving', 'error');
      return null;
    }
    const raw = this.policyForm.getRawValue();
    const codes = raw.documentRequirements.map(({ code }) => code.trim().toUpperCase());
    if (new Set(codes).size !== codes.length) {
      this.showMessage('labels.text.Duplicate document codes are not allowed', 'error');
      return null;
    }
    return { active: Boolean(raw.active), effectiveFrom: raw.effectiveFrom, policy: this.toPolicyDefinition(raw) };
  }

  saveForProduct(productId: number, request: SaveLoanManagementPolicyRequest): Observable<unknown> {
    this.saving = true;
    return this.policyService.updatePolicy(productId, request).pipe(
      tap((response) => {
        this.productId = productId;
        this.policyVersion = response.version;
        this.configured = response.configured;
        this.resetPolicy(response.policy, productId);
        this.policyForm.patchValue({ active: response.active ?? true, effectiveFrom: response.effectiveFrom });
      }),
      finalize(() => {
        this.saving = false;
        if (!this.destroyRef.destroyed) this.changeDetectorRef.detectChanges();
      })
    );
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
    if (method === 'MOBILE_MONEY') {
      disbursement.controls.mobileMoneyEnabled.setValue(enabled);
    }
    if (!methods.includes(disbursement.controls.defaultMethod.value) && methods.length) {
      disbursement.controls.defaultMethod.setValue(methods[0]);
    }
    disbursement.controls.allowedMethods.markAsDirty();
  }

  setLoanOfficerApproval(enabled: boolean): void {
    const index = this.approvalLevels.controls.findIndex((level) => level.get('authority')?.value === 'LOAN_OFFICER');
    if (enabled && index < 0) {
      this.approvalLevels.insert(
        0,
        this.createApprovalLevelGroup({ authority: 'LOAN_OFFICER', minimumAmount: 0, maximumAmount: null })
      );
    } else if (!enabled && index >= 0) {
      this.approvalLevels.removeAt(index);
    }
    this.syncLoanOfficerBand();
  }

  syncLoanOfficerBand(): void {
    const branch = this.approvalLevels.controls.find((level) => level.get('authority')?.value === 'BRANCH_MANAGER');
    const officer = this.approvalLevels.controls.find((level) => level.get('authority')?.value === 'LOAN_OFFICER');
    if (!branch) return;
    const limit = officer ? Number(officer.get('maximumAmount')?.value) : 0;
    branch.get('minimumAmount')?.setValue(limit > 0 ? limit : 0);
    branch.get('minimumExclusive')?.setValue(!!officer);
  }

  private resetPolicy(policy: LoanManagementPolicyDefinition, loanProductId: number): void {
    this.loadedPolicy = policy;
    this.definitionControls = {};
    for (const section of this.definitionSections) {
      for (const field of section.fields) {
        if (this.fieldLocation(field.label) || ['Product Code', 'Effective Date', 'Review Date', 'Moratorium'].includes(field.label)) {
          continue;
        }
        const key = this.fieldKey(section.title, field.label);
        this.definitionControls[key] = new FormControl<string>(policy.productDefinition?.[section.title]?.[field.label] || '', {
          nonNullable: true
        });
        if (!this.canWrite) this.definitionControls[key].disable();
      }
    }
    const defaults = this.createDefaultPolicy();
    this.policyForm.patchValue({
      loanProductId,
      active: true,
      effectiveFrom: null,
      prequalification: { ...defaults.prequalification, ...policy.prequalification },
      underwriting: { ...defaults.underwriting, ...policy.underwriting },
      loanOfficerCanApprove: policy.loanOfficerCanApprove ?? defaults.loanOfficerCanApprove,
      guarantorCollateral: { ...defaults.guarantorCollateral, ...policy.guarantorCollateral },
      disbursement: { ...defaults.disbursement, ...policy.disbursement },
      feeSettlementMode: policy.feeSettlementMode ?? defaults.feeSettlementMode,
      groupLending: { ...defaults.groupLending, ...policy.groupLending }
    });
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
    this.policyForm.markAsPristine();
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
        level.authority === 'LOAN_OFFICER' ? [
              Validators.required,
              Validators.min(0.01)
            ] : Validators.min(0)
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
        requirement?.name || (requirement ? this.documentLabel(requirement.code) : ''),
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
    const productDefinition: Record<string, Record<string, string>> = { ...(this.loadedPolicy?.productDefinition || {}) };
    for (const section of this.definitionSections) {
      const values = { ...(productDefinition[section.title] || {}) };
      for (const field of section.fields) {
        const control = this.definitionControls[this.fieldKey(section.title, field.label)];
        if (control) values[field.label] = control.value.trim();
      }
      productDefinition[section.title] = values;
    }
    return {
      ...(this.loadedPolicy || {}),
      productDefinition,
      prequalification: raw.prequalification,
      underwriting: raw.underwriting,
      creditScoring: {
        factors: raw.creditScoring.factors.map(({ code, enabled, weight, fullScoreAt, zeroScoreAt }) => ({
          code,
          enabled,
          weight,
          ...(code === 'DEBT_TO_INCOME_RATIO' ? { zeroScoreAt } : { fullScoreAt })
        })),
        bands: raw.creditScoring.bands
      },
      loanOfficerCanApprove: raw.loanOfficerCanApprove,
      approvalRouting: raw.approvalRouting.map(({ authority, minimumAmount, minimumExclusive, maximumAmount }) => ({
        authority,
        minimumAmount,
        ...(minimumExclusive ? { minimumExclusive: true } : {}),
        maximumAmount
      })),
      documentRequirements: raw.documentRequirements.map(
        ({ code, name, required, requiredBefore, acceptedContentTypes }) => ({
          code,
          name: name.trim(),
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
        minimumAgeYears: 0,
        minimumApprovedShares: 0,
        maximumConcurrentLoans: 0,
        minimumSavingsBalance: 0,
        minimumSharesBalance: 0,
        minimumSavingsToRequestedAmountRatio: 0,
        minimumSharesToRequestedAmountRatio: 0,
        disallowExistingDefaultedLoan: true,
        disallowAnyActiveLoan: false
      },
      underwriting: { minimumMonthlyIncome: 0, maximumDebtToIncomeRatio: 0 },
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
    return code.replaceAll('_', ' ');
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    this.snackBar.open(this.translateService.instant(message), this.translateService.instant('labels.buttons.Close'), {
      duration: type === 'success' ? 5000 : 7000
    });
  }
}
