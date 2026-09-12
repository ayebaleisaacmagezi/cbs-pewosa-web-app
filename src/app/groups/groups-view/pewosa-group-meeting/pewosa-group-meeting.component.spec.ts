/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PewosaGroupMeetingComponent } from './pewosa-group-meeting.component';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import { GroupsService } from 'app/groups/groups.service';
import { AlertService } from 'app/core/alert/alert.service';
import { DatePipe } from '@angular/common';
import { Dates } from 'app/core/utils/dates';
import { SettingsService } from 'app/settings/settings.service';
import {
  PewosaGroupMeetingResponse,
  PewosaGroupMeetingTransactionResponse
} from 'app/groups/pewosa-group-lending.models';

describe('PewosaGroupMeetingComponent', () => {
  let component: PewosaGroupMeetingComponent;
  let fixture: ComponentFixture<PewosaGroupMeetingComponent>;
  let lendingServiceMock: any;
  let groupsServiceMock: any;
  let alertServiceMock: any;

  const mockMeeting: PewosaGroupMeetingResponse = {
    id: 50,
    groupId: 105,
    meetingDate: '2026-09-12',
    minutesSummary: 'Discussed loan repayments and welfare contributions',
    depositSlipRef: 'DEP-98765',
    bankAccountRef: 'ACC-00123',
    depositDate: '2026-09-12'
  };

  const mockBatchResult: PewosaGroupMeetingTransactionResponse = {
    meetingId: 50,
    idempotencyKey: 'MTG-TX-12345',
    status: 'PROCESSED',
    processedItemsCount: 1,
    totalAmountCollected: 50000,
    postedTransactions: [
      {
        type: 'LOAN_REPAYMENT',
        clientId: 201,
        loanId: 10,
        nativeLoanTransactionId: 991,
        amount: 50000,
        status: 'SUCCESS'
      }
    ]
  };

  beforeEach(async () => {
    lendingServiceMock = {
      listMeetingEvidence: jest.fn().mockReturnValue(of([mockMeeting])),
      createMeetingEvidence: jest.fn().mockReturnValue(of(mockMeeting)),
      processMeetingTransactions: jest.fn().mockReturnValue(of(mockBatchResult))
    };

    groupsServiceMock = {
      getGroupData: jest.fn().mockReturnValue(
        of({
          clientMembers: [{ id: 201, displayName: 'Alice' }]
        })
      )
    };

    alertServiceMock = {
      alert: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PewosaGroupMeetingComponent, NoopAnimationsModule],
      providers: [
        DatePipe,
        Dates,
        { provide: PewosaGroupLendingService, useValue: lendingServiceMock },
        { provide: GroupsService, useValue: groupsServiceMock },
        { provide: AlertService, useValue: alertServiceMock },
        {
          provide: SettingsService,
          useValue: {
            language: { code: 'en' },
            languageCode: 'en-US',
            dateFormat: 'dd MMMM yyyy'
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ groupId: '105' }) },
            parent: null
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PewosaGroupMeetingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load meetings and group members', () => {
    expect(component).toBeTruthy();
    expect(component.groupId).toBe(105);
    expect(component.meetings.length).toBe(1);
    expect(component.selectedMeeting?.id).toBe(50);
  });

  it('should record meeting session evidence', () => {
    component.meetingForm.patchValue({
      meetingDate: '2026-09-12',
      minutesSummary: 'New meeting minutes'
    });

    component.recordMeeting();
    expect(lendingServiceMock.createMeetingEvidence).toHaveBeenCalledWith(
      105,
      expect.objectContaining({
        meetingDate: '2026-09-12',
        minutesSummary: 'New meeting minutes'
      })
    );
    expect(alertServiceMock.alert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SUCCESS' })
    );
  });

  it('should process batch transactions with idempotency key', () => {
    component.itemsArray.at(0).patchValue({
      type: 'LOAN_REPAYMENT',
      clientId: 201,
      amount: 50000
    });

    component.submitBatchTransactions();

    expect(lendingServiceMock.processMeetingTransactions).toHaveBeenCalledWith(
      105,
      50,
      expect.objectContaining({
        idempotencyKey: expect.any(String),
        items: expect.any(Array)
      })
    );
    expect(component.lastBatchResult).toEqual(mockBatchResult);
    expect(alertServiceMock.alert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SUCCESS' })
    );
  });
});
