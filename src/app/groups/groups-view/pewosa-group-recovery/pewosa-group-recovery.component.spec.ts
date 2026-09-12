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
import { PewosaGroupRecoveryComponent } from './pewosa-group-recovery.component';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import { GroupsService } from 'app/groups/groups.service';
import { AlertService } from 'app/core/alert/alert.service';
import { DatePipe } from '@angular/common';
import { Dates } from 'app/core/utils/dates';
import { SettingsService } from 'app/settings/settings.service';
import {
  PewosaGroupExposureResponse,
  PewosaGroupRecoveryResponse
} from 'app/groups/pewosa-group-lending.models';

describe('PewosaGroupRecoveryComponent', () => {
  let component: PewosaGroupRecoveryComponent;
  let fixture: ComponentFixture<PewosaGroupRecoveryComponent>;
  let lendingServiceMock: any;
  let groupsServiceMock: any;
  let alertServiceMock: any;

  const mockExposure: PewosaGroupExposureResponse = {
    groupId: 105,
    groupName: 'Solidarity Group',
    currency: 'UGX',
    asOfDate: '2026-09-12',
    summary: {
      totalOriginalPrincipal: 5000000,
      totalOutstandingPrincipal: 4000000,
      totalOutstandingInterest: 200000,
      totalOverdueAmount: 500000,
      membersInArrearsCount: 1,
      nativeGroupSavingsBalance: 1200000,
      nativeSocialFundBalance: 800000,
      collectiveLiabilityRatio: 2.0
    },
    memberExposure: [
      {
        clientId: 202,
        clientName: 'Bob Mukasa',
        activeLoanId: 55,
        originalPrincipal: 2500000,
        outstandingBalance: 2000000,
        overdueAmount: 500000,
        daysInArrears: 15,
        savingsBalance: 300000,
        jointGuarantorExposure: 1000000
      }
    ]
  };

  const mockRecovery: PewosaGroupRecoveryResponse = {
    recoveryId: 1,
    groupId: 105,
    defaultingClientId: 202,
    defaultingLoanId: 55,
    recoveredAmount: 500000,
    recoverySource: 'GROUP_SOCIAL_FUND',
    sourceSavingsAccountId: 850,
    nativeSavingsTransactionId: 771,
    nativeLoanTransactionId: 992,
    actionDate: '2026-09-12',
    performedBy: 'mifos',
    status: 'EXECUTED'
  };

  beforeEach(async () => {
    lendingServiceMock = {
      getGroupExposure: jest.fn().mockReturnValue(of(mockExposure)),
      listRecoveries: jest.fn().mockReturnValue(of([mockRecovery])),
      executeRecovery: jest.fn().mockReturnValue(of(mockRecovery))
    };

    groupsServiceMock = {
      getGroupAccountsData: jest.fn().mockReturnValue(
        of({
          savingsAccounts: [
            { id: 850, accountNo: 'SA-00850', productName: 'Social Fund', accountBalance: 800000 }
          ]
        })
      )
    };

    alertServiceMock = {
      alert: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PewosaGroupRecoveryComponent, NoopAnimationsModule],
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

    fixture = TestBed.createComponent(PewosaGroupRecoveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load exposure metrics and savings accounts', () => {
    expect(component).toBeTruthy();
    expect(component.groupId).toBe(105);
    expect(component.exposure).toEqual(mockExposure);
    expect(component.groupSavingsAccounts.length).toBe(1);
    expect(component.recoveryHistory.length).toBe(1);
  });

  it('should execute default recovery cascade', () => {
    component.recoveryForm.patchValue({
      defaultingClientId: 202,
      defaultingLoanId: 55,
      recoveryAmount: 500000,
      recoverySource: 'GROUP_SOCIAL_FUND',
      sourceSavingsAccountId: 850,
      comments: 'Deducted from social fund'
    });

    component.executeRecovery();

    expect(lendingServiceMock.executeRecovery).toHaveBeenCalledWith(
      105,
      expect.objectContaining({
        defaultingClientId: 202,
        defaultingLoanId: 55,
        recoveryAmount: 500000,
        recoverySource: 'GROUP_SOCIAL_FUND',
        sourceSavingsAccountId: 850
      })
    );
    expect(alertServiceMock.alert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SUCCESS' })
    );
  });
});
