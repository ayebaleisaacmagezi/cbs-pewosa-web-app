/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface LoanPrequalificationRequest {
  clientId: number;
  loanProductId: number;
  requestedAmount: number;
  loanId?: number;
}
export interface LoanPrequalificationRule {
  code: string;
  passed: boolean;
  actual: number | string | boolean;
  required: number | string | boolean;
  message: string;
}

export interface LoanPrequalificationResult {
  reference: string;
  eligible: boolean;
  clientId: number;
  clientName: string;
  loanProductId: number;
  loanProductName: string;
  loanId?: number;
  requestedAmount: number;
  currencyCode: string;
  policyVersion: number;
  evaluatedOn: string;
  facts: Record<string, number | string | boolean>;
  rules: LoanPrequalificationRule[];
}

export interface LoanDocumentRequirement {
  requirementCode: string;
  required: boolean;
  requiredBefore: 'SUBMISSION' | 'APPROVAL' | 'DISBURSEMENT';
  acceptedContentTypes: string;
  status: 'MISSING' | 'UPLOADED' | 'VERIFIED' | 'REJECTED';
  documentId?: number;
  documentName?: string;
  fileName?: string;
  contentType?: string;
  decisionReason?: string;
  verifiedBy?: number;
  verifiedOn?: string;
}

export interface LoanDocumentChecklist {
  loanId: number;
  loanProductId: number;
  requirements: LoanDocumentRequirement[];
}

export type LoanAppraisalRecommendation = 'RECOMMEND' | 'RECOMMEND_WITH_CONDITIONS' | 'DO_NOT_RECOMMEND';

export interface LoanAppraisalRequest {
  monthlyIncome: number;
  monthlyExpenses: number;
  existingMonthlyDebt: number;
  notes: string;
  recommendation: LoanAppraisalRecommendation;
  conditions: string[];
}

export interface LoanAppraisal extends LoanAppraisalRequest {
  loanId: number;
  policyVersion: number;
  disposableIncome: number;
  debtToIncomeRatio: number;
  appraisedBy: number;
  appraisedOn: string;
  version: number;
}

export type LoanApprovalAuthority = 'BRANCH_MANAGER' | 'CREDIT_COMMITTEE' | 'BOARD';
export type LoanApprovalDecision = 'APPROVED' | 'REJECTED' | 'CONDITIONAL';

export interface LoanApprovalDecisionRecord {
  caseVersion: number;
  authority: LoanApprovalAuthority;
  decision: LoanApprovalDecision;
  comments: string;
  conditions: string[] | string;
  conditionEvidence?: string[] | string;
  decidedBy: number;
  decidedOn: string;
}

export interface LoanApprovalCase {
  id: number;
  loanId: number;
  policyVersion: number;
  appraisalVersion: number;
  routedAmount: number;
  requiredAuthority: LoanApprovalAuthority;
  status: 'PENDING' | LoanApprovalDecision;
  createdBy: number;
  createdOn: string;
  lastDecidedBy?: number;
  lastDecidedOn?: string;
  version: number;
  decisions: LoanApprovalDecisionRecord[];
}

export interface LoanApprovalDecisionRequest {
  expectedVersion: number;
  decision: LoanApprovalDecision;
  comments: string;
  conditions: string[];
  conditionEvidence: string[];
}

export interface LoanCreditScoreFactor {
  code: string;
  weight: number;
  rawValue: number | string | boolean;
  normalizedScore: number;
  weightedScore: number;
  explanation: string;
}

export interface LoanCreditScore {
  loanId: number;
  policyVersion: number;
  appraisalVersion: number;
  totalScore: number;
  riskBand: string;
  outcome: string;
  calculatedBy: number;
  calculatedOn: string;
  facts: Record<string, number | string | boolean>;
  factors: LoanCreditScoreFactor[];
}

export type LoanDisbursementRail = 'ACCOUNT_CREDIT' | 'CASH' | 'CHEQUE' | 'MOBILE_MONEY';

export interface LoanDisbursementInstructionRequest {
  idempotencyKey: string;
  rail: LoanDisbursementRail;
  railDetails: Record<string, number | string>;
}

export interface LoanDisbursementInstruction extends LoanDisbursementInstructionRequest {
  id: number;
  loanId: number;
  status: 'READY' | 'CONSUMED' | string;
  approvalCaseId: number;
  approvalCaseVersion: number;
  creditScoreId: number;
  creditScoreVersion: number;
  grossAmount: number;
  chargesDueAtDisbursement: number;
  netAmount: number;
  currencyCode: string;
  feeSettlementMode: string;
  createdBy: number;
  createdOn: string;
  consumedBy?: number;
  consumedOn?: string;
  nativeTransactionId?: number;
}

export interface LoanApprovalQueueQuery {
  authority?: string;
  officeId?: number;
  page?: number;
  size?: number;
}

export interface LoanApprovalQueueItem {
  approvalCaseId: number;
  loanId: number;
  clientId: number;
  officeId: number;
  loanAccountNo: string;
  clientName: string;
  clientAccountNo: string;
  productName: string;
  officeName: string;
  currencyCode: string;
  routedAmount: number;
  proposedPrincipal: number;
  requiredAuthority: string;
  status: 'PENDING' | 'CONDITIONAL' | string;
  caseVersion: number;
  createdOn: string;
  lastDecidedOn?: string;
  lastDecidedBy?: number;
  totalScore?: number;
  riskBand?: string;
  scoreOutcome?: string;
  conditionCount: number;
  evidenceCount: number;
  isEvidenceReady: boolean;
}

export interface LoanApprovalQueueResponse {
  totalFilteredRecords: number;
  page: number;
  size: number;
  pageItems: LoanApprovalQueueItem[];
}
