/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type LoanPolicyFeeSettlementMode = 'DEDUCT_FROM_DISBURSEMENT' | 'PAY_SEPARATELY';
export type LoanPolicyDisbursementMethod = 'ACCOUNT_CREDIT' | 'CASH' | 'CHEQUE' | 'MOBILE_MONEY';

export interface LoanPolicyProductOption {
  id: number;
  name: string;
  shortName?: string;
  currency?: { code?: string; displaySymbol?: string };
}

export interface LoanPolicyApprovalLevel {
  authority: 'BRANCH_MANAGER' | 'CREDIT_COMMITTEE' | 'BOARD';
  minimumAmount: number;
  minimumExclusive?: boolean;
  maximumAmount: number | null;
}

export interface LoanPolicyDocumentRequirement {
  code: string;
  required: boolean;
  requiredBefore: 'SUBMISSION' | 'APPROVAL' | 'DISBURSEMENT';
  acceptedContentTypes: string[];
}

export interface LoanPolicyCreditFactor {
  code: string;
  enabled: boolean;
  weight: number;
  fullScoreAt?: number;
  zeroScoreAt?: number;
}

export interface LoanPolicyRiskBand {
  code: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  minimumScore: number;
  maximumScore: number;
  outcome: 'CONTINUE' | 'MANUAL_REVIEW' | 'ADDITIONAL_SECURITY' | 'REJECT';
}

export interface LoanManagementPolicyDefinition {
  prequalification: {
    requireActiveMember: boolean;
    minimumMembershipMonths: number;
    minimumSavingsBalance: number;
    minimumSharesBalance: number;
    minimumSavingsToRequestedAmountRatio: number;
    minimumSharesToRequestedAmountRatio: number;
    disallowExistingDefaultedLoan: boolean;
    disallowAnyActiveLoan: boolean;
  };
  creditScoring: {
    factors: LoanPolicyCreditFactor[];
    bands: LoanPolicyRiskBand[];
  };
  loanOfficerCanApprove: false;
  approvalRouting: LoanPolicyApprovalLevel[];
  documentRequirements: LoanPolicyDocumentRequirement[];
  guarantorCollateral: {
    guarantorsRequired: boolean;
    minimumGuarantors: number;
    maximumGuarantors: number;
    minimumGuaranteeCoveragePercent: number;
    allowSavingsAsSecurity: boolean;
    allowSharesAsSecurity: boolean;
    collateralRequired: boolean;
    collateralRequiredAboveAmount: number | null;
    acceptedCollateralTypes: string[];
    valuationRequired: boolean;
    releaseOnFullRepayment: boolean;
  };
  disbursement: {
    allowedMethods: LoanPolicyDisbursementMethod[];
    defaultMethod: LoanPolicyDisbursementMethod;
    mobileMoneyEnabled: boolean;
  };
  feeSettlementMode: LoanPolicyFeeSettlementMode;
  groupLending?: LoanPolicyGroupLending;
}

export interface LoanPolicyGroupLending {
  minimumGroupAgeMonths: number;
  minimumActiveMembers: number;
  requiredRoleCodes: string[];
  requireConstitution: boolean;
  requireTraining: boolean;
  minimumSavingsToRequestedAmountRatio: number;
  maximumDelinquentMembers: number;
  minimumAttendanceRate: number;
  attendanceLookbackMeetings: number;
  jointLiabilityRequired: boolean;
  allowedRecoverySources: string[];
}

export interface LoanManagementPolicyOptions {
  feeSettlementModes: LoanPolicyFeeSettlementMode[];
  disbursementMethods: LoanPolicyDisbursementMethod[];
  approvalAuthorities: string[];
  documentStages: string[];
  riskOutcomes: string[];
  mobileMoneyAvailable: boolean;
  groupRoleCodes?: string[];
  groupRecoverySources?: string[];
}

export interface LoanManagementPolicyTemplate {
  policy: LoanManagementPolicyDefinition;
  options: LoanManagementPolicyOptions;
}

export interface LoanManagementPolicyResponse extends LoanManagementPolicyTemplate {
  loanProductId: number;
  loanProductName: string;
  currencyCode: string;
  configured: boolean;
  version: number;
  effectiveFrom: string;
  active?: boolean;
}

export interface SaveLoanManagementPolicyRequest {
  effectiveFrom: string | null;
  active: boolean;
  policy: LoanManagementPolicyDefinition;
}
