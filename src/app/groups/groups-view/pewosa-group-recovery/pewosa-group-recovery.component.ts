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
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlertService } from 'app/core/alert/alert.service';
import { GroupsService } from 'app/groups/groups.service';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import {
  PewosaGroupExposureResponse,
  PewosaMemberExposureItem,
  PewosaGroupRecoveryRequest,
  PewosaGroupRecoveryResponse
} from 'app/groups/pewosa-group-lending.models';
import { DateFormatPipe } from 'app/pipes/date-format.pipe';

@Component({
  selector: 'mifosx-pewosa-group-recovery',
  templateUrl: './pewosa-group-recovery.component.html',
  styleUrls: ['./pewosa-group-recovery.component.scss'],
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
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    TranslateModule,
    DateFormatPipe
  ]
})
export class PewosaGroupRecoveryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private lendingService = inject(PewosaGroupLendingService);
  private groupsService = inject(GroupsService);
  private alertService = inject(AlertService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  groupId!: number;
  exposure: PewosaGroupExposureResponse | null = null;
  recoveryHistory: PewosaGroupRecoveryResponse[] = [];
  groupSavingsAccounts: any[] = [];
  recoveryForm!: FormGroup;
  profileVersion: number | null = null;

  loading = false;
  executing = false;

  memberColumns: string[] = [
    'name',
    'outstanding',
    'overdue',
    'daysInArrears',
    'savings',
    'guarantorExposure'
  ];
  historyColumns: string[] = [
    'date',
    'defaultingClient',
    'source',
    'recoveredAmount',
    'status',
    'nativeRef'
  ];

  recoverySources = [
    { value: 'GROUP_SOCIAL_FUND', label: 'Group Social Fund' },
    { value: 'GROUP_SAVINGS', label: 'Group Voluntary Savings' },
    { value: 'MEMBER_GUARANTOR_SAVINGS', label: 'Member Guarantor Savings' }
  ];

  ngOnInit(): void {
    const idParam = this.route.parent?.snapshot.paramMap.get('groupId') || this.route.snapshot.paramMap.get('groupId');
    this.groupId = Number(idParam);

    this.initForm();
    if (this.groupId) {
      this.loadAll();
    }
  }

  private initForm(): void {
    this.recoveryForm = this.fb.group({
      defaultingClientId: [
        null,
        Validators.required
      ],
      defaultingLoanId: [
        null,
        Validators.required
      ],
      recoveryAmount: [
        null,
        [
          Validators.required,
          Validators.min(1)
        ]
      ],
      recoverySource: [
        'GROUP_SOCIAL_FUND',
        Validators.required
      ],
      sourceSavingsAccountId: [
        null,
        Validators.required
      ],
      comments: [''],
      expectedVersion: [
        null,
        Validators.required
      ],
      idempotencyKey: [
        `GROUP-RECOVERY-${this.groupId}-${Date.now()}`,
        Validators.required
      ]
    });

    this.recoveryForm.get('defaultingClientId')?.valueChanges.subscribe((clientId) => {
      if (this.exposure && clientId) {
        const item = this.exposure.memberExposure.find((m) => m.clientId === clientId);
        if (item && item.activeLoanId) {
          this.recoveryForm.patchValue({
            defaultingLoanId: item.activeLoanId
          });
        }
      }
    });
  }

  loadAll(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.lendingService.getGroupProfile(this.groupId).subscribe({
      next: (profile) => {
        this.profileVersion = profile.version;
        this.recoveryForm.patchValue({ expectedVersion: profile.version });
        this.cdr.markForCheck();
      },
      error: () => {
        this.profileVersion = null;
        this.cdr.markForCheck();
      }
    });

    this.groupsService.getGroupAccountsData(String(this.groupId)).subscribe({
      next: (data) => {
        this.groupSavingsAccounts = data.savingsAccounts || [];
        if (this.groupSavingsAccounts.length > 0 && !this.recoveryForm.get('sourceSavingsAccountId')?.value) {
          this.recoveryForm.patchValue({ sourceSavingsAccountId: this.groupSavingsAccounts[0].id });
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.lendingService.listRecoveries(this.groupId).subscribe({
      next: (history) => {
        this.recoveryHistory = history;
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.lendingService.getGroupExposure(this.groupId).subscribe({
      next: (exp) => {
        this.exposure = exp;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  executeRecovery(): void {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    this.executing = true;
    this.cdr.markForCheck();
    const payload: PewosaGroupRecoveryRequest = this.recoveryForm.value;

    this.lendingService.executeRecovery(this.groupId, payload).subscribe({
      next: (res) => {
        this.alertService.alert({
          type: 'SUCCESS',
          message: this.translateService.instant('Recovery executed successfully.', {
            amount: res.recoveredAmount,
            currency: this.exposure?.currency
          })
        });
        this.recoveryHistory = [
          res,
          ...this.recoveryHistory
        ];
        this.executing = false;
        this.recoveryForm.patchValue({ idempotencyKey: `GROUP-RECOVERY-${this.groupId}-${Date.now()}` });
        this.loadAll(); // Refresh exposure and balances
      },
      error: (err) => {
        this.alertService.alert({
          type: 'DANGER',
          message: err.error?.defaultUserMessage || 'Recovery cascade execution failed.'
        });
        this.executing = false;
        this.cdr.markForCheck();
      }
    });
  }
}
