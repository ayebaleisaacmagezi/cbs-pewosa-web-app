/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  LoanApprovalCase,
  LoanApprovalDecisionRequest,
  LoanApprovalQueueItem,
  LoanApprovalQueueQuery,
  LoanApprovalQueueResponse,
  LoanAppraisal,
  LoanAppraisalRequest,
  LoanCreditScore,
  LoanDisbursementInstruction,
  LoanDisbursementInstructionRequest,
  LoanDocumentChecklist,
  LoanPrequalificationRequest,
  LoanPrequalificationResult
} from './pewosa-loan-application.models';

@Injectable({ providedIn: 'root' })
export class PewosaLoanApplicationService {
  private readonly http = inject(HttpClient);
  private readonly basePath = '/pewosa/loan-applications';

  evaluatePrequalification(request: LoanPrequalificationRequest): Observable<LoanPrequalificationResult> {
    return this.http.post<LoanPrequalificationResult>(`${this.basePath}/prequalifications`, request);
  }

  getPrequalification(reference: string): Observable<LoanPrequalificationResult> {
    return this.http.get<LoanPrequalificationResult>(`${this.basePath}/prequalifications/${reference}`);
  }

  initializeDocumentChecklist(loanId: number, eligibilityReference?: string): Observable<LoanDocumentChecklist> {
    return this.http.post<LoanDocumentChecklist>(`${this.basePath}/${loanId}/document-checklist`, {
      eligibilityReference
    });
  }

  getDocumentChecklist(loanId: number): Observable<LoanDocumentChecklist> {
    return this.http.get<LoanDocumentChecklist>(`${this.basePath}/${loanId}/document-checklist`);
  }

  linkDocument(loanId: number, requirementCode: string, documentId: number): Observable<LoanDocumentChecklist> {
    return this.http.put<LoanDocumentChecklist>(`${this.basePath}/${loanId}/documents/${requirementCode}`, {
      documentId
    });
  }

  verifyDocument(
    loanId: number,
    requirementCode: string,
    decision: 'VERIFIED' | 'REJECTED',
    reason?: string
  ): Observable<LoanDocumentChecklist> {
    return this.http.post<LoanDocumentChecklist>(
      `${this.basePath}/${loanId}/documents/${requirementCode}/verification`,
      { decision, reason }
    );
  }

  validateDocumentGate(
    loanId: number,
    stage: 'SUBMISSION' | 'APPROVAL' | 'DISBURSEMENT'
  ): Observable<{ loanId: number; stage: string; allowed: boolean }> {
    return this.http.post<{ loanId: number; stage: string; allowed: boolean }>(
      `${this.basePath}/${loanId}/document-gates/${stage}`,
      {}
    );
  }

  getAppraisal(loanId: number): Observable<LoanAppraisal> {
    return this.http.get<LoanAppraisal>(`${this.basePath}/${loanId}/appraisal`);
  }

  createAppraisal(loanId: number, request: LoanAppraisalRequest): Observable<LoanAppraisal> {
    return this.http.post<LoanAppraisal>(`${this.basePath}/${loanId}/appraisal`, request);
  }

  updateAppraisal(loanId: number, request: LoanAppraisalRequest): Observable<LoanAppraisal> {
    return this.http.put<LoanAppraisal>(`${this.basePath}/${loanId}/appraisal`, request);
  }

  createApprovalCase(loanId: number): Observable<LoanApprovalCase> {
    return this.http.post<LoanApprovalCase>(`${this.basePath}/${loanId}/approval-case`, {});
  }

  getApprovalCase(loanId: number): Observable<LoanApprovalCase> {
    return this.http.get<LoanApprovalCase>(`${this.basePath}/${loanId}/approval-case`);
  }

  decideApproval(loanId: number, request: LoanApprovalDecisionRequest): Observable<LoanApprovalCase> {
    return this.http.post<LoanApprovalCase>(`${this.basePath}/${loanId}/approval-decisions`, request);
  }

  calculateCreditScore(loanId: number): Observable<LoanCreditScore> {
    return this.http.post<LoanCreditScore>(`${this.basePath}/${loanId}/credit-score`, {});
  }

  getCreditScore(loanId: number): Observable<LoanCreditScore> {
    return this.http.get<LoanCreditScore>(`${this.basePath}/${loanId}/credit-score`);
  }

  createDisbursementInstruction(
    loanId: number,
    request: LoanDisbursementInstructionRequest
  ): Observable<LoanDisbursementInstruction> {
    return this.http.post<LoanDisbursementInstruction>(`${this.basePath}/${loanId}/disbursement-instruction`, request);
  }

  getDisbursementInstruction(loanId: number): Observable<LoanDisbursementInstruction> {
    return this.http.get<LoanDisbursementInstruction>(`${this.basePath}/${loanId}/disbursement-instruction`);
  }

  executeDisbursementInstruction(
    loanId: number,
    instructionId: number,
    payload: Record<string, any> = {}
  ): Observable<LoanDisbursementInstruction> {
    return this.http.post<LoanDisbursementInstruction>(
      `${this.basePath}/${loanId}/disbursement-instruction/${instructionId}/execute`,
      payload
    );
  }

  getApprovalQueue(query: LoanApprovalQueueQuery = {}): Observable<LoanApprovalQueueResponse> {
    let params = new HttpParams();
    if (query.authority) {
      params = params.set('authority', query.authority);
    }
    if (query.officeId != null) {
      params = params.set('officeId', query.officeId.toString());
    }
    if (query.page != null) {
      params = params.set('page', query.page.toString());
    }
    if (query.size != null) {
      params = params.set('size', query.size.toString());
    }
    return this.http.get<LoanApprovalQueueResponse>(`${this.basePath}/approval-queue`, { params });
  }
}
