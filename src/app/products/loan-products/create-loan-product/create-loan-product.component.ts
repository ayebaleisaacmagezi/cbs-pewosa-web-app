/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { finalize, of, switchMap, throwError } from 'rxjs';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { SettingsService } from 'app/settings/settings.service';
import { ProductsService } from 'app/products/products.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from '../../../../environments/environment';
import { LoanManagementPolicyService } from '../../loan-management-policy/loan-management-policy.service';
import {
  LoanManagementPolicyDefinition,
  LoanManagementPolicyTemplate,
  LoanPolicyDisbursementMethod,
  LoanPolicyDocumentRequirement
} from '../../loan-management-policy/loan-management-policy.models';

/** A product form arranged by the SACCO loan template, backed only by working API rules. */
@Component({
  selector: 'mifosx-create-loan-product',
  templateUrl: './create-loan-product.component.html',
  styleUrls: ['./create-loan-product.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatExpansionModule,
    MatRadioModule
  ]
})
export class CreateLoanProductComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private policyService = inject(LoanManagementPolicyService);
  private settingsService = inject(SettingsService);
  private authenticationService = inject(AuthenticationService);

  readonly glFields = [
    { key: 'fundSourceAccountId', label: 'Fund source', kind: 'asset' },
    { key: 'transfersInSuspenseAccountId', label: 'Transfers in suspense', kind: 'asset' },
    { key: 'interestOnLoanAccountId', label: 'Interest income', kind: 'income' },
    { key: 'incomeFromFeeAccountId', label: 'Fee income', kind: 'income' },
    { key: 'incomeFromPenaltyAccountId', label: 'Penalty income', kind: 'income' },
    { key: 'incomeFromRecoveryAccountId', label: 'Recovery income', kind: 'income' },
    { key: 'writeOffAccountId', label: 'Write-off expense', kind: 'expense' }
  ];
  readonly payoutMethods: LoanPolicyDisbursementMethod[] = ['ACCOUNT_CREDIT', 'CASH', 'CHEQUE', 'MOBILE_MONEY'];
  readonly stages = ['SUBMISSION', 'APPROVAL', 'DISBURSEMENT'];

  nativeTemplate: any = this.route.snapshot.data['loanProductsTemplate'];
  policyTemplate: LoanManagementPolicyTemplate | null = null;
  loadingPolicy = true;
  saving = false;
  savedProductId: number | null = null;
  errorKey = '';
  private readonly formBuilder: FormBuilder;

  form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.formBuilder = formBuilder;
    const gl = Object.fromEntries(this.glFields.map(({ key }) => [key, ['', Validators.required]]));
    this.form = formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(42)]],
      description: ['', Validators.maxLength(500)],
      currencyCode: ['', Validators.required],
      minPrincipal: [null, [Validators.required, Validators.min(1)]],
      principal: [null, [Validators.required, Validators.min(1)]],
      maxPrincipal: [null, [Validators.required, Validators.min(1)]],
      minNumberOfRepayments: [null, [Validators.required, Validators.min(1)]],
      numberOfRepayments: [null, [Validators.required, Validators.min(1)]],
      maxNumberOfRepayments: [null, [Validators.required, Validators.min(1)]],
      repaymentEvery: [1, [Validators.required, Validators.min(1)]],
      repaymentFrequencyType: [null, Validators.required],
      interestRatePerPeriod: [null, [Validators.required, Validators.min(0)]],
      interestRateFrequencyType: [null, Validators.required],
      interestType: [null, Validators.required],
      amortizationType: [null, Validators.required],
      graceOnPrincipalPayment: [0, Validators.min(0)],
      graceOnInterestPayment: [0, Validators.min(0)],
      requireActiveMember: [true],
      minimumMembershipMonths: [0, Validators.min(0)],
      minimumAgeYears: [0, Validators.min(0)],
      minimumApprovedShares: [0, Validators.min(0)],
      minimumSharesBalance: [0, Validators.min(0)],
      minimumSharesPercent: [0, [Validators.min(0), Validators.max(100)]],
      minimumSavingsBalance: [0, Validators.min(0)],
      minimumSavingsPercent: [0, [Validators.min(0), Validators.max(100)]],
      blockShareRedemption: [false],
      shareBands: formBuilder.array([]),
      maximumConcurrentLoans: [0, Validators.min(0)],
      disallowExistingDefaultedLoan: [true],
      clientClassificationIds: [[]],
      genderIds: [[]],
      districts: [[]],
      minimumMonthlyIncome: [0, Validators.min(0)],
      maximumDebtToIncomePercent: [0, [Validators.min(0), Validators.max(100)]],
      interestForgivenessEnabled: [false],
      maximumInterestForgivenessPercent: [100, [Validators.min(0.01), Validators.max(100)]],
      guarantorsRequired: [false],
      minimumGuarantors: [0, Validators.min(0)],
      maximumGuarantors: [0, Validators.min(0)],
      minimumGuaranteeCoveragePercent: [100, [Validators.min(0), Validators.max(100)]],
      maximumGuarantorExposure: [0, Validators.min(0)],
      acceptedGuarantorTypeIds: [[]],
      collateralRequired: [false],
      collateralRequiredAboveAmount: [null, Validators.min(0)],
      valuationRequired: [false],
      acceptedCollateralTypes: [[]],
      maximumLoanToValuePercent: [0, [Validators.min(0), Validators.max(100)]],
      releaseCollateralOnFullRepayment: [true],
      documents: formBuilder.array([]),
      branchMaximum: [5000000, [Validators.required, Validators.min(1)]],
      committeeMaximum: [20000000, [Validators.required, Validators.min(1)]],
      allowedMethods: [['ACCOUNT_CREDIT'], Validators.required],
      defaultMethod: ['ACCOUNT_CREDIT', Validators.required],
      feeSettlementMode: ['DEDUCT_FROM_DISBURSEMENT', Validators.required],
      chargeIds: [[]],
      accounting: formBuilder.group(gl)
    });
  }

  get documents(): FormArray { return this.form.get('documents') as FormArray; }
  get shareBands(): FormArray { return this.form.get('shareBands') as FormArray; }
  get accounting(): FormGroup { return this.form.get('accounting') as FormGroup; }
  get canWritePolicy(): boolean {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    return !environment.productionModeEnableRBAC || permissions.includes('ALL_FUNCTIONS') ||
      permissions.includes('UPDATE_PEWOSALOANPOLICY');
  }
  get valid(): boolean {
    const v = this.form.getRawValue();
    return this.form.valid && this.policyTemplate !== null && !this.loadingPolicy && this.canWritePolicy &&
      Number(v.minPrincipal) <= Number(v.principal) && Number(v.principal) <= Number(v.maxPrincipal) &&
      Number(v.minNumberOfRepayments) <= Number(v.numberOfRepayments) &&
      Number(v.numberOfRepayments) <= Number(v.maxNumberOfRepayments) &&
      Number(v.graceOnPrincipalPayment) < Number(v.numberOfRepayments) &&
      Number(v.graceOnInterestPayment) < Number(v.numberOfRepayments) &&
      Number(v.committeeMaximum) > Number(v.branchMaximum) &&
      v.allowedMethods.length > 0 && v.allowedMethods.includes(v.defaultMethod) &&
      (!v.guarantorsRequired || (Number(v.minimumGuarantors) > 0 && Number(v.maximumGuarantors) >= Number(v.minimumGuarantors)));
  }

  ngOnInit(): void {
    const template = this.nativeTemplate;
    const currency = template.currencyOptions?.find((item: any) => item.code === 'UGX') || template.currencyOptions?.[0];
    this.form.patchValue({
      currencyCode: currency?.code || '',
      repaymentFrequencyType: template.repaymentFrequencyType?.id ?? template.repaymentFrequencyTypeOptions?.[0]?.id,
      interestRateFrequencyType: template.interestRateFrequencyType?.id ?? template.interestRateFrequencyTypeOptions?.[0]?.id,
      interestType: template.interestType?.id ?? template.interestTypeOptions?.[0]?.id,
      amortizationType: template.amortizationType?.id ?? template.amortizationTypeOptions?.[0]?.id
    });
    this.policyService.getTemplate().pipe(finalize(() => this.loadingPolicy = false)).subscribe({
      next: (response) => {
        this.policyTemplate = response;
        const policy = response.policy;
        const p = policy.prequalification, u = policy.underwriting, s = policy.guarantorCollateral;
        const shareProtection = policy.shareProtection;
        const restrictions = policy.eligibilityRestrictions;
        const forgiveness = policy.interestForgiveness;
        this.form.patchValue({
          requireActiveMember: p.requireActiveMember, minimumMembershipMonths: p.minimumMembershipMonths,
          minimumAgeYears: p.minimumAgeYears, minimumApprovedShares: p.minimumApprovedShares,
          minimumSharesBalance: p.minimumSharesBalance,
          minimumSharesPercent: (p.minimumSharesToRequestedAmountRatio || 0) * 100,
          minimumSavingsBalance: p.minimumSavingsBalance,
          minimumSavingsPercent: (p.minimumSavingsToRequestedAmountRatio || 0) * 100,
          blockShareRedemption: shareProtection?.blockRedemptionBelowMinimum || false,
          maximumConcurrentLoans: p.maximumConcurrentLoans,
          disallowExistingDefaultedLoan: p.disallowExistingDefaultedLoan,
          clientClassificationIds: restrictions?.clientClassificationIds || [],
          genderIds: restrictions?.genderIds || [],
          districts: restrictions?.districts || [],
          minimumMonthlyIncome: u?.minimumMonthlyIncome || 0,
          maximumDebtToIncomePercent: (u?.maximumDebtToIncomeRatio || 0) * 100,
          interestForgivenessEnabled: forgiveness?.enabled || false,
          maximumInterestForgivenessPercent: forgiveness?.maximumOutstandingInterestPercent || 100,
          guarantorsRequired: s.guarantorsRequired, minimumGuarantors: s.minimumGuarantors,
          maximumGuarantors: s.maximumGuarantors,
          minimumGuaranteeCoveragePercent: s.minimumGuaranteeCoveragePercent,
          maximumGuarantorExposure: s.maximumExposurePerMember || 0,
          acceptedGuarantorTypeIds: s.acceptedGuarantorTypeIds || [],
          collateralRequired: s.collateralRequired, collateralRequiredAboveAmount: s.collateralRequiredAboveAmount,
          valuationRequired: s.valuationRequired,
          acceptedCollateralTypes: s.acceptedCollateralTypes || [],
          maximumLoanToValuePercent: s.maximumLoanToValuePercent || 0,
          releaseCollateralOnFullRepayment: s.releaseOnFullRepayment,
          allowedMethods: policy.disbursement.allowedMethods,
          defaultMethod: policy.disbursement.defaultMethod,
          feeSettlementMode: policy.feeSettlementMode,
          branchMaximum: policy.approvalRouting.find((r) => r.authority === 'BRANCH_MANAGER')?.maximumAmount || 5000000,
          committeeMaximum: policy.approvalRouting.find((r) => r.authority === 'CREDIT_COMMITTEE')?.maximumAmount || 20000000
        });
        (shareProtection?.minimumShareBalanceBands || []).forEach((band) => this.addShareBand(band));
        policy.documentRequirements.forEach((doc) => this.addDocument(doc));
      },
      error: () => this.errorKey = 'Loan policy configuration could not be loaded.'
    });
  }

  options(kind: string): any[] {
    const mapping = this.nativeTemplate.accountingMappingOptions || {};
    return mapping[kind + 'AccountOptions'] || [];
  }
  fieldError(name: string): boolean { const control = this.form.get(name); return !!control && control.invalid && control.touched; }
  addDocument(doc?: LoanPolicyDocumentRequirement): void {
    this.documents.push(this.formBuilder.group({
      code: [doc?.code || '', Validators.required],
      name: [doc?.name || ''],
      required: [doc?.required ?? true],
      requiredBefore: [doc?.requiredBefore || 'APPROVAL', Validators.required],
      acceptedContentTypes: [doc?.acceptedContentTypes || ['application/pdf', 'image/jpeg', 'image/png']]
    }));
  }
  addShareBand(band?: { fromLoanAmount: number; minimumShareBalance: number }): void {
    this.shareBands.push(this.formBuilder.group({
      fromLoanAmount: [band?.fromLoanAmount ?? null, [Validators.required, Validators.min(0)]],
      minimumShareBalance: [band?.minimumShareBalance ?? null, [Validators.required, Validators.min(0)]]
    }));
  }
  removeShareBand(index: number): void { this.shareBands.removeAt(index); }
  removeDocument(index: number): void { this.documents.removeAt(index); }
  methodEnabled(method: LoanPolicyDisbursementMethod): boolean {
    return (this.form.get('allowedMethods')?.value || []).includes(method);
  }
  toggleMethod(method: LoanPolicyDisbursementMethod, enabled: boolean): void {
    const control = this.form.get('allowedMethods');
    const methods = (control?.value || []).filter((value: LoanPolicyDisbursementMethod) => value !== method);
    if (enabled) methods.push(method);
    control?.setValue(methods);
    if (!methods.includes(this.form.get('defaultMethod')?.value)) this.form.get('defaultMethod')?.setValue(methods[0] || '');
  }
  chargeEnabled(id: number): boolean { return (this.form.get('chargeIds')?.value || []).includes(id); }
  toggleCharge(id: number, enabled: boolean): void {
    const control = this.form.get('chargeIds');
    const values = (control?.value || []).filter((value: number) => value !== id);
    if (enabled) values.push(id);
    control?.setValue(values);
  }

  save(): void {
    if (this.saving || !this.policyTemplate) return;
    this.form.markAllAsTouched();
    if (!this.valid) { this.errorKey = 'Complete the required fields and check the amount, repayment, and approval ranges.'; return; }
    const v = this.form.getRawValue();
    const codes = v.documents.map((doc: LoanPolicyDocumentRequirement) => doc.code.trim().toUpperCase());
    if (new Set(codes).size !== codes.length) { this.errorKey = 'Document codes must be unique.'; return; }
    const policy = this.buildPolicy(v);
    const product = this.buildProduct(v);
    if (!product.transactionProcessingStrategyCode) {
      this.errorKey = 'No standard loan processing strategy is available.'; return;
    }
    this.saving = true; this.errorKey = '';
    const request = this.savedProductId
      ? of({ resourceId: this.savedProductId })
      : this.productsService.createLoanProduct('loanproducts', product);
    request.pipe(
      switchMap((response: any) => {
        const id = this.savedProductId || Number(response.resourceId);
        if (!Number.isInteger(id) || id < 1) return throwError(() => new Error('Missing product ID'));
        this.savedProductId = id;
        return this.policyService.updatePolicy(id, { policy, active: true, effectiveFrom: null }).pipe(
          switchMap(() => this.policyService.getAccountingSetup(id)),
          switchMap((setup) => this.productsService.updateLoanProduct('loanproducts', String(id), {
            accountingRule: 3,
            ...Object.fromEntries(this.glFields.map(({ key }) => [key, Number(v.accounting[key])])),
            ...setup,
            locale: this.settingsService.language.code,
            dateFormat: this.settingsService.dateFormat
          }))
        );
      }),
      finalize(() => this.saving = false)
    ).subscribe({
      next: () => this.router.navigate(['../', this.savedProductId], { relativeTo: this.route }),
      error: () => {
        this.errorKey = this.savedProductId
          ? 'Product saved, but accounting activation is incomplete. Retry before using this product for loans.'
          : 'Product could not be saved. Check the product list before retrying.';
      }
    });
  }

  private buildPolicy(v: any): LoanManagementPolicyDefinition {
    const policy: LoanManagementPolicyDefinition = JSON.parse(JSON.stringify(this.policyTemplate!.policy));
    policy.prequalification = {
      ...policy.prequalification,
      requireActiveMember: !!v.requireActiveMember,
      minimumMembershipMonths: Number(v.minimumMembershipMonths),
      minimumAgeYears: Number(v.minimumAgeYears),
      minimumApprovedShares: Number(v.minimumApprovedShares),
      minimumSharesBalance: Number(v.minimumSharesBalance),
      minimumSharesToRequestedAmountRatio: Number(v.minimumSharesPercent) / 100,
      minimumSavingsBalance: Number(v.minimumSavingsBalance),
      minimumSavingsToRequestedAmountRatio: Number(v.minimumSavingsPercent) / 100,
      maximumConcurrentLoans: Number(v.maximumConcurrentLoans),
      disallowExistingDefaultedLoan: !!v.disallowExistingDefaultedLoan
    };
    policy.underwriting = {
      minimumMonthlyIncome: Number(v.minimumMonthlyIncome),
      maximumDebtToIncomeRatio: Number(v.maximumDebtToIncomePercent) / 100
    };
    policy.shareProtection = {
      blockRedemptionBelowMinimum: !!v.blockShareRedemption,
      minimumShareBalanceBands: v.shareBands.map((band: any) => ({
        fromLoanAmount: Number(band.fromLoanAmount),
        minimumShareBalance: Number(band.minimumShareBalance)
      }))
    };
    policy.eligibilityRestrictions = {
      clientClassificationIds: v.clientClassificationIds.map(Number),
      genderIds: v.genderIds.map(Number),
      districts: v.districts
    };
    policy.interestForgiveness = {
      enabled: !!v.interestForgivenessEnabled,
      maximumOutstandingInterestPercent: Number(v.maximumInterestForgivenessPercent)
    };
    policy.guarantorCollateral = {
      ...policy.guarantorCollateral,
      guarantorsRequired: !!v.guarantorsRequired,
      minimumGuarantors: v.guarantorsRequired ? Number(v.minimumGuarantors) : 0,
      maximumGuarantors: v.guarantorsRequired ? Number(v.maximumGuarantors) : 0,
      minimumGuaranteeCoveragePercent: Number(v.minimumGuaranteeCoveragePercent),
      maximumExposurePerMember: Number(v.maximumGuarantorExposure),
      acceptedGuarantorTypeIds: v.acceptedGuarantorTypeIds.map(Number),
      collateralRequired: !!v.collateralRequired,
      collateralRequiredAboveAmount: v.collateralRequired ? (v.collateralRequiredAboveAmount ?? null) : null,
      acceptedCollateralTypes: v.acceptedCollateralTypes.map(String),
      valuationRequired: !!v.collateralRequired && !!v.valuationRequired,
      maximumLoanToValuePercent: Number(v.maximumLoanToValuePercent),
      releaseOnFullRepayment: !!v.releaseCollateralOnFullRepayment
    };
    const branch = Number(v.branchMaximum), committee = Number(v.committeeMaximum);
    policy.loanOfficerCanApprove = false;
    policy.approvalRouting = [
      { authority: 'BRANCH_MANAGER', minimumAmount: 0, maximumAmount: branch },
      { authority: 'CREDIT_COMMITTEE', minimumAmount: branch, minimumExclusive: true, maximumAmount: committee },
      { authority: 'BOARD', minimumAmount: committee, minimumExclusive: true, maximumAmount: null }
    ];
    policy.documentRequirements = v.documents.map((doc: LoanPolicyDocumentRequirement) => ({
      ...doc, code: doc.code.trim().toUpperCase(), name: doc.name?.trim()
    }));
    policy.disbursement = {
      allowedMethods: v.allowedMethods,
      defaultMethod: v.defaultMethod,
      mobileMoneyEnabled: v.allowedMethods.includes('MOBILE_MONEY')
    };
    policy.feeSettlementMode = v.feeSettlementMode;
    return policy;
  }

  private buildProduct(v: any): any {
    const template = this.nativeTemplate;
    const currency = template.currencyOptions?.find((item: any) => item.code === v.currencyCode);
    const strategy = template.transactionProcessingStrategyOptions?.find(
      (item: any) => item.code === template.transactionProcessingStrategyCode &&
        item.code !== 'advanced-payment-allocation-strategy'
    ) || template.transactionProcessingStrategyOptions?.find(
      (item: any) => item.code !== 'advanced-payment-allocation-strategy'
    );
    return {
      name: v.name.trim(),
      shortName: this.savedProductId ? undefined : this.newShortName(),
      description: v.description.trim(),
      currencyCode: v.currencyCode,
      digitsAfterDecimal: currency?.decimalPlaces ?? 2,
      inMultiplesOf: currency?.inMultiplesOf || 0,
      minPrincipal: Number(v.minPrincipal), principal: Number(v.principal), maxPrincipal: Number(v.maxPrincipal),
      minNumberOfRepayments: Number(v.minNumberOfRepayments),
      numberOfRepayments: Number(v.numberOfRepayments),
      maxNumberOfRepayments: Number(v.maxNumberOfRepayments),
      repaymentEvery: Number(v.repaymentEvery), repaymentFrequencyType: Number(v.repaymentFrequencyType),
      interestRatePerPeriod: Number(v.interestRatePerPeriod),
      interestRateFrequencyType: Number(v.interestRateFrequencyType),
      amortizationType: Number(v.amortizationType), interestType: Number(v.interestType),
      interestCalculationPeriodType: template.interestCalculationPeriodType?.id,
      transactionProcessingStrategyCode: strategy?.code,
      graceOnPrincipalPayment: Number(v.graceOnPrincipalPayment),
      graceOnInterestPayment: Number(v.graceOnInterestPayment),
      daysInYearType: template.daysInYearType?.id,
      daysInMonthType: template.daysInMonthType?.id,
      charges: v.chargeIds.map((id: number) => ({ id })),
      accountingRule: 1,
      locale: this.settingsService.language.code,
      dateFormat: this.settingsService.dateFormat
    };
  }

  private newShortName(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const random = crypto.getRandomValues(new Uint32Array(4));
    return Array.from(random, (value) => alphabet[value % alphabet.length]).join('');
  }
}
