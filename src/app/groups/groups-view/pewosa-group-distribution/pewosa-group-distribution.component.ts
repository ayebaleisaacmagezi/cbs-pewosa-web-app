/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { AlertService } from 'app/core/alert/alert.service';
import { GroupsService } from 'app/groups/groups.service';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import {
  PewosaGroupLoanApplicationResponse,
  PewosaGroupLoanDistributionResponse,
  PewosaGroupLoanDistributionRequest,
  PewosaCollectiveRepaymentResponse
} from 'app/groups/pewosa-group-lending.models';

@Component({
  selector: 'mifosx-pewosa-group-distribution',
  templateUrl: './pewosa-group-distribution.component.html',
  styleUrls: ['./pewosa-group-distribution.component.scss'],
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
    MatProgressBarModule,
    MatChipsModule,
    TranslateModule
  ]
})
export class PewosaGroupDistributionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private lendingService = inject(PewosaGroupLendingService);
  private groupsService = inject(GroupsService);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  groupId!: number;
  selectedApplicationId: number | null = null;
  applications: PewosaGroupLoanApplicationResponse[] = [];
  selectedApplication: PewosaGroupLoanApplicationResponse | null = null;
  groupMembers: any[] = [];
  distributionForm!: FormGroup;
  collectiveRepaymentForm!: FormGroup;
  lastCollectiveRepayment: PewosaCollectiveRepaymentResponse | null = null;
  materialized = false;

  loading = false;
  saving = false;
  reconciled = false;
  totalDistributed = 0;
  remainingToDistribute = 0;

  ngOnInit(): void {
    const idParam = this.route.parent?.snapshot.paramMap.get('groupId') || this.route.snapshot.paramMap.get('groupId');
    this.groupId = Number(idParam);

    this.initForm();

    const queryAppId = this.route.snapshot.queryParamMap.get('applicationId');
    if (queryAppId) {
      this.selectedApplicationId = Number(queryAppId);
    }

    if (this.groupId) {
      this.loadInitialData();
    }
  }

  private initForm(): void {
    this.distributionForm = this.fb.group({
      distributions: this.fb.array([])
    });
    this.collectiveRepaymentForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      paymentTypeId: [null, [Validators.required, Validators.min(1)]],
      transactionDate: [new Date().toISOString().substring(0, 10), Validators.required]
    });

    this.distributionsArray.valueChanges.subscribe(() => {
      this.calculateReconciliation();
    });
  }

  get distributionsArray(): FormArray {
    return this.distributionForm.get('distributions') as FormArray;
  }

  loadInitialData(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.groupsService.getGroupData(String(this.groupId)).subscribe({
      next: (data) => {
        this.groupMembers = data.clientMembers || [];
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.lendingService.listLoanApplications(this.groupId).subscribe({
      next: (apps) => {
        this.applications = apps;
        if (apps.length > 0) {
          const targetId = this.selectedApplicationId || apps[0].id;
          this.selectApplication(targetId);
        } else {
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  selectApplication(appId: number): void {
    this.selectedApplicationId = appId;
    this.selectedApplication = this.applications.find(a => a.id === appId) || null;
    this.loading = true;
    this.cdr.markForCheck();

    this.lendingService.getLoanDistribution(this.groupId, appId).subscribe({
      next: (res) => {
        this.populateDistributions(res);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        // No existing distributions; initialize with default member rows
        this.initializeDefaultRows();
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private populateDistributions(res: PewosaGroupLoanDistributionResponse): void {
    this.distributionsArray.clear();
    if (res.distributions && res.distributions.length > 0) {
      for (const item of res.distributions) {
        this.distributionsArray.push(this.fb.group({
          clientId: [item.clientId, Validators.required],
          requestedAmount: [item.requestedAmount, [Validators.required, Validators.min(0)]],
          approvedAmount: [item.approvedAmount, [Validators.required, Validators.min(0)]],
          purpose: [item.purpose || '']
        }));
      }
    } else {
      this.initializeDefaultRows();
    }
    this.calculateReconciliation();
    this.materialized = res.distributions.length > 0 && res.distributions.every((item) => !!item.nativeLoanId);
  }

  private initializeDefaultRows(): void {
    this.distributionsArray.clear();
    const appAmount = this.targetApprovedAmount;
    const count = this.groupMembers.length > 0 ? this.groupMembers.length : 1;
    const perMember = Math.floor(appAmount / count);

    for (const member of this.groupMembers) {
      this.distributionsArray.push(this.fb.group({
        clientId: [member.id, Validators.required],
        requestedAmount: [perMember, [Validators.required, Validators.min(0)]],
        approvedAmount: [perMember, [Validators.required, Validators.min(0)]],
        purpose: ['Working capital']
      }));
    }
    this.calculateReconciliation();
  }

  addMemberRow(): void {
    this.distributionsArray.push(this.fb.group({
      clientId: [null, Validators.required],
      requestedAmount: [0, [Validators.required, Validators.min(0)]],
      approvedAmount: [0, [Validators.required, Validators.min(0)]],
      purpose: ['']
    }));
  }

  removeMemberRow(index: number): void {
    this.distributionsArray.removeAt(index);
  }

  get targetApprovedAmount(): number {
    return this.selectedApplication?.approvedAmount || this.selectedApplication?.requestedAmount || 0;
  }

  calculateReconciliation(): void {
    let sum = 0;
    for (const ctrl of this.distributionsArray.controls) {
      const val = Number(ctrl.get('approvedAmount')?.value) || 0;
      sum += val;
    }
    this.totalDistributed = sum;
    this.remainingToDistribute = this.targetApprovedAmount - this.totalDistributed;
    this.reconciled = this.distributionsArray.length > 0 && Math.abs(this.remainingToDistribute) === 0;
    this.cdr.markForCheck();
  }

  saveDistribution(): void {
    if (!this.selectedApplicationId) return;
    if (this.distributionForm.invalid) {
      this.distributionForm.markAllAsTouched();
      return;
    }
    if (!this.reconciled) {
      this.alertService.alert({
        type: 'DANGER',
        message: `Sum of member allocations (${this.totalDistributed}) must exactly equal group approved amount (${this.targetApprovedAmount}).`
      });
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();
    const payload: PewosaGroupLoanDistributionRequest = {
      allocationMethod: 'CUSTOM',
      distributions: this.distributionsArray.value
    };

    this.lendingService.saveLoanDistribution(this.groupId, this.selectedApplicationId, payload).subscribe({
      next: (res) => {
        this.alertService.alert({ type: 'SUCCESS', message: 'Member loan distributions saved and reconciled successfully.' });
        this.populateDistributions(res);
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.alertService.alert({ type: 'DANGER', message: err.error?.defaultUserMessage || 'Reconciliation failed on server.' });
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyAutomaticDistribution(method: 'EQUAL' | 'PROPORTIONAL_TO_SAVINGS'): void {
    if (!this.selectedApplicationId) return;
    this.saving = true;
    this.lendingService.saveLoanDistribution(this.groupId, this.selectedApplicationId, {
      allocationMethod: method,
      purpose: 'Group loan allocation'
    }).subscribe({
      next: (response) => {
        this.populateDistributions(response);
        this.saving = false;
        this.alertService.alert({ type: 'SUCCESS', message: `${method} distribution calculated and reconciled by the server.` });
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        this.alertService.alert({ type: 'DANGER', message: error.error?.defaultUserMessage || 'Automatic distribution failed.' });
        this.cdr.markForCheck();
      }
    });
  }

  executeCollectiveRepayment(): void {
    if (!this.selectedApplicationId || this.collectiveRepaymentForm.invalid) {
      this.collectiveRepaymentForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.lendingService.executeCollectiveRepayment(this.groupId, this.selectedApplicationId, {
      ...this.collectiveRepaymentForm.value,
      idempotencyKey: `GROUP-PAY-${this.selectedApplicationId}-${Date.now()}`
    }).subscribe({
      next: (response) => {
        this.lastCollectiveRepayment = response;
        this.saving = false;
        this.alertService.alert({ type: 'SUCCESS', message: 'Collective payment posted across native member loans.' });
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        this.alertService.alert({ type: 'DANGER', message: error.error?.defaultUserMessage || 'Collective repayment failed.' });
        this.cdr.markForCheck();
      }
    });
  }

  getClientName(clientId: number): string {
    const member = this.groupMembers.find(m => m.id === clientId);
    return member ? member.displayName : `Member #${clientId}`;
  }
}
