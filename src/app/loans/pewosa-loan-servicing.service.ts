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
  LoanCloseRequest,
  LoanCloseResponse,
  LoanClosureReadiness,
  LoanRecoveryRequest,
  LoanRecoveryResponse,
  LoanServicingSummary,
  LoanServicingTimelineResponse,
  LoanWorkQueueQuery,
  LoanWorkQueueResponse,
  LoanWriteOffRequest,
  LoanWriteOffResponse,
  RestructuringDecisionRequest,
  RestructuringDecisionResponse,
  RestructuringExecutionRequest,
  RestructuringExecutionResponse,
  RestructuringProposal,
  RestructuringProposalRequest,
  SecurityReleaseRequest,
  SecurityReleaseResponse
} from './pewosa-loan-servicing.models';

@Injectable({ providedIn: 'root' })
export class PewosaLoanServicingService {
  private readonly http = inject(HttpClient);
  private readonly basePath = '/pewosa/loan-servicing';

  getWorkQueue(query: LoanWorkQueueQuery): Observable<LoanWorkQueueResponse> {
    let params = new HttpParams().set('bucket', query.bucket);

    if (query.officeId != null) {
      params = params.set('officeId', query.officeId.toString());
    }
    if (query.loanOfficerId != null) {
      params = params.set('loanOfficerId', query.loanOfficerId.toString());
    }
    if (query.dueFrom) {
      params = params.set('dueFrom', query.dueFrom);
    }
    if (query.dueTo) {
      params = params.set('dueTo', query.dueTo);
    }
    if (query.minOverdueDays != null) {
      params = params.set('minOverdueDays', query.minOverdueDays.toString());
    }
    if (query.maxOverdueDays != null) {
      params = params.set('maxOverdueDays', query.maxOverdueDays.toString());
    }
    if (query.classification) {
      params = params.set('classification', query.classification);
    }
    if (query.riskBand) {
      params = params.set('riskBand', query.riskBand);
    }
    if (query.page != null) {
      params = params.set('page', query.page.toString());
    }
    if (query.size != null) {
      params = params.set('size', query.size.toString());
    }

    return this.http.get<LoanWorkQueueResponse>(`${this.basePath}/work-queue`, { params });
  }

  getLoanServicingSummary(loanId: number): Observable<LoanServicingSummary> {
    return this.http.get<LoanServicingSummary>(`${this.basePath}/loans/${loanId}/summary`);
  }

  getLoanServicingTimeline(loanId: number, page = 0, size = 50): Observable<LoanServicingTimelineResponse> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    return this.http.get<LoanServicingTimelineResponse>(`${this.basePath}/loans/${loanId}/timeline`, { params });
  }

  submitRestructuringProposal(loanId: number, payload: RestructuringProposalRequest): Observable<RestructuringProposal> {
    return this.http.post<RestructuringProposal>(`${this.basePath}/loans/${loanId}/restructuring-proposals`, payload);
  }

  getRestructuringProposal(loanId: number, proposalId: number): Observable<RestructuringProposal> {
    return this.http.get<RestructuringProposal>(
      `${this.basePath}/loans/${loanId}/restructuring-proposals/${proposalId}`
    );
  }

  recordProposalDecision(
    loanId: number,
    proposalId: number,
    payload: RestructuringDecisionRequest
  ): Observable<RestructuringDecisionResponse> {
    return this.http.post<RestructuringDecisionResponse>(
      `${this.basePath}/loans/${loanId}/restructuring-proposals/${proposalId}/decisions`,
      payload
    );
  }

  executeRestructuringProposal(
    loanId: number,
    proposalId: number,
    payload: RestructuringExecutionRequest
  ): Observable<RestructuringExecutionResponse> {
    return this.http.post<RestructuringExecutionResponse>(
      `${this.basePath}/loans/${loanId}/restructuring-proposals/${proposalId}/execute`,
      payload
    );
  }

  executeWriteOff(loanId: number, payload: LoanWriteOffRequest): Observable<LoanWriteOffResponse> {
    return this.http.post<LoanWriteOffResponse>(`${this.basePath}/loans/${loanId}/write-offs`, payload);
  }

  recordRecovery(loanId: number, payload: LoanRecoveryRequest): Observable<LoanRecoveryResponse> {
    return this.http.post<LoanRecoveryResponse>(`${this.basePath}/loans/${loanId}/recoveries`, payload);
  }

  getClosureReadiness(loanId: number): Observable<LoanClosureReadiness> {
    return this.http.get<LoanClosureReadiness>(`${this.basePath}/loans/${loanId}/closure-readiness`);
  }

  releaseSecurity(
    loanId: number,
    securityType: 'COLLATERAL' | 'GUARANTOR',
    securityId: number,
    payload: SecurityReleaseRequest
  ): Observable<SecurityReleaseResponse> {
    return this.http.post<SecurityReleaseResponse>(
      `${this.basePath}/loans/${loanId}/securities/${securityType}/${securityId}/release`,
      payload
    );
  }

  closeLoan(loanId: number, payload: LoanCloseRequest): Observable<LoanCloseResponse> {
    return this.http.post<LoanCloseResponse>(`${this.basePath}/loans/${loanId}/close`, payload);
  }
}
