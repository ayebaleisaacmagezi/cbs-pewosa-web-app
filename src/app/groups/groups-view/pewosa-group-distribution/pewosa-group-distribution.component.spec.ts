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
import { PewosaGroupDistributionComponent } from './pewosa-group-distribution.component';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import { GroupsService } from 'app/groups/groups.service';
import { AlertService } from 'app/core/alert/alert.service';
import { DatePipe } from '@angular/common';
import { Dates } from 'app/core/utils/dates';
import { SettingsService } from 'app/settings/settings.service';
import {
  PewosaGroupLoanApplicationResponse,
  PewosaGroupLoanDistributionResponse
} from 'app/groups/pewosa-group-lending.models';

describe('PewosaGroupDistributionComponent', () => {
  let component: PewosaGroupDistributionComponent;
  let fixture: ComponentFixture<PewosaGroupDistributionComponent>;
  let lendingServiceMock: any;
  let groupsServiceMock: any;
  let alertServiceMock: any;

  const mockApp: PewosaGroupLoanApplicationResponse = {
    id: 10,
    groupId: 105,
    groupName: 'Solidarity Group',
    applicationReference: 'GLA-105-20260912-1001',
    eligibilityReference: 'GPE-105-20260912-1001',
    productId: 1,
    productName: 'Group Loan',
    policyVersion: 1,
    requestedAmount: 5000000,
    approvedAmount: 5000000,
    term: 12,
    status: 'SUBMITTED',
    jointLiabilityAgreed: true,
    createdDate: '2026-09-12T10:00:00Z',
    createdBy: 'mifos'
  };

  const mockDist: PewosaGroupLoanDistributionResponse = {
    applicationId: 10,
    groupApprovedAmount: 5000000,
    totalDistributedAmount: 5000000,
    reconciled: true,
    memberCount: 2,
    distributions: [
      { id: 1, clientId: 201, clientName: 'Alice', requestedAmount: 2500000, approvedAmount: 2500000, purpose: 'Farming' },
      { id: 2, clientId: 202, clientName: 'Bob', requestedAmount: 2500000, approvedAmount: 2500000, purpose: 'Retail' }
    ]
  };

  beforeEach(async () => {
    lendingServiceMock = {
      listLoanApplications: jest.fn().mockReturnValue(of([mockApp])),
      getLoanDistribution: jest.fn().mockReturnValue(of(mockDist)),
      saveLoanDistribution: jest.fn().mockReturnValue(of(mockDist))
    };

    groupsServiceMock = {
      getGroupData: jest.fn().mockReturnValue(
        of({
          clientMembers: [
            { id: 201, displayName: 'Alice' },
            { id: 202, displayName: 'Bob' }
          ]
        })
      )
    };

    alertServiceMock = {
      alert: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PewosaGroupDistributionComponent, NoopAnimationsModule],
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
            snapshot: {
              paramMap: convertToParamMap({ groupId: '105' }),
              queryParamMap: convertToParamMap({ applicationId: '10' })
            },
            parent: null
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PewosaGroupDistributionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load applications and group members', () => {
    expect(component).toBeTruthy();
    expect(component.groupId).toBe(105);
    expect(component.selectedApplicationId).toBe(10);
    expect(component.reconciled).toBe(true);
    expect(component.totalDistributed).toBe(5000000);
  });

  it('should detect allocation mismatch and disallow saving when not reconciled', () => {
    // Change one member's allocation to 2,000,000 so total is 4,500,000 instead of 5,000,000
    component.distributionsArray.at(0).patchValue({ approvedAmount: 2000000 });
    component.calculateReconciliation();

    expect(component.totalDistributed).toBe(4500000);
    expect(component.reconciled).toBe(false);

    component.saveDistribution();
    expect(lendingServiceMock.saveLoanDistribution).not.toHaveBeenCalled();
    expect(alertServiceMock.alert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DANGER' })
    );
  });

  it('should save distribution when exact reconciliation is satisfied', () => {
    component.saveDistribution();
    expect(lendingServiceMock.saveLoanDistribution).toHaveBeenCalledWith(
      105,
      10,
      expect.objectContaining({
        distributions: expect.any(Array)
      })
    );
    expect(alertServiceMock.alert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SUCCESS' })
    );
  });
});
