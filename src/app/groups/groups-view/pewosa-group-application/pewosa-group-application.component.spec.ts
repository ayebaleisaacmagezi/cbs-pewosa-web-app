/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PewosaGroupApplicationComponent } from './pewosa-group-application.component';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import { AlertService } from 'app/core/alert/alert.service';
import { DatePipe } from '@angular/common';
import { Dates } from 'app/core/utils/dates';
import { SettingsService } from 'app/settings/settings.service';
import {
  PewosaGroupLoanApplicationResponse,
  PewosaGroupEvidenceResponse,
  PewosaGroupEligibilityResponse
} from 'app/groups/pewosa-group-lending.models';

describe('PewosaGroupApplicationComponent', () => {
  let component: PewosaGroupApplicationComponent;
  let fixture: ComponentFixture<PewosaGroupApplicationComponent>;
  let lendingServiceMock: any;
  let alertServiceMock: any;
  let routerMock: any;

  const mockApp: PewosaGroupLoanApplicationResponse = {
    id: 1,
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

  const mockEvidence: PewosaGroupEvidenceResponse = {
    id: 10,
    groupId: 105,
    evidenceType: 'RESOLUTION',
    fileName: 'resolution.pdf',
    contentType: 'application/pdf',
    stage: 'SUBMISSION',
    status: 'PENDING',
    submittedBy: 'officer1',
    submittedDate: '2026-09-12T10:00:00Z'
  };

  const mockElig: PewosaGroupEligibilityResponse = {
    reference: 'GPE-105-20260912-1001',
    groupId: 105,
    groupName: 'Solidarity Group',
    loanProductId: 1,
    loanProductName: 'Group Loan',
    policyVersion: 1,
    requestedTotalAmount: 5000000,
    evaluatedOn: '2026-09-12T09:00:00Z',
    evaluatedBy: 'mifos',
    eligible: true,
    overallOutcome: 'ELIGIBLE',
    factsSnapshot: {} as any,
    rules: []
  };

  beforeEach(async () => {
    lendingServiceMock = {
      listLoanApplications: jest.fn().mockReturnValue(of([mockApp])),
      listEvidence: jest.fn().mockReturnValue(of([mockEvidence])),
      listEligibility: jest.fn().mockReturnValue(of([mockElig])),
      createLoanApplication: jest.fn().mockReturnValue(of(mockApp)),
      submitEvidence: jest.fn().mockReturnValue(of(mockEvidence)),
      verifyEvidence: jest.fn().mockReturnValue(of({ ...mockEvidence, status: 'VERIFIED', verifiedBy: 'checker1' }))
    };

    alertServiceMock = {
      alert: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PewosaGroupApplicationComponent, NoopAnimationsModule],
      providers: [
        DatePipe,
        Dates,
        { provide: PewosaGroupLendingService, useValue: lendingServiceMock },
        { provide: AlertService, useValue: alertServiceMock },
        { provide: Router, useValue: routerMock },
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

    fixture = TestBed.createComponent(PewosaGroupApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load applications, evidence, and eligibility snapshots', () => {
    expect(component).toBeTruthy();
    expect(component.groupId).toBe(105);
    expect(lendingServiceMock.listLoanApplications).toHaveBeenCalledWith(105);
    expect(lendingServiceMock.listEvidence).toHaveBeenCalledWith(105);
    expect(lendingServiceMock.listEligibility).toHaveBeenCalledWith(105);
    expect(component.applications.length).toBe(1);
    expect(component.evidenceList.length).toBe(1);
  });

  it('should submit application when form is valid', () => {
    component.submitApplication();
    expect(lendingServiceMock.createLoanApplication).toHaveBeenCalledWith(
      105,
      expect.objectContaining({
        eligibilityReference: 'GPE-105-20260912-1001',
        requestedAmount: 5000000,
        jointLiabilityAgreed: true
      })
    );
    expect(alertServiceMock.alert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SUCCESS' })
    );
  });

  it('should verify evidence item', () => {
    component.verifyEvidence(mockEvidence, 'VERIFIED');
    expect(lendingServiceMock.verifyEvidence).toHaveBeenCalledWith(105, 10, { decision: 'VERIFIED' });
    expect(component.evidenceList[0].status).toBe('VERIFIED');
  });
});
