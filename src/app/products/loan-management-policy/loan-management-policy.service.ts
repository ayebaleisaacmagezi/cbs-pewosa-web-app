/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  LoanManagementPolicyResponse,
  LoanManagementPolicyTemplate,
  SaveLoanManagementPolicyRequest
} from './loan-management-policy.models';

@Injectable({ providedIn: 'root' })
export class LoanManagementPolicyService {
  private readonly http = inject(HttpClient);

  getTemplate(): Observable<LoanManagementPolicyTemplate> {
    return this.http.get<LoanManagementPolicyTemplate>('/pewosa/loan-policies/template');
  }

  getPolicy(loanProductId: number): Observable<LoanManagementPolicyResponse> {
    return this.http.get<LoanManagementPolicyResponse>(`/pewosa/loan-policies/${loanProductId}`);
  }

  updatePolicy(
    loanProductId: number,
    request: SaveLoanManagementPolicyRequest
  ): Observable<LoanManagementPolicyResponse> {
    return this.http.put<LoanManagementPolicyResponse>(`/pewosa/loan-policies/${loanProductId}`, request);
  }
}
