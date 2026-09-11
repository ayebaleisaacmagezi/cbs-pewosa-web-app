/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type TellerTransactionAction =
  | 'deposit'
  | 'withdrawal'
  | 'loanRepayment'
  | 'loanDisbursement'
  | 'shares'
  | 'fee';

export type TellerOperationType =
  | 'SAVINGS_DEPOSIT'
  | 'SAVINGS_WITHDRAWAL'
  | 'LOAN_REPAYMENT'
  | 'LOAN_DISBURSEMENT'
  | 'SHARE_PURCHASE'
  | 'CLIENT_CHARGE';

export type TellerPreflightDecision =
  | 'ALLOWED'
  | 'REJECTED'
  | 'APPROVAL_REQUIRED'
  | 'CASH_RETURN_REQUIRED'
  | 'REPORT_REQUIRED';
export type TellerPaymentRail = 'CASH' | 'NON_CASH';

export interface TellerCurrency {
  code?: string;
  currencyCode?: string;
}

export interface TellerApiViolation {
  code: string;
  message?: string;
  parameterName?: string;
}

export interface TellerPreflightRequest {
  idempotencyKey: string;
  operationType: TellerOperationType;
  accountId: number;
  clientId?: number;
  amount: number;
  currencyCode: string;
  paymentTypeId?: number;
}

export interface TellerPreflightResponse {
  reference: string;
  idempotencyKey: string;
  operationType: TellerOperationType;
  decision: TellerPreflightDecision;
  accountId: number;
  clientId?: number;
  cashierId?: number;
  paymentTypeId?: number;
  paymentRail?: TellerPaymentRail;
  amount: number;
  currencyCode: string;
  accountStatus?: string;
  availableBalance?: number;
  minimumRequiredBalance?: number;
  drawerAvailable?: number;
  violations: TellerApiViolation[];
  checkedAt: string;
  replayed: boolean;
  approvalId?: number;
  complianceCaseReference?: string;
}

export interface TellerSharePurchaseRequest {
  reference: string;
  accountId: number;
  cashierId: number;
  requestedShares: number;
  amount: number;
  currencyCode: string;
}

export interface TellerSharePurchaseResponse {
  reference: string;
  status: string;
  accountId?: number;
  requestedShares?: number;
  amount?: number;
  currencyCode?: string;
  transaction?: TellerTransactionDetail;
}

export interface TellerFeePaymentRequest {
  reference: string;
  clientId: number;
  chargeId: number;
  cashierId: number;
  paymentTypeId: number;
  amount: number;
  currencyCode: string;
  locale?: string;
}

export interface TellerProductTransactionLink {
  transactionId?: number;
  entityType?: string;
  entityId?: number;
}

export interface TellerDrawerMovementLink {
  drawerMovementId?: number;
  cashierId?: number;
  direction?: 'INWARD' | 'OUTWARD';
  txnType?: string;
  transactionDate?: string;
  amount?: number;
  currencyCode?: string;
  entityType?: string;
  entityId?: number;
}

export interface TellerTransactionDetail extends TellerPreflightResponse {
  status: string;
  notificationStatus?: 'PENDING' | 'SENT' | 'FAILED' | string;
  productTransaction?: TellerProductTransactionLink;
  drawerMovement?: TellerDrawerMovementLink;
  audit?: Record<string, unknown>;
}

export interface TellerApiError {
  status: number;
  code: string;
  message: string;
  parameterName?: string;
  violations: TellerApiViolation[];
  retryable: boolean;
}

export interface TellerDrawerTransaction {
  id?: number;
  transactionId?: number;
  txnDate?: unknown;
  transactionDate?: unknown;
  txnNote?: string;
  note?: string;
  clientName?: string;
  entityName?: string;
  entityType?: string;
  transactionType?: string | { value?: string };
  amount?: number;
  txnAmount?: number;
  currency?: TellerCurrency | string;
  currencyCode?: string;
}

export interface TellerDrawerSummary {
  netCash?: number;
  sumCashAllocation?: number;
  sumInwardCash?: number;
  sumOutwardCash?: number;
  sumCashSettlement?: number;
  currency?: TellerCurrency | string;
  currencyCode?: string;
  cashierTransactions?: TellerDrawerTransaction[] | { pageItems?: TellerDrawerTransaction[] };
}

export interface TellerAuditData {
  createdBy?: number;
  createdAt?: string;
  lastModifiedBy?: number;
  lastModifiedAt?: string;
}

export interface TellerRule {
  id?: number;
  officeId?: number;
  currencyCode: string;
  operationType?: TellerOperationType;
  ruleType: string;
  minimumAmount?: number;
  maximumAmount?: number;
  numericValue?: number;
  requiredRole?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  active: boolean;
  audit?: TellerAuditData;
}

export type TellerApprovalDecision = 'APPROVE' | 'REJECT';

export interface TellerApproval {
  id: number;
  reference: string;
  status: string;
  workflowType?: 'SHARE_PURCHASE' | string;
  workflowStatus?: string;
  shareTransactionId?: number;
  operationType?: TellerOperationType;
  amount?: number;
  currencyCode?: string;
  requiredRole?: string;
  requestedBy?: number;
  audit?: TellerAuditData;
}

export interface TellerDenominationLine {
  denomination: number;
  quantity: number;
}

export interface TellerShift {
  reference: string;
  cashierId: number;
  currencyCode: string;
  status: 'OPEN' | 'STOPPED' | 'COUNTING' | 'PENDING_APPROVAL' | 'RECONCILED' | 'CLOSED';
  expectedCash?: number;
  physicalCash?: number;
  variance?: number;
  varianceType?: 'BALANCED' | 'SHORTAGE' | 'OVERAGE';
  denominations?: TellerDenominationLine[];
  explanation?: string;
  audit?: TellerAuditData;
}

export type TellerShiftAction = 'STOP' | 'COUNT' | 'SUBMIT' | 'APPROVE' | 'CLOSE';

export interface TellerCashMovement {
  reference: string;
  movementType: 'VAULT_TO_TELLER' | 'TELLER_TO_VAULT';
  cashierId: number;
  amount: number;
  currencyCode: string;
  denominations: TellerDenominationLine[];
  status: string;
  note?: string;
  audit?: TellerAuditData;
}

export interface TellerReversal {
  reference: string;
  originalReference: string;
  reason: string;
  status: string;
  reversalProductTransactionId?: number;
  audit?: TellerAuditData;
}

export interface TellerComplianceCase {
  reference: string;
  caseType: 'CTR' | 'STR' | string;
  status: string;
  transactionReference?: string;
  amount?: number;
  currencyCode?: string;
  evidence?: Record<string, unknown>;
  audit?: TellerAuditData;
}

export interface TellerBeneficiary {
  fullName: string;
  relationship: string;
  mobileNo?: string;
  allocationPercentage: number;
  active?: boolean;
}

export type TellerFinancialStepType =
  | 'MEMBERSHIP_FEE'
  | 'ANNUAL_SUBSCRIPTION'
  | 'MINIMUM_SHARES'
  | 'SAVINGS_OPENING'
  | 'INITIAL_DEPOSIT';

export interface TellerFinancialStep {
  id?: number;
  stepType: TellerFinancialStepType;
  status: 'PENDING' | 'POSTED' | 'WAIVED' | 'NOT_APPLICABLE';
  transactionReference?: string;
  coreEntityType?: string;
  coreEntityId?: number;
  amount?: number;
  currencyCode?: string;
  active?: boolean;
  recordedBy?: number;
  recordedOnUtc?: string;
}

export interface TellerOnboarding {
  reference: string;
  status: string;
  clientId?: number;
  nationalId?: string;
  mobileNo?: string;
  checklist: Record<string, boolean>;
  unavailableReason?: string;
  beneficiaries: TellerBeneficiary[];
  financialSteps?: TellerFinancialStep[];
  financialStepHistory?: TellerFinancialStep[];
  audit?: TellerAuditData;
}

export interface CashierTransactionDraft {
  action: TellerTransactionAction;
  savingsAccountId?: number | string;
  shareAccountId?: number | string;
  loanAccountId?: number | string;
  chargeId?: number | string;
  amount: number;
  netDisbursementAmount?: number;
  requestedShares: number;
  note?: string;
  identityMethod: string;
  slipReference?: string;
  slipVerified: boolean;
  amountVerified: boolean;
  countedAmount: number;
  cashAuthenticityVerified: boolean;
  signatureVerified: boolean;
  disbursementMode?: 'CASH' | 'CHEQUE' | 'DIRECT_TO_SAVINGS';
  chequeNumber?: string;
  bankName?: string;
  loanApprovalVerified?: boolean;
  collateralSecured?: boolean;
  loanDocumentsVerified?: boolean;
  member: string;
  clientId: number;
  accountId?: number | string;
  currencyCode: string;
  idempotencyKey: string;
  serverReference?: string;
}

export interface CashierMemberContext {
  id: number;
  displayName: string;
  accountNo?: string;
  officeName?: string;
}

export type TellerTransactionStage = 'member' | 'transaction' | 'review' | 'result';
export type TellerSubmissionStatus = 'idle' | 'ready' | 'submitting' | 'recovery-required' | 'submitted';

export interface CashierTransactionResult {
  reference: string;
  member: string;
  action: TellerTransactionAction | string;
  amount: number | string;
  grossAmount?: number;
  date: unknown;
  currencyCode: string;
  clientId?: number;
  loanAccountId?: number;
  notificationStatus?: string;
  status?: string;
  loanAllocation?: {
    principal: number;
    interest: number;
    fees: number;
    penalties: number;
    remainingBalance?: number;
  };
}

export interface CashierTransactionState {
  stage: TellerTransactionStage;
  submissionStatus: TellerSubmissionStatus;
  member?: CashierMemberContext;
  draft?: CashierTransactionDraft;
  result?: CashierTransactionResult;
}

export function resolveTellerCurrencyCode(sources: unknown[], fallback = ''): string {
  for (const source of sources) {
    if (typeof source === 'string' && source.trim()) {
      return source.trim();
    }

    if (!source || typeof source !== 'object') continue;
    const value = source as Record<string, unknown>;
    const directCode = value['currencyCode'] ?? value['code'];
    if (typeof directCode === 'string' && directCode.trim()) {
      return directCode.trim();
    }

    const currency = value['currency'];
    if (currency && typeof currency === 'object') {
      const nested = currency as Record<string, unknown>;
      const nestedCode = nested['code'] ?? nested['currencyCode'];
      if (typeof nestedCode === 'string' && nestedCode.trim()) {
        return nestedCode.trim();
      }
    }
  }

  return fallback;
}

export function extractTellerTransactionReference(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const value = response as Record<string, unknown>;
  const changes = value['changes'];
  const changedTransactionId =
    changes && typeof changes === 'object' ? (changes as Record<string, unknown>)['transactionId'] : null;
  const reference = value['reference'] ?? changedTransactionId ?? value['resourceId'] ?? value['transactionId'];
  return typeof reference === 'string' || typeof reference === 'number' ? String(reference) : null;
}
