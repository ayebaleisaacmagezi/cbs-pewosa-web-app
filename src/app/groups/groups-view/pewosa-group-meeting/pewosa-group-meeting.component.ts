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
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { AlertService } from 'app/core/alert/alert.service';
import { GroupsService } from 'app/groups/groups.service';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import {
  PewosaGroupMeetingResponse,
  PewosaGroupMeetingRequest,
  PewosaGroupMeetingTransactionRequest,
  PewosaGroupMeetingTransactionResponse
} from 'app/groups/pewosa-group-lending.models';
import { DateFormatPipe } from 'app/pipes/date-format.pipe';

@Component({
  selector: 'mifosx-pewosa-group-meeting',
  templateUrl: './pewosa-group-meeting.component.html',
  styleUrls: ['./pewosa-group-meeting.component.scss'],
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
export class PewosaGroupMeetingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private lendingService = inject(PewosaGroupLendingService);
  private groupsService = inject(GroupsService);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  groupId!: number;
  meetingForm!: FormGroup;
  batchForm!: FormGroup;
  meetings: PewosaGroupMeetingResponse[] = [];
  selectedMeeting: PewosaGroupMeetingResponse | null = null;
  groupMembers: any[] = [];
  lastBatchResult: PewosaGroupMeetingTransactionResponse | null = null;

  loading = false;
  submittingMeeting = false;
  submittingBatch = false;

  meetingColumns: string[] = ['meetingDate', 'minutesSummary', 'depositSlipRef', 'depositDate', 'actions'];
  batchColumns: string[] = ['type', 'clientId', 'amount', 'status', 'nativeTransactionId'];

  transactionTypes = ['LOAN_REPAYMENT', 'SAVINGS_DEPOSIT', 'SOCIAL_FUND', 'FINE'];

  ngOnInit(): void {
    const idParam = this.route.parent?.snapshot.paramMap.get('groupId') || this.route.snapshot.paramMap.get('groupId');
    this.groupId = Number(idParam);

    this.initForms();
    if (this.groupId) {
      this.loadData();
    }
  }

  private initForms(): void {
    this.meetingForm = this.fb.group({
      meetingDate: [new Date().toISOString().substring(0, 10), Validators.required],
      minutesSummary: ['', Validators.required],
      depositSlipRef: [''],
      bankAccountRef: [''],
      depositDate: ['']
    });

    this.batchForm = this.fb.group({
      idempotencyKey: [this.generateIdempotencyKey(), Validators.required],
      items: this.fb.array([])
    });
  }

  get itemsArray(): FormArray {
    return this.batchForm.get('items') as FormArray;
  }

  private generateIdempotencyKey(): string {
    return 'MTG-TX-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }

  loadData(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.groupsService.getGroupData(String(this.groupId)).subscribe({
      next: (data) => {
        this.groupMembers = data.clientMembers || [];
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.lendingService.listMeetingEvidence(this.groupId).subscribe({
      next: (meetings) => {
        this.meetings = meetings;
        if (meetings.length > 0) {
          this.selectMeeting(meetings[0]);
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

  selectMeeting(meeting: PewosaGroupMeetingResponse): void {
    this.selectedMeeting = meeting;
    this.itemsArray.clear();
    this.addItemRow();
    this.lastBatchResult = null;
    this.batchForm.patchValue({ idempotencyKey: this.generateIdempotencyKey() });
    this.cdr.markForCheck();
  }

  recordMeeting(): void {
    if (this.meetingForm.invalid) {
      this.meetingForm.markAllAsTouched();
      return;
    }

    this.submittingMeeting = true;
    this.cdr.markForCheck();
    const payload: PewosaGroupMeetingRequest = this.meetingForm.value;

    this.lendingService.createMeetingEvidence(this.groupId, payload).subscribe({
      next: (created) => {
        this.alertService.alert({ type: 'SUCCESS', message: 'Meeting session recorded successfully.' });
        this.meetings = [created, ...this.meetings];
        this.selectMeeting(created);
        this.submittingMeeting = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.alertService.alert({ type: 'DANGER', message: err.error?.defaultUserMessage || 'Failed to record meeting.' });
        this.submittingMeeting = false;
        this.cdr.markForCheck();
      }
    });
  }

  addItemRow(): void {
    this.itemsArray.push(this.fb.group({
      type: ['LOAN_REPAYMENT', Validators.required],
      clientId: [this.groupMembers.length > 0 ? this.groupMembers[0].id : null, Validators.required],
      amount: [0, [Validators.required, Validators.min(100)]],
      reason: ['']
    }));
  }

  removeItemRow(index: number): void {
    this.itemsArray.removeAt(index);
  }

  submitBatchTransactions(): void {
    if (!this.selectedMeeting) return;
    if (this.batchForm.invalid || this.itemsArray.length === 0) {
      this.batchForm.markAllAsTouched();
      return;
    }

    this.submittingBatch = true;
    this.cdr.markForCheck();
    const payload: PewosaGroupMeetingTransactionRequest = this.batchForm.value;

    this.lendingService.processMeetingTransactions(this.groupId, this.selectedMeeting.id, payload).subscribe({
      next: (res) => {
        this.alertService.alert({ type: 'SUCCESS', message: `Processed ${res.processedItemsCount} transactions totaling UGX ${res.totalAmountCollected}.` });
        this.lastBatchResult = res;
        this.submittingBatch = false;
        this.batchForm.patchValue({ idempotencyKey: this.generateIdempotencyKey() });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.alertService.alert({ type: 'DANGER', message: err.error?.defaultUserMessage || 'Transaction batch processing failed.' });
        this.submittingBatch = false;
        this.cdr.markForCheck();
      }
    });
  }
}
