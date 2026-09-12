/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Group profile update request payload.
 * Matches PUT /pewosa/group-lending/groups/{groupId}/profile schema.
 */
export interface PewosaGroupProfileRequest {
  registrationNumber?: string;
  registrationDate?: string;
  constitutionAdopted?: boolean;
  constitutionAdoptedDate?: string;
  trainingCompleted?: boolean;
  trainingCompletedDate?: string;
  trainerStaffId?: number;
  meetingFrequency?: string;
  meetingDayOfWeek?: string;
  cycleNumber?: number;
  socialFundSavingsAccountId?: number;
  groupSavingsAccountId?: number;
  minimumActiveMembers?: number;
  expectedVersion?: number;
}

/**
 * Group profile response payload.
 * Matches GET /pewosa/group-lending/groups/{groupId}/profile schema.
 */
export interface PewosaGroupProfileResponse {
  groupId: number;
  registrationNumber?: string;
  registrationDate?: string;
  constitutionAdopted?: boolean;
  constitutionAdoptedDate?: string;
  trainingCompleted?: boolean;
  trainingCompletedDate?: string;
  trainerStaffId?: number;
  trainerStaffName?: string;
  meetingFrequency?: string;
  meetingDayOfWeek?: string;
  cycleNumber?: number;
  socialFundSavingsAccountId?: number;
  groupSavingsAccountId?: number;
  minimumActiveMembers?: number;
  version: number;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
}

/**
 * Group eligibility evaluation request payload.
 * Matches POST /pewosa/group-lending/groups/{groupId}/eligibility schema.
 */
export interface PewosaGroupEligibilityRequest {
  loanProductId: number;
  requestedTotalAmount: number;
}

/**
 * Authoritative facts snapshot captured during eligibility evaluation.
 */
export interface PewosaGroupEligibilityFactsSnapshot {
  groupAgeMonths: number;
  activeMemberCount: number;
  totalGroupSavings: number;
  hasConstitution: boolean;
  hasCompletedTraining: boolean;
  activeDelinquentMemberCount: number;
  meetingAttendanceRate: number;
  appointedRoles: string[];
  lookbackMeetingsCount: number;
}

/**
 * Individual policy rule evaluation result.
 */
export interface PewosaGroupEligibilityRule {
  code: string;
  description: string;
  policyThreshold: string;
  actualValue: string;
  passed: boolean;
  message: string;
}

/**
 * Group eligibility evaluation response payload.
 * Matches POST|GET /pewosa/group-lending/groups/{groupId}/eligibility schema.
 */
export interface PewosaGroupEligibilityResponse {
  reference: string;
  groupId: number;
  groupName: string;
  loanProductId: number;
  loanProductName: string;
  policyVersion: number;
  requestedTotalAmount: number;
  evaluatedOn: string;
  evaluatedBy: string;
  eligible: boolean;
  overallOutcome: string;
  factsSnapshot: PewosaGroupEligibilityFactsSnapshot;
  rules: PewosaGroupEligibilityRule[];
}

/**
 * Group evidence upload/submission request payload.
 */
export interface PewosaGroupEvidenceRequest {
  evidenceType: string;
  documentId?: number;
  stage?: string;
  notes?: string;
}

/**
 * Group evidence verification request payload (Maker-Checker).
 */
export interface PewosaGroupEvidenceVerificationRequest {
  decision: 'VERIFIED' | 'REJECTED';
  reason?: string;
}

/**
 * Group evidence response payload.
 */
export interface PewosaGroupEvidenceResponse {
  id: number;
  groupId: number;
  evidenceType: string;
  documentId?: number;
  fileName: string;
  contentType: string;
  stage: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  notes?: string;
  rejectionReason?: string;
  submittedBy: string;
  submittedDate: string;
  verifiedBy?: string;
  verifiedDate?: string;
}

/**
 * Group loan application request payload.
 */
export interface PewosaGroupLoanApplicationRequest {
  eligibilityReference: string;
  productId: number;
  requestedAmount: number;
  requestedTerm: number;
  repaymentFrequency?: string;
  purpose?: string;
  jointLiabilityAgreed: boolean;
}

export interface PewosaGroupLoanDecisionRequest {
  decision: 'APPROVE' | 'REJECT';
  approvedAmount?: number;
  notes?: string;
}

export interface PewosaGroupLoanAppraisal {
  totalMemberDebtCapacity?: number;
  groupRiskBand?: string;
  recommendation?: string;
}

export interface PewosaGroupLoanApproval {
  routedTo?: string;
  approvedBy?: string;
  approvalDate?: string;
  approvalNotes?: string;
}

/**
 * Group loan application response payload.
 */
export interface PewosaGroupLoanApplicationResponse {
  id: number;
  groupId: number;
  groupName: string;
  applicationReference: string;
  eligibilityReference: string;
  productId: number;
  productName: string;
  policyVersion: number;
  requestedAmount: number;
  approvedAmount?: number;
  term: number;
  status: string;
  jointLiabilityAgreed: boolean;
  createdDate: string;
  createdBy: string;
  appraisal?: PewosaGroupLoanAppraisal;
  approval?: PewosaGroupLoanApproval;
}

/**
 * Member loan distribution line item.
 */
export interface PewosaMemberDistributionItem {
  id?: number;
  clientId: number;
  clientName?: string;
  requestedAmount: number;
  approvedAmount: number;
  allocationWeight?: number;
  allocationMethod?: 'EQUAL' | 'PROPORTIONAL_TO_SAVINGS' | 'CUSTOM';
  purpose?: string;
  nativeLoanId?: number;
}

/**
 * Member loan distribution save request payload.
 */
export interface PewosaGroupLoanDistributionRequest {
  allocationMethod?: 'EQUAL' | 'PROPORTIONAL_TO_SAVINGS' | 'CUSTOM';
  purpose?: string;
  distributions?: {
    clientId: number;
    requestedAmount: number;
    approvedAmount: number;
    purpose?: string;
  }[];
}

export interface PewosaGroupLoanMaterializationRequest {
  loanTerms: Record<string, unknown>;
}

/**
 * Member loan distribution response payload with reconciliation summary.
 */
export interface PewosaGroupLoanDistributionResponse {
  applicationId: number;
  groupApprovedAmount: number;
  totalDistributedAmount: number;
  reconciled: boolean;
  memberCount: number;
  allocationMethod?: 'EQUAL' | 'PROPORTIONAL_TO_SAVINGS' | 'CUSTOM';
  distributions: PewosaMemberDistributionItem[];
}

export interface PewosaCollectiveRepaymentRequest {
  amount: number;
  paymentTypeId: number;
  transactionDate?: string;
  idempotencyKey: string;
}

export interface PewosaCollectiveRepaymentResponse {
  groupId: number;
  applicationId: number;
  idempotencyKey: string;
  status: 'COMPLETED';
  allocations: {
    client_id: number;
    loan_id: number;
    allocated_amount: number;
    native_loan_transaction_id: number;
  }[];
}

export interface PewosaGroupDefaultCase {
  id: number;
  applicationId: number;
  distributionId: number;
  defaultingClientId: number;
  defaultingClientName: string;
  defaultingLoanId: number;
  overdueSince: string;
  resolutionDueDate: string;
  daysInArrears: number;
  outstandingAmount: number;
  overdueAmount: number;
  escalationStage: 'NOTICE' | 'ESCALATED' | 'LOSS_RECOVERY';
  status: 'OPEN' | 'RESOLVED';
  firstDetectedOn: string;
  lastEvaluatedOn: string;
  resolvedOn?: string;
}

export interface PewosaGroupDefaultCasesResponse {
  groupId: number;
  lendingStatus: 'ACTIVE' | 'SUSPENDED_DEFAULT';
  count: number;
  cases: PewosaGroupDefaultCase[];
}

/**
 * Meeting attendance item.
 */
export interface PewosaMeetingAttendanceItem {
  clientId: number;
  attendanceTypeId: number;
}

/**
 * Group meeting record request payload.
 */
export interface PewosaGroupMeetingRequest {
  nativeMeetingId?: number;
  meetingDate: string;
  minutesSummary?: string;
  resolutions?: string[];
  depositSlipRef?: string;
  bankAccountRef?: string;
  depositDate?: string;
  attendance?: PewosaMeetingAttendanceItem[];
}

/**
 * Group meeting response payload.
 */
export interface PewosaGroupMeetingResponse {
  id: number;
  groupId: number;
  nativeMeetingId?: number;
  meetingDate: string;
  minutesSummary?: string;
  resolutions?: string[];
  depositSlipRef?: string;
  bankAccountRef?: string;
  depositDate?: string;
  attendance?: PewosaMeetingAttendanceItem[];
  createdDate?: string;
}

/**
 * Meeting transaction item request.
 */
export interface PewosaMeetingTransactionItemRequest {
  type: 'LOAN_REPAYMENT' | 'SAVINGS_DEPOSIT' | 'SOCIAL_FUND' | 'FINE';
  clientId: number;
  loanId?: number;
  savingsAccountId?: number;
  clientChargeId?: number;
  amount: number;
  paymentTypeId?: number;
  reason?: string;
}

/**
 * Batch meeting transaction request payload.
 */
export interface PewosaGroupMeetingTransactionRequest {
  idempotencyKey: string;
  transactionDate?: string;
  items: PewosaMeetingTransactionItemRequest[];
}

/**
 * Posted transaction item response.
 */
export interface PewosaPostedTransactionItem {
  type: string;
  clientId: number;
  loanId?: number;
  savingsAccountId?: number;
  nativeLoanTransactionId?: number;
  nativeSavingsTransactionId?: number;
  nativeChargeTransactionId?: number;
  amount: number;
  status: string;
}

/**
 * Meeting transaction batch response payload.
 */
export interface PewosaGroupMeetingTransactionResponse {
  meetingId: number;
  idempotencyKey: string;
  status: string;
  processedItemsCount: number;
  totalAmountCollected: number;
  postedTransactions: PewosaPostedTransactionItem[];
}

/**
 * Group account references for exposure.
 */
export interface PewosaGroupAccountReferences {
  groupSavingsAccountId?: number;
  socialFundSavingsAccountId?: number;
}

/**
 * Aggregate exposure summary.
 */
export interface PewosaGroupExposureSummary {
  totalOriginalPrincipal: number;
  totalOutstandingPrincipal: number;
  totalOutstandingInterest: number;
  totalOverdueAmount: number;
  membersInArrearsCount: number;
  nativeGroupSavingsBalance: number | null;
  nativeSocialFundBalance: number | null;
  collectiveLiabilityRatio: number | null;
}

/**
 * Member exposure line item.
 */
export interface PewosaMemberExposureItem {
  clientId: number;
  clientName: string;
  activeLoanId?: number;
  originalPrincipal: number;
  outstandingBalance: number;
  overdueAmount: number;
  daysInArrears: number;
  savingsBalance: number;
  jointGuarantorExposure: number | null;
}

/**
 * Group exposure response payload.
 */
export interface PewosaGroupExposureResponse {
  groupId: number;
  groupName: string;
  currency: string;
  asOfDate: string;
  nativeAccountReferences?: PewosaGroupAccountReferences;
  summary: PewosaGroupExposureSummary;
  memberExposure: PewosaMemberExposureItem[];
}

/**
 * Default recovery execution request payload.
 */
export interface PewosaGroupRecoveryRequest {
  defaultingClientId: number;
  defaultingLoanId: number;
  recoveryAmount: number;
  recoverySource: string;
  sourceSavingsAccountId: number;
  comments?: string;
  expectedVersion: number;
  idempotencyKey: string;
}

/**
 * Default recovery response payload.
 */
export interface PewosaGroupRecoveryResponse {
  recoveryId: number;
  groupId: number;
  defaultingClientId: number;
  defaultingLoanId: number;
  recoveredAmount: number;
  recoverySource: string;
  sourceSavingsAccountId: number;
  nativeSavingsTransactionId?: number;
  nativeLoanTransactionId?: number;
  updatedLoanOutstandingBalance?: number;
  updatedSourceSavingsBalance?: number;
  actionDate: string;
  performedBy: string;
  status: string;
}
