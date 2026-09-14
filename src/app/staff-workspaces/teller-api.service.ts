/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, catchError, of, throwError, timeout } from 'rxjs';

import { SUPPRESS_HTTP_ERROR_ALERT } from 'app/core/http/error-handler.interceptor';

import {
  TellerApiError,
  TellerApiViolation,
  CreatePewosaExpenseRequest,
  PayPewosaExpenseRequest,
  PewosaExpense,
  PewosaExpenseApproval,
  TellerApproval,
  TellerApprovalDecision,
  TellerCashMovement,
  TellerComplianceCase,
  TellerDenominationLine,
  TellerFeePaymentRequest,
  TellerOnboarding,
  TellerPreflightRequest,
  TellerPreflightResponse,
  TellerReversal,
  TellerRule,
  TellerShift,
  TellerShiftReport,
  TellerShiftAction,
  TellerSharePurchaseRequest,
  TellerSharePurchaseResponse,
  TellerTransactionDetail,
  extractTellerTransactionReference
} from './teller-api.models';

@Injectable({ providedIn: 'root' })
export class TellerApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly requestTimeoutMs = 30000;
  private readonly http = {
    get: <T>(url: string, options?: { params?: HttpParams; context?: HttpContext }): Observable<T> =>
      this.httpClient
        .get<T>(url, { ...options, context: this.suppressedErrorContext(options?.context) })
        .pipe(timeout(this.requestTimeoutMs)),
    post: <T>(url: string, body: unknown): Observable<T> =>
      this.httpClient
        .post<T>(url, body, { context: this.suppressedErrorContext() })
        .pipe(timeout(this.requestTimeoutMs))
  };
  private readonly basePath = '/pewosa/teller';

  createExpense(request: CreatePewosaExpenseRequest): Observable<PewosaExpense> {
    return this.http
      .post<PewosaExpense>(`${this.basePath}/expenses`, request)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  submitExpense(reference: string): Observable<PewosaExpense> {
    return this.http
      .post<PewosaExpense>(`${this.basePath}/expenses/${encodeURIComponent(reference)}/submit`, {})
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getExpense(reference: string): Observable<PewosaExpense> {
    return this.http
      .get<PewosaExpense>(`${this.basePath}/expenses/${encodeURIComponent(reference)}`)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getExpenses(filters: { status?: string; mine?: boolean } = {}): Observable<PewosaExpense[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.mine !== undefined) params = params.set('mine', String(filters.mine));
    return this.http
      .get<PewosaExpense[]>(`${this.basePath}/expenses`, { params })
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getExpenseApprovals(): Observable<PewosaExpenseApproval[]> {
    return this.http
      .get<PewosaExpenseApproval[]>(`${this.basePath}/expense-approvals`)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  decideExpenseApproval(
    approvalId: number,
    decision: 'APPROVE' | 'REJECT',
    note?: string
  ): Observable<PewosaExpenseApproval> {
    return this.http
      .post<PewosaExpenseApproval>(`${this.basePath}/expense-approvals/${approvalId}/decision`, { decision, note })
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  payExpense(reference: string, request: PayPewosaExpenseRequest): Observable<PewosaExpense> {
    return this.http
      .post<PewosaExpense>(`${this.basePath}/expenses/${encodeURIComponent(reference)}/payment`, request)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  preflight(request: TellerPreflightRequest): Observable<TellerPreflightResponse> {
    return this.http
      .post<TellerPreflightResponse>(`${this.basePath}/preflight`, request)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  purchaseShares(request: TellerSharePurchaseRequest): Observable<TellerSharePurchaseResponse> {
    return this.http
      .post<TellerSharePurchaseResponse>(`${this.basePath}/shares/purchase`, request)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  payFee(request: TellerFeePaymentRequest): Observable<TellerTransactionDetail> {
    return this.http
      .post<TellerTransactionDetail>(`${this.basePath}/fees/pay`, request)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getTransaction(reference: string): Observable<TellerTransactionDetail> {
    return this.http
      .get<TellerTransactionDetail>(`${this.basePath}/transactions/${encodeURIComponent(reference)}`)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getRules(
    filters: { officeId?: number; currencyCode?: string; operationType?: string } = {}
  ): Observable<TellerRule[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(
      ([
        key,
        value
      ]) => {
        if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
      }
    );
    return this.http
      .get<TellerRule[]>(`${this.basePath}/rules`, { params })
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  saveRule(rule: TellerRule): Observable<TellerRule> {
    return this.http
      .post<TellerRule>(`${this.basePath}/rules`, rule)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getApprovals(status = 'PENDING'): Observable<TellerApproval[]> {
    return this.http
      .get<TellerApproval[]>(`${this.basePath}/approvals`, { params: new HttpParams().set('status', status) })
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  decideApproval(id: number, decision: TellerApprovalDecision, note?: string): Observable<TellerApproval> {
    return this.http
      .post<TellerApproval>(`${this.basePath}/approvals/${id}/decision`, { decision, note })
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  openShift(cashierId: number, currencyCode: string): Observable<TellerShift> {
    return this.http
      .post<TellerShift>(`${this.basePath}/shifts`, { cashierId, currencyCode })
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  updateShift(
    reference: string,
    action: TellerShiftAction,
    data: { denominations?: TellerDenominationLine[]; explanation?: string } = {}
  ): Observable<TellerShift> {
    return this.http
      .post<TellerShift>(`${this.basePath}/shifts/${encodeURIComponent(reference)}/${action}`, data)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getShift(reference: string): Observable<TellerShift> {
    return this.http
      .get<TellerShift>(`${this.basePath}/shifts/${encodeURIComponent(reference)}`)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getActiveShift(cashierId: number, currencyCode: string): Observable<TellerShift | null> {
    const params = new HttpParams().set('cashierId', cashierId).set('currencyCode', currencyCode);
    const context = new HttpContext().set(SUPPRESS_HTTP_ERROR_ALERT, true);
    return this.http.get<TellerShift | null>(`${this.basePath}/shifts/active`, { params, context }).pipe(
      catchError((error: unknown) => {
        const mappedError = this.mapError(error);
        return mappedError.status === 404 ? of(null) : throwError(() => mappedError);
      })
    );
  }

  getShiftReports(reference: string): Observable<TellerShiftReport> {
    return this.http
      .get<TellerShiftReport>(`${this.basePath}/shifts/${encodeURIComponent(reference)}/reports`)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  createCashMovement(data: Omit<TellerCashMovement, 'reference' | 'status' | 'audit'>): Observable<TellerCashMovement> {
    return this.http
      .post<TellerCashMovement>(`${this.basePath}/cash-movements`, data)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getCashMovements(status = 'PENDING', notFoundAsEmpty = false): Observable<TellerCashMovement[]> {
    const context = notFoundAsEmpty ? new HttpContext().set(SUPPRESS_HTTP_ERROR_ALERT, true) : new HttpContext();
    return this.http
      .get<TellerCashMovement[]>(`${this.basePath}/cash-movements`, {
        params: new HttpParams().set('status', status),
        context
      })
      .pipe(
        catchError((error: unknown) => {
          const mappedError = this.mapError(error);
          return notFoundAsEmpty && mappedError.status === 404 ? of([]) : throwError(() => mappedError);
        })
      );
  }

  updateCashMovement(
    reference: string,
    action: 'VERIFY' | 'ACKNOWLEDGE',
    note?: string
  ): Observable<TellerCashMovement> {
    return this.http
      .post<TellerCashMovement>(`${this.basePath}/cash-movements/${encodeURIComponent(reference)}/${action}`, { note })
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getCashMovement(reference: string): Observable<TellerCashMovement> {
    return this.http
      .get<TellerCashMovement>(`${this.basePath}/cash-movements/${encodeURIComponent(reference)}`)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  requestReversal(originalReference: string, reason: string): Observable<TellerReversal> {
    return this.http
      .post<TellerReversal>(`${this.basePath}/reversals`, { originalReference, reason })
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  updateReversal(
    reference: string,
    action: 'APPROVE' | 'REJECT' | 'COMPLETE',
    data: { note?: string; reversalProductTransactionId?: number } = {}
  ): Observable<TellerReversal> {
    return this.http
      .post<TellerReversal>(`${this.basePath}/reversals/${encodeURIComponent(reference)}/${action}`, data)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getReversal(reference: string): Observable<TellerReversal> {
    return this.http
      .get<TellerReversal>(`${this.basePath}/reversals/${encodeURIComponent(reference)}`)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getComplianceCases(status = 'OPEN'): Observable<TellerComplianceCase[]> {
    return this.http
      .get<TellerComplianceCase[]>(`${this.basePath}/compliance-cases`, {
        params: new HttpParams().set('status', status)
      })
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  decideComplianceCase(
    reference: string,
    data: { decision?: string; status: string; note?: string; evidence?: Record<string, unknown> }
  ): Observable<TellerComplianceCase> {
    return this.http
      .post<TellerComplianceCase>(`${this.basePath}/compliance-cases/${encodeURIComponent(reference)}/decision`, data)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  startOnboarding(data: {
    nationalId: string;
    mobileNo: string;
    checklist: Record<string, boolean>;
  }): Observable<TellerOnboarding> {
    return this.http
      .post<TellerOnboarding>(`${this.basePath}/onboarding`, data)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  saveOnboarding(
    reference: string,
    data: Partial<Omit<TellerOnboarding, 'reference' | 'status' | 'audit'>>
  ): Observable<TellerOnboarding> {
    return this.http
      .post<TellerOnboarding>(`${this.basePath}/onboarding/${encodeURIComponent(reference)}`, data)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  completeOnboarding(reference: string): Observable<TellerOnboarding> {
    return this.http
      .post<TellerOnboarding>(`${this.basePath}/onboarding/${encodeURIComponent(reference)}/complete`, {})
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  getOnboarding(reference: string): Observable<TellerOnboarding> {
    return this.http
      .get<TellerOnboarding>(`${this.basePath}/onboarding/${encodeURIComponent(reference)}`)
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  requireAllowed(response: TellerPreflightResponse): TellerPreflightResponse {
    if (response.decision === 'ALLOWED') return response;
    const firstViolation = response.violations[0];
    const decisionMessages: Partial<Record<TellerPreflightResponse['decision'], string>> = {
      APPROVAL_REQUIRED: `Approval is required before posting. Request reference: ${response.reference}`,
      CASH_RETURN_REQUIRED: `The teller must return excess cash before posting. Reference: ${response.reference}`,
      REPORT_REQUIRED: `Required compliance information must be completed before posting. Case: ${response.complianceCaseReference || response.reference}`
    };
    throw {
      status: 422,
      code: firstViolation?.code || 'TELLER_PREFLIGHT_REJECTED',
      message:
        firstViolation?.message || decisionMessages[response.decision] || 'Teller preflight rejected the transaction',
      parameterName: firstViolation?.parameterName,
      violations: response.violations,
      retryable: false
    } satisfies TellerApiError;
  }

  transactionReference(response: unknown): string | null {
    return extractTellerTransactionReference(response);
  }

  mapError(error: unknown): TellerApiError {
    if (this.isTellerApiError(error)) return error;
    if (error instanceof TimeoutError) {
      return {
        status: 408,
        code: 'TELLER_REQUEST_TIMEOUT',
        message: 'The request is taking too long. Check your connection and try again.',
        violations: [],
        retryable: true
      };
    }
    const response = error instanceof HttpErrorResponse ? error : null;
    const body = response?.error && typeof response.error === 'object' ? response.error : {};
    const bodyRecord = body as Record<string, unknown>;
    const nestedErrors = Array.isArray(bodyRecord['errors']) ? bodyRecord['errors'] : [];
    const violations: TellerApiViolation[] = nestedErrors.map((item: unknown) => {
      const violation = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        code: String(violation['userMessageGlobalisationCode'] ?? violation['code'] ?? 'TELLER_REQUEST_FAILED'),
        message: this.stringValue(violation['defaultUserMessage'] ?? violation['developerMessage']),
        parameterName: this.stringValue(violation['parameterName'])
      };
    });
    const firstViolation = violations[0];
    const status = response?.status ?? 0;

    const backendMessage =
      this.stringValue(bodyRecord['defaultUserMessage'] ?? bodyRecord['developerMessage']) ??
      firstViolation?.message ??
      (error instanceof Error ? error.message : undefined) ??
      response?.message;

    return {
      status,
      code: String(
        bodyRecord['code'] ??
          bodyRecord['userMessageGlobalisationCode'] ??
          firstViolation?.code ??
          'TELLER_REQUEST_FAILED'
      ),
      message: this.friendlyErrorMessage(status, backendMessage),
      parameterName: firstViolation?.parameterName,
      violations,
      retryable: status === 0 || status === 408 || status === 429 || status >= 500
    };
  }

  private friendlyErrorMessage(status: number, backendMessage?: string): string {
    if (status === 0)
      return 'The server could not be reached. No changes were made. Check your connection and try again.';
    if (status === 401) return 'Your session has expired. Sign in again to continue.';
    if (status === 403 || /no authority|not authorized|permission/i.test(backendMessage ?? '')) {
      return 'You do not have permission to perform this action. Contact an administrator.';
    }
    if (status === 404) return 'The requested record could not be found. Refresh the page and try again.';
    if (status === 408) return 'The request is taking too long. Check your connection and try again.';
    if (status === 409)
      return 'This request may already have been submitted. Check the transaction history before retrying.';
    if (status === 429) return 'Too many requests were sent. Wait a moment and try again.';
    if (status >= 500) return 'The server could not complete this request. No changes were made. Try again.';
    return backendMessage || 'Something went wrong. No changes were made. Review the details and try again.';
  }

  private suppressedErrorContext(context = new HttpContext()): HttpContext {
    return context.set(SUPPRESS_HTTP_ERROR_ALERT, true);
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private isTellerApiError(error: unknown): error is TellerApiError {
    if (!error || typeof error !== 'object') return false;
    const value = error as Partial<TellerApiError>;
    return (
      typeof value.status === 'number' &&
      typeof value.code === 'string' &&
      typeof value.message === 'string' &&
      Array.isArray(value.violations) &&
      typeof value.retryable === 'boolean'
    );
  }
}
