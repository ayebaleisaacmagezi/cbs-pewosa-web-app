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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { AlertService } from 'app/core/alert/alert.service';
import { GroupsService } from 'app/groups/groups.service';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import {
  PewosaGroupProfileRequest,
  PewosaGroupProfileResponse
} from 'app/groups/pewosa-group-lending.models';
import { DateFormatPipe } from 'app/pipes/date-format.pipe';

@Component({
  selector: 'mifosx-pewosa-group-profile',
  templateUrl: './pewosa-group-profile.component.html',
  styleUrls: ['./pewosa-group-profile.component.scss'],
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
    MatSlideToggleModule,
    MatProgressBarModule,
    TranslateModule,
    DateFormatPipe
  ]
})
export class PewosaGroupProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private lendingService = inject(PewosaGroupLendingService);
  private groupsService = inject(GroupsService);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  groupId!: number;
  profileForm!: FormGroup;
  profile: PewosaGroupProfileResponse | null = null;
  groupSavingsAccounts: any[] = [];
  loading = false;
  saving = false;

  meetingFrequencies = ['WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY'];
  daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  ngOnInit(): void {
    const idParam = this.route.parent?.snapshot.paramMap.get('groupId') || this.route.snapshot.paramMap.get('groupId');
    this.groupId = Number(idParam);
    this.initForm();
    if (this.groupId) {
      this.loadData();
    }
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      registrationNumber: [''],
      registrationDate: [''],
      constitutionAdopted: [false],
      constitutionAdoptedDate: [''],
      trainingCompleted: [false],
      trainingCompletedDate: [''],
      trainerStaffId: [null],
      meetingFrequency: ['MONTHLY'],
      meetingDayOfWeek: ['WEDNESDAY'],
      cycleNumber: [1, [Validators.min(1)]],
      socialFundSavingsAccountId: [null],
      groupSavingsAccountId: [null],
      minimumActiveMembers: [5, [Validators.min(1)]]
    });
  }

  private loadData(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.groupsService.getGroupAccountsData(this.groupId.toString()).subscribe({
      next: (accounts: any) => {
        this.groupSavingsAccounts = accounts?.savingsAccounts || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.groupSavingsAccounts = [];
        this.cdr.markForCheck();
      }
    });

    this.lendingService.getGroupProfile(this.groupId).subscribe({
      next: (data: PewosaGroupProfileResponse) => {
        this.profile = data;
        this.patchForm(data);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private patchForm(data: PewosaGroupProfileResponse): void {
    this.profileForm.patchValue({
      registrationNumber: data.registrationNumber || '',
      registrationDate: data.registrationDate || '',
      constitutionAdopted: data.constitutionAdopted ?? false,
      constitutionAdoptedDate: data.constitutionAdoptedDate || '',
      trainingCompleted: data.trainingCompleted ?? false,
      trainingCompletedDate: data.trainingCompletedDate || '',
      trainerStaffId: data.trainerStaffId || null,
      meetingFrequency: data.meetingFrequency || 'MONTHLY',
      meetingDayOfWeek: data.meetingDayOfWeek || 'WEDNESDAY',
      cycleNumber: data.cycleNumber ?? 1,
      socialFundSavingsAccountId: data.socialFundSavingsAccountId || null,
      groupSavingsAccountId: data.groupSavingsAccountId || null,
      minimumActiveMembers: data.minimumActiveMembers ?? 5
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    const formVal = this.profileForm.value;
    const request: PewosaGroupProfileRequest = {
      ...formVal,
      expectedVersion: this.profile?.version ?? 0
    };

    this.lendingService.updateGroupProfile(this.groupId, request).subscribe({
      next: (updated: PewosaGroupProfileResponse) => {
        this.profile = updated;
        this.patchForm(updated);
        this.saving = false;
        this.alertService.alert({ type: 'SUCCESS', message: 'Group profile successfully updated.' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err?.error?.defaultUserMessage || 'Failed to update group profile.';
        this.alertService.alert({ type: 'ERROR', message: msg });
        this.cdr.markForCheck();
      }
    });
  }
}
