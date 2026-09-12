/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { AlertService } from 'app/core/alert/alert.service';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import {
  PewosaGroupLoanApplicationResponse,
  PewosaGroupLoanApplicationRequest,
  PewosaGroupEvidenceResponse,
  PewosaGroupEvidenceRequest,
  PewosaGroupEligibilityResponse
} from 'app/groups/pewosa-group-lending.models';
import { DateFormatPipe } from 'app/pipes/date-format.pipe';

@Component({
  selector: 'mifosx-pewosa-group-application',
  templateUrl: './pewosa-group-application.component.html',
  styleUrls: ['./pewosa-group-application.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatTableModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
    TranslateModule,
    DateFormatPipe
  ]
})
export class PewosaGroupApplicationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lendingService = inject(PewosaGroupLendingService);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  groupId!: number;
  appForm!: FormGroup;
  evidenceForm!: FormGroup;
  applications: PewosaGroupLoanApplicationResponse[] = [];
  evidenceList: PewosaGroupEvidenceResponse[] = [];
  eligibilityHistory: PewosaGroupEligibilityResponse[] = [];
  loading = false;
  submitting = false;

  appColumns: string[] = ['reference', 'product', 'requestedAmount', 'approvedAmount', 'status', 'jointLiability', 'actions'];
  evidenceColumns: string[] = ['type', 'fileName', 'stage', 'status', 'submittedBy', 'verifiedBy', 'actions'];

  evidenceTypes = ['RESOLUTION', 'CONSTITUTION', 'TRAINING_CERTIFICATE', 'BANK_STATEMENT', 'OTHER'];

  ngOnInit(): void {
    const idParam = this.route.parent?.snapshot.paramMap.get('groupId') || this.route.snapshot.paramMap.get('groupId');
    this.groupId = Number(idParam);
    this.initForms();
    if (this.groupId) {
      this.loadAll();
    }
  }

  private initForms(): void {
    this.appForm = this.fb.group({
      eligibilityReference: ['', Validators.required],
      productId: [null, Validators.required],
      requestedAmount: [null, [Validators.required, Validators.min(1000)]],
      requestedTerm: [12, [Validators.required, Validators.min(1)]],
      repaymentFrequency: ['MONTHLY', Validators.required],
      purpose: [''],
      jointLiabilityAgreed: [true, Validators.requiredTrue]
    });

    this.evidenceForm = this.fb.group({
      evidenceType: ['RESOLUTION', Validators.required],
      stage: ['SUBMISSION', Validators.required],
      notes: ['']
    });
  }

  loadAll(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.lendingService.listLoanApplications(this.groupId).subscribe({
      next: (apps) => {
        this.applications = apps;
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.lendingService.listEvidence(this.groupId).subscribe({
      next: (evs) => {
        this.evidenceList = evs;
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.lendingService.listEligibility(this.groupId).subscribe({
      next: (eligs) => {
        this.eligibilityHistory = eligs.filter(e => e.eligible);
        if (this.eligibilityHistory.length > 0 && !this.appForm.get('eligibilityReference')?.value) {
          const latest = this.eligibilityHistory[0];
          this.appForm.patchValue({
            eligibilityReference: latest.reference,
            productId: latest.loanProductId,
            requestedAmount: latest.requestedTotalAmount
          });
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  submitApplication(): void {
    if (this.appForm.invalid) {
      this.appForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.cdr.markForCheck();
    const payload: PewosaGroupLoanApplicationRequest = this.appForm.value;

    this.lendingService.createLoanApplication(this.groupId, payload).subscribe({
      next: (created) => {
        this.alertService.alert({ type: 'SUCCESS', message: 'Group loan application submitted successfully.' });
        this.applications = [created, ...this.applications];
        this.submitting = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.alertService.alert({ type: 'DANGER', message: err.error?.defaultUserMessage || 'Failed to submit application.' });
        this.submitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  submitEvidence(): void {
    if (this.evidenceForm.invalid) {
      this.evidenceForm.markAllAsTouched();
      return;
    }

    const payload: PewosaGroupEvidenceRequest = this.evidenceForm.value;
    this.lendingService.submitEvidence(this.groupId, payload).subscribe({
      next: (ev) => {
        this.alertService.alert({ type: 'SUCCESS', message: 'Evidence submitted successfully.' });
        this.evidenceList = [ev, ...this.evidenceList];
        this.evidenceForm.reset({ evidenceType: 'RESOLUTION', stage: 'SUBMISSION', notes: '' });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.alertService.alert({ type: 'DANGER', message: err.error?.defaultUserMessage || 'Failed to submit evidence.' });
      }
    });
  }

  verifyEvidence(evidence: PewosaGroupEvidenceResponse, decision: 'VERIFIED' | 'REJECTED'): void {
    this.lendingService.verifyEvidence(this.groupId, evidence.id, { decision }).subscribe({
      next: (updated) => {
        this.alertService.alert({ type: 'SUCCESS', message: `Evidence ${decision.toLowerCase()} successfully.` });
        this.evidenceList = this.evidenceList.map(e => e.id === updated.id ? updated : e);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.alertService.alert({ type: 'DANGER', message: err.error?.defaultUserMessage || 'Maker-checker rule violation.' });
      }
    });
  }

  decideApplication(application: PewosaGroupLoanApplicationResponse, decision: 'APPROVE' | 'REJECT'): void {
    this.lendingService
      .decideLoanApplication(this.groupId, application.id, {
        decision,
        approvedAmount: decision === 'APPROVE' ? application.requestedAmount : undefined
      })
      .subscribe({
        next: (updated) => {
          this.applications = this.applications.map((item) => (item.id === updated.id ? updated : item));
          this.alertService.alert({
            type: 'SUCCESS',
            message: `Group loan application ${decision.toLowerCase()}d successfully.`
          });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.alertService.alert({
            type: 'DANGER',
            message: err.error?.defaultUserMessage || 'Failed to decide group loan application.'
          });
        }
      });
  }

  goToDistribution(applicationId: number): void {
    this.router.navigate(['../distribution'], {
      relativeTo: this.route,
      queryParams: { applicationId }
    });
  }
}
