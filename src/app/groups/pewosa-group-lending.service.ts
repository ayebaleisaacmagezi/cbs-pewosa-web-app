/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PewosaGroupProfileRequest,
  PewosaGroupProfileResponse,
  PewosaGroupEligibilityRequest,
  PewosaGroupEligibilityResponse,
  PewosaGroupEvidenceRequest,
  PewosaGroupEvidenceVerificationRequest,
  PewosaGroupEvidenceResponse,
  PewosaGroupLoanApplicationRequest,
  PewosaGroupLoanApplicationResponse,
  PewosaGroupLoanDistributionRequest,
  PewosaGroupLoanDistributionResponse,
  PewosaGroupMeetingRequest,
  PewosaGroupMeetingResponse,
  PewosaGroupMeetingTransactionRequest,
  PewosaGroupMeetingTransactionResponse,
  PewosaGroupExposureResponse,
  PewosaGroupRecoveryRequest,
  PewosaGroupRecoveryResponse
} from './pewosa-group-lending.models';

/**
 * Service providing transport for PEWOSA Group Lending operations (D1-D4).
 * Communicates with Fineract resource @Path("/v1/pewosa/group-lending").
 */
@Injectable({
  providedIn: 'root'
})
export class PewosaGroupLendingService {
  private http = inject(HttpClient);

  /**
   * Base API path for PEWOSA group-lending endpoints.
   * Angular HTTP interceptors prepend the root /fineract-provider/api/v1 prefix.
   */
  private basePath(groupId: number | string): string {
    return `/pewosa/group-lending/groups/${groupId}`;
  }

  // ==========================================
  // D1: Profile & Governance
  // ==========================================

  getGroupProfile(groupId: number | string): Observable<PewosaGroupProfileResponse> {
    return this.http.get<PewosaGroupProfileResponse>(`${this.basePath(groupId)}/profile`);
  }

  updateGroupProfile(
    groupId: number | string,
    profile: PewosaGroupProfileRequest
  ): Observable<PewosaGroupProfileResponse> {
    return this.http.put<PewosaGroupProfileResponse>(`${this.basePath(groupId)}/profile`, profile);
  }

  // ==========================================
  // D1: Eligibility Evaluation
  // ==========================================

  createEligibility(
    groupId: number | string,
    request: PewosaGroupEligibilityRequest
  ): Observable<PewosaGroupEligibilityResponse> {
    return this.http.post<PewosaGroupEligibilityResponse>(
      `${this.basePath(groupId)}/eligibility`,
      request
    );
  }

  listEligibility(groupId: number | string): Observable<PewosaGroupEligibilityResponse[]> {
    return this.http.get<PewosaGroupEligibilityResponse[]>(
      `${this.basePath(groupId)}/eligibility`
    );
  }

  getEligibility(
    groupId: number | string,
    reference: string
  ): Observable<PewosaGroupEligibilityResponse> {
    return this.http.get<PewosaGroupEligibilityResponse>(
      `${this.basePath(groupId)}/eligibility/${reference}`
    );
  }

  // ==========================================
  // D2: Evidence Checklist & Verification
  // ==========================================

  submitEvidence(
    groupId: number | string,
    request: PewosaGroupEvidenceRequest
  ): Observable<PewosaGroupEvidenceResponse> {
    return this.http.post<PewosaGroupEvidenceResponse>(
      `${this.basePath(groupId)}/evidence`,
      request
    );
  }

  listEvidence(groupId: number | string): Observable<PewosaGroupEvidenceResponse[]> {
    return this.http.get<PewosaGroupEvidenceResponse[]>(`${this.basePath(groupId)}/evidence`);
  }

  verifyEvidence(
    groupId: number | string,
    evidenceId: number | string,
    request: PewosaGroupEvidenceVerificationRequest
  ): Observable<PewosaGroupEvidenceResponse> {
    return this.http.post<PewosaGroupEvidenceResponse>(
      `${this.basePath(groupId)}/evidence/${evidenceId}/verification`,
      request
    );
  }

  // ==========================================
  // D2: Loan Application Workflow
  // ==========================================

  createLoanApplication(
    groupId: number | string,
    request: PewosaGroupLoanApplicationRequest
  ): Observable<PewosaGroupLoanApplicationResponse> {
    return this.http.post<PewosaGroupLoanApplicationResponse>(
      `${this.basePath(groupId)}/loan-applications`,
      request
    );
  }

  listLoanApplications(groupId: number | string): Observable<PewosaGroupLoanApplicationResponse[]> {
    return this.http.get<PewosaGroupLoanApplicationResponse[]>(
      `${this.basePath(groupId)}/loan-applications`
    );
  }

  getLoanApplication(
    groupId: number | string,
    applicationId: number | string
  ): Observable<PewosaGroupLoanApplicationResponse> {
    return this.http.get<PewosaGroupLoanApplicationResponse>(
      `${this.basePath(groupId)}/loan-applications/${applicationId}`
    );
  }

  // ==========================================
  // D2: Member Loan Distribution & Exact Reconciliation
  // ==========================================

  saveLoanDistribution(
    groupId: number | string,
    applicationId: number | string,
    request: PewosaGroupLoanDistributionRequest
  ): Observable<PewosaGroupLoanDistributionResponse> {
    return this.http.post<PewosaGroupLoanDistributionResponse>(
      `${this.basePath(groupId)}/loan-applications/${applicationId}/distribution`,
      request
    );
  }

  getLoanDistribution(
    groupId: number | string,
    applicationId: number | string
  ): Observable<PewosaGroupLoanDistributionResponse> {
    return this.http.get<PewosaGroupLoanDistributionResponse>(
      `${this.basePath(groupId)}/loan-applications/${applicationId}/distribution`
    );
  }

  // ==========================================
  // D3: Meetings & Financial Session Linkage
  // ==========================================

  createMeetingEvidence(
    groupId: number | string,
    request: PewosaGroupMeetingRequest
  ): Observable<PewosaGroupMeetingResponse> {
    return this.http.post<PewosaGroupMeetingResponse>(
      `${this.basePath(groupId)}/meetings`,
      request
    );
  }

  listMeetingEvidence(groupId: number | string): Observable<PewosaGroupMeetingResponse[]> {
    return this.http.get<PewosaGroupMeetingResponse[]>(`${this.basePath(groupId)}/meetings`);
  }

  getMeetingEvidence(
    groupId: number | string,
    meetingId: number | string
  ): Observable<PewosaGroupMeetingResponse> {
    return this.http.get<PewosaGroupMeetingResponse>(
      `${this.basePath(groupId)}/meetings/${meetingId}`
    );
  }

  processMeetingTransactions(
    groupId: number | string,
    meetingId: number | string,
    request: PewosaGroupMeetingTransactionRequest
  ): Observable<PewosaGroupMeetingTransactionResponse> {
    return this.http.post<PewosaGroupMeetingTransactionResponse>(
      `${this.basePath(groupId)}/meetings/${meetingId}/transactions`,
      request
    );
  }

  // ==========================================
  // D4: Aggregate Exposure & Collective Liability
  // ==========================================

  getGroupExposure(groupId: number | string): Observable<PewosaGroupExposureResponse> {
    return this.http.get<PewosaGroupExposureResponse>(`${this.basePath(groupId)}/exposure`);
  }

  // ==========================================
  // D4: Default Recovery Execution & Cascade
  // ==========================================

  executeRecovery(
    groupId: number | string,
    request: PewosaGroupRecoveryRequest
  ): Observable<PewosaGroupRecoveryResponse> {
    return this.http.post<PewosaGroupRecoveryResponse>(
      `${this.basePath(groupId)}/recoveries`,
      request
    );
  }

  listRecoveries(groupId: number | string): Observable<PewosaGroupRecoveryResponse[]> {
    return this.http.get<PewosaGroupRecoveryResponse[]>(`${this.basePath(groupId)}/recoveries`);
  }
}
