/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type LoanWorkQueueBucket = 'PORTFOLIO' | 'DUE_SOON' | 'OVERDUE';

export interface LoanWorkQueueQuery {
  bucket: LoanWorkQueueBucket;
  officeId?: number;
  loanOfficerId?: number;
  dueFrom?: string;
  dueTo?: string;
  minOverdueDays?: number;
  maxOverdueDays?: number;
  classification?: string;
  riskBand?: string;
  page?: number;
  size?: number;
}

export interface LoanWorkQueueItem {
  loanId: number;
  accountNo: string;
  loanVersion: number;
  clientId: number;
  clientName: string;
  officeId: number;
  officeName: string;
  loanOfficerId?: number;
  loanOfficerName?: string;
  productName: string;
  principalDisbursed: number;
  totalOutstanding: number;
  principalOutstanding: number;
  interestOutstanding: number;
  feeOutstanding: number;
  penaltyOutstanding: number;
  currencyCode: string;
  nextPaymentDueDate?: string;
  nextPaymentAmount?: number;
  daysInArrears: number;
  classification: string;
  riskBand?: string;
  loanStatus: string;
  bucket: LoanWorkQueueBucket;
}

export interface LoanWorkQueueResponse {
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  content: LoanWorkQueueItem[];
}

export interface LoanServicingEligibleActions {
  canRestructure: boolean;
  canWriteOff: boolean;
  canRecover: boolean;
  canReleaseSecurity: boolean;
  canClose: boolean;
}

export interface LoanServicingSummary {
  loanId: number;
  accountNo: string;
  loanVersion: number;
  clientId: number;
  clientName: string;
  officeId: number;
  officeName: string;
  loanOfficerId?: number;
  loanOfficerName?: string;
  loanStatus: string;
  currencyCode: string;
  principalDisbursed: number;
  principalPaid: number;
  principalWrittenOff: number;
  principalOutstanding: number;
  principalOverdue: number;
  interestCharged: number;
  interestPaid: number;
  interestWaived: number;
  interestWrittenOff: number;
  interestOutstanding: number;
  interestOverdue: number;
  feeChargesCharged: number;
  feeChargesPaid: number;
  feeChargesWaived: number;
  feeChargesWrittenOff: number;
  feeChargesOutstanding: number;
  feeChargesOverdue: number;
  penaltyChargesCharged: number;
  penaltyChargesPaid: number;
  penaltyChargesWaived: number;
  penaltyChargesWrittenOff: number;
  penaltyChargesOutstanding: number;
  penaltyChargesOverdue: number;
  totalExpectedRepayment: number;
  totalRepayment: number;
  totalOutstanding: number;
  totalOverdue: number;
  daysInArrears: number;
  classification: string;
  provisionPercentage: number;
  provisionAmount: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  nextPaymentDueDate?: string;
  nextPaymentAmount?: number;
  repaymentAllocationPolicy: string;
  eligibleActions: LoanServicingEligibleActions;
}

export interface LoanServicingTimelineEvent {
  eventId: string;
  eventType: string;
  eventDate: string;
  submittedOnDate: string;
  amount?: number;
  principalPortion?: number;
  interestPortion?: number;
  feePortion?: number;
  penaltyPortion?: number;
  outstandingBalanceAfter?: number;
  referenceNumber?: string;
  description: string;
  isReversed: boolean;
  createdByName?: string;
}

export interface LoanServicingTimelineResponse {
  loanId: number;
  totalElements: number;
  page: number;
  size: number;
  events: LoanServicingTimelineEvent[];
}

export interface RestructuringProposalRequest {
  expectedLoanVersion: number;
  reason: string;
  explanation?: string;
  rescheduleFromDate: string;
  graceOnPrincipal?: number | null;
  graceOnInterest?: number | null;
  extraTerms?: number | null;
  newInterestRate?: number | null;
  evidenceDocumentIds?: (number | string)[];
}

export interface RestructuringTermsSnapshot {
  principalOutstanding: number;
  interestOutstanding: number;
  feeOutstanding: number;
  penaltyOutstanding: number;
  termRemainingMonths?: number;
  nominalInterestRate?: number;
}

export interface ProposedTerms {
  rescheduleFromDate: string;
  graceOnPrincipal?: number | null;
  graceOnInterest?: number | null;
  extraTerms?: number | null;
  newInterestRate?: number | null;
}

export interface RestructuringProposal {
  proposalId: number;
  loanId: number;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  version: number;
  reason?: string;
  explanation?: string;
  originalTermsSnapshot?: RestructuringTermsSnapshot;
  proposedTerms?: ProposedTerms;
  evidenceDocumentIds?: (number | string)[];
  submittedBy?: number | string;
  submittedByName?: string;
  submittedOnUtc?: string;
  decisions?: any[];
}

export interface RestructuringDecisionRequest {
  expectedProposalVersion: number;
  decision: 'APPROVED' | 'REJECTED';
  comments?: string;
  conditions?: string[];
}

export interface RestructuringDecisionResponse {
  proposalId: number;
  loanId: number;
  status: string;
  version: number;
  decidedBy?: number;
  decidedByName?: string;
  decidedOnUtc?: string;
  decision: string;
  comments?: string;
}

export interface RestructuringExecutionRequest {
  expectedProposalVersion: number;
  expectedLoanVersion: number;
  rescheduleReasonId: number;
  idempotencyKey: string;
  executionDate: string;
}

export interface RestructuringExecutionResponse {
  proposalId: number;
  loanId: number;
  status: string;
  nativeRescheduleRequestId?: number;
  executedOnUtc?: string;
  postOperationLoanStatus?: string;
  postOperationDaysInArrears?: number;
  postOperationDelinquencyClassification?: string;
  newScheduleInstallmentCount?: number;
  newOutstandingBalance?: number;
}

export interface LoanWriteOffRequest {
  expectedLoanVersion: number;
  idempotencyKey: string;
  transactionDate: string;
  reason: string;
  governanceReference: string;
  explanation: string;
  evidenceDocumentIds?: (number | string)[];
}

export interface LoanWriteOffResponse {
  loanId: number;
  nativeTransactionId?: number;
  writtenOffPrincipal?: number;
  writtenOffInterest?: number;
  writtenOffFee?: number;
  writtenOffPenalty?: number;
  totalWrittenOff?: number;
  status: string;
  writtenOffOn: string;
}

export interface LoanRecoveryRequest {
  expectedLoanVersion: number;
  idempotencyKey: string;
  transactionDate: string;
  amount: number;
  paymentTypeId?: number;
  receiptNumber?: string;
  notes?: string;
}

export interface LoanRecoveryResponse {
  loanId: number;
  recoveryTransactionId?: number;
  amount: number;
  transactionDate: string;
  totalRecoveredToDate?: number;
  receiptNumber?: string;
}

export interface UnreleasedSecurity {
  securityType: 'COLLATERAL' | 'GUARANTOR';
  securityId: number;
  securityVersion: number;
  description: string;
  isReleased: boolean;
}

export interface LoanClosureReadiness {
  loanId: number;
  accountNo: string;
  currencyCode: string;
  loanVersion: number;
  loanStatus: string;
  totalOutstanding: number;
  principalOutstanding: number;
  interestOutstanding: number;
  feeOutstanding: number;
  penaltyOutstanding: number;
  isFullyPaid: boolean;
  unreleasedSecuritiesCount: number;
  unreleasedSecurities: UnreleasedSecurity[];
  readyForClosure: boolean;
  blockingReasons: string[];
  securityReleaseAllowed: boolean;
  securityReleaseFailedRules: string[];
}

export interface SecurityReleaseRequest {
  expectedLoanVersion: number;
  expectedSecurityVersion: number;
  idempotencyKey: string;
  releaseReason: string;
  releaseNotes: string;
  acknowledgementDocumentId?: number | string;
}

export interface SecurityReleaseResponse {
  loanId: number;
  securityType: 'COLLATERAL' | 'GUARANTOR';
  securityId: number;
  isReleased: boolean;
  releasedOnUtc: string;
  releasedByName?: string;
}

export interface LoanCloseRequest {
  expectedLoanVersion: number;
  idempotencyKey: string;
  closureDate: string;
  closureNotes: string;
}

export interface LoanCloseResponse {
  loanId: number;
  accountNo: string;
  loanStatus: string;
  closedOnDate: string;
  closedByName?: string;
}
