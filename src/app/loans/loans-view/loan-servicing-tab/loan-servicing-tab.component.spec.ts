/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import {
  LoanServicingSummary,
  LoanServicingTimelineResponse
} from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { IconsModule } from 'app/shared/icons.module';
import { LoanServicingTabComponent } from './loan-servicing-tab.component';

describe('LoanServicingTabComponent', () => {
  let component: LoanServicingTabComponent;
  let fixture: ComponentFixture<LoanServicingTabComponent>;
  let mockServicingService: jest.Mocked<Partial<PewosaLoanServicingService>>;
  let mockAuthService: jest.Mocked<Partial<AuthenticationService>>;

  const mockSummary: LoanServicingSummary = {
    loanId: 105,
    accountNo: '000000105',
    loanVersion: 3,
    clientId: 34,
    clientName: 'Grace Nakitto',
    officeId: 2,
    officeName: 'Masaka Branch',
    loanOfficerId: 12,
    loanOfficerName: 'Peter Ssemwogerere',
    loanStatus: 'ACTIVE',
    currencyCode: 'UGX',
    principalDisbursed: 5000000.0,
    principalPaid: 2200000.0,
    principalWrittenOff: 0.0,
    principalOutstanding: 2800000.0,
    principalOverdue: 0.0,
    interestCharged: 800000.0,
    interestPaid: 450000.0,
    interestWaived: 0.0,
    interestWrittenOff: 0.0,
    interestOutstanding: 350000.0,
    interestOverdue: 0.0,
    feeChargesCharged: 150000.0,
    feeChargesPaid: 100000.0,
    feeChargesWaived: 0.0,
    feeChargesWrittenOff: 0.0,
    feeChargesOutstanding: 50000.0,
    feeChargesOverdue: 0.0,
    penaltyChargesCharged: 50000.0,
    penaltyChargesPaid: 0.0,
    penaltyChargesWaived: 0.0,
    penaltyChargesWrittenOff: 0.0,
    penaltyChargesOutstanding: 50000.0,
    penaltyChargesOverdue: 50000.0,
    totalExpectedRepayment: 6000000.0,
    totalRepayment: 2750000.0,
    totalOutstanding: 3250000.0,
    totalOverdue: 50000.0,
    daysInArrears: 14,
    classification: 'PERFORMING',
    provisionPercentage: 1.0,
    provisionAmount: 32500.0,
    lastPaymentDate: '2026-08-20',
    lastPaymentAmount: 450000.0,
    nextPaymentDueDate: '2026-09-20',
    nextPaymentAmount: 450000.0,
    repaymentAllocationPolicy: 'mifos-standard-strategy',
    eligibleActions: {
      canRestructure: true,
      canWriteOff: false,
      canRecover: false,
      canReleaseSecurity: false,
      canClose: false
    }
  };

  const mockTimeline: LoanServicingTimelineResponse = {
    loanId: 105,
    totalElements: 2,
    page: 0,
    size: 50,
    events: [
      {
        eventId: 'TXN-501',
        eventType: 'REPAYMENT',
        eventDate: '2026-08-20',
        submittedOnDate: '2026-08-20',
        amount: 450000.0,
        principalPortion: 350000.0,
        interestPortion: 100000.0,
        feePortion: 0.0,
        penaltyPortion: 0.0,
        outstandingBalanceAfter: 3250000.0,
        referenceNumber: 'REC-9942',
        description: 'Branch teller repayment via Cash',
        isReversed: false,
        createdByName: 'Joyce Namuli'
      },
      {
        eventId: 'DISB-101',
        eventType: 'DISBURSEMENT',
        eventDate: '2026-06-20',
        submittedOnDate: '2026-06-20',
        amount: 5000000.0,
        principalPortion: 5000000.0,
        interestPortion: 0.0,
        feePortion: 150000.0,
        penaltyPortion: 0.0,
        outstandingBalanceAfter: 5000000.0,
        referenceNumber: 'DISB-105-01',
        description: 'Disbursement to savings account',
        isReversed: false,
        createdByName: 'Peter Ssemwogerere'
      }
    ]
  };

  beforeEach(async () => {
    mockServicingService = {
      getLoanServicingSummary: jest.fn().mockReturnValue(of(mockSummary)),
      getLoanServicingTimeline: jest.fn().mockReturnValue(of(mockTimeline))
    };

    mockAuthService = {
      getCredentials: jest.fn().mockReturnValue({
        permissions: ['READ_PEWOSALOANSERVICING', 'CREATE_PEWOSARESTRUCTURING']
      })
    };

    await TestBed.configureTestingModule({
      imports: [
        LoanServicingTabComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
        IconsModule
      ],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        DatePipe,
        DecimalPipe,
        { provide: PewosaLoanServicingService, useValue: mockServicingService },
        { provide: AuthenticationService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: { loanId: '105' } },
            parent: { snapshot: { params: { loanId: '105' } } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanServicingTabComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load summary and timeline data on init when user has permission', () => {
    fixture.detectChanges();

    expect(mockServicingService.getLoanServicingSummary).toHaveBeenCalledWith(105);
    expect(mockServicingService.getLoanServicingTimeline).toHaveBeenCalledWith(105, 0, 50);
    expect(component.summary).toEqual(mockSummary);
    expect(component.timelineEvents.length).toBe(2);
    expect(component.loading).toBe(false);
    expect(component.denied).toBe(false);
  });

  it('should allow access if user has ALL_FUNCTIONS_READ', () => {
    mockAuthService.getCredentials.mockReturnValue({
      permissions: ['ALL_FUNCTIONS_READ']
    });

    const altFixture = TestBed.createComponent(LoanServicingTabComponent);
    const altComp = altFixture.componentInstance;
    altFixture.detectChanges();

    expect(altComp.hasReadPermission).toBe(true);
    expect(altComp.denied).toBe(false);
  });

  it('should deny access if user lacks servicing read permissions', () => {
    mockAuthService.getCredentials.mockReturnValue({
      permissions: ['SOME_OTHER_PERMISSION']
    });

    const unauthFixture = TestBed.createComponent(LoanServicingTabComponent);
    const unauthComp = unauthFixture.componentInstance;
    unauthFixture.detectChanges();

    expect(unauthComp.denied).toBe(true);
    expect(unauthComp.errorMessage).toContain('READ_PEWOSALOANSERVICING');
    expect(mockServicingService.getLoanServicingSummary).not.toHaveBeenCalled();
  });

  it('should handle 403 error on data load', () => {
    mockServicingService.getLoanServicingSummary.mockReturnValue(
      throwError(() => ({ status: 403 }))
    );

    fixture.detectChanges();

    expect(component.denied).toBe(true);
    expect(component.errorMessage).toContain('permission');
    expect(component.loading).toBe(false);
  });

  it('should handle network error and allow retry', () => {
    mockServicingService.getLoanServicingSummary.mockReturnValue(
      throwError(() => ({ message: 'Network disconnected' }))
    );

    fixture.detectChanges();

    expect(component.denied).toBe(false);
    expect(component.errorMessage).toBe('Network disconnected');

    // Retry
    mockServicingService.getLoanServicingSummary.mockReturnValue(of(mockSummary));
    component.loadServicingData();

    expect(component.summary).toEqual(mockSummary);
    expect(component.errorMessage).toBeNull();
  });

  it('should update page and reload timeline only on page event', () => {
    fixture.detectChanges();

    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 2 });

    expect(component.pageIndex).toBe(1);
    expect(component.pageSize).toBe(20);
    expect(mockServicingService.getLoanServicingTimeline).toHaveBeenCalledWith(105, 1, 20);
  });
});
