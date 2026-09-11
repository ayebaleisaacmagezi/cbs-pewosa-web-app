/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { finalize } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { TellerComplianceCase } from './teller-api.models';
import { TellerApiService } from './teller-api.service';

@Component({
  selector: 'mifosx-compliance-workspace',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardModule
  ],
  templateUrl: './compliance-workspace.component.html',
  styleUrls: [
    './staff-workspace.scss',
    './compliance-workspace.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComplianceWorkspaceComponent implements OnInit {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly tellerApi = inject(TellerApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  credentials = this.authenticationService.getCredentials();
  cases: TellerComplianceCase[] = [];
  selectedCase: TellerComplianceCase | null = null;
  statusFilter = 'OPEN';
  loading = false;
  submitting = false;
  message = '';
  messageType: 'error' | 'success' | '' = '';

  decisionForm = this.formBuilder.group({
    note: [
      '',
      Validators.required
    ]
  });

  ngOnInit(): void {
    this.loadCases();
  }

  loadCases(status = this.statusFilter): void {
    this.statusFilter = status;
    this.loading = true;
    this.tellerApi
      .getComplianceCases(status)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (cases) => {
          this.cases = cases;
          if (this.selectedCase) {
            this.selectedCase = cases.find((item) => item.reference === this.selectedCase?.reference) || null;
          }
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  selectCase(complianceCase: TellerComplianceCase): void {
    this.selectedCase = complianceCase;
    this.decisionForm.reset();
  }

  updateCase(status: 'IN_REVIEW' | 'FILED' | 'DISMISSED' | 'ESCALATED', decision?: string): void {
    if (!this.selectedCase || this.submitting) return;
    const note = this.decisionForm.value.note?.trim() || undefined;
    if ((status === 'DISMISSED' || status === 'ESCALATED') && !note) {
      this.showMessage('Enter the review reason before completing this action.', 'error');
      return;
    }
    const resolvedDecision =
      status === 'FILED' ? (this.selectedCase.caseType === 'CTR' ? 'CTR_FILED' : 'STR_FILED') : decision;
    this.submitting = true;
    this.tellerApi
      .decideComplianceCase(this.selectedCase.reference, { status, decision: resolvedDecision, note })
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (complianceCase) => {
          this.selectedCase = complianceCase;
          this.decisionForm.reset();
          this.showMessage('The compliance case was updated.', 'success');
          this.loadCases();
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    this.message = message;
    this.messageType = type;
    this.changeDetectorRef.markForCheck();
  }
}
