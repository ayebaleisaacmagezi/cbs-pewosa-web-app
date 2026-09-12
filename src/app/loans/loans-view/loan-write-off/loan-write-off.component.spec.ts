/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Dates } from 'app/core/utils/dates';
import {
  LoanRecoveryResponse,
  LoanServicingSummary,
  LoanWriteOffResponse
} from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { IconsModule } from 'app/shared/icons.module';
import { LoanWriteOffComponent } from './loan-write-off.component';

describe('LoanWriteOffComponent', () => {
  let component: LoanWriteOffComponent;
  let fixture: ComponentFixture<LoanWriteOffComponent>;
  let mockServicingService: jest.Mocked<Partial<PewosaLoanServicingService>>;
  let mockAuthService: jest.Mocked<Partial<AuthenticationService>>;
  let mockDates: Partial<Dates>;

  const mockSummary: LoanServicingSummary = {
    loanId: 105,
    accountNo: '000000105',
    loanVersion: 3,
    clientId: 34,
    clientName: 'Grace Nakitto',
    officeId: 2,
    officeName: 'Masaka Branch',
    loanStatus: 'ACTIVE',
    currencyCode: 'UGX',
    principalDisbursed: 5000000,
    principalPaid: 2200000,
    principalWrittenOff: 0,
    principalOutstanding: 2800000,
    principalOverdue: 0,
    interestCharged: 800000,
    interestPaid: 450000,
    interestWaived: 0,
    interestWrittenOff: 0,
    interestOutstanding: 350000,
    interestOverdue: 0,
    feeChargesCharged: 150000,
    feeChargesPaid: 100000,
    feeChargesWaived: 0,
    feeChargesWrittenOff: 0,
    feeChargesOutstanding: 50000,
    feeChargesOverdue: 0,
    penaltyChargesCharged: 50000,
    penaltyChargesPaid: 0,
    penaltyChargesWaived: 0,
    penaltyChargesWrittenOff: 0,
    penaltyChargesOutstanding: 50000,
    penaltyChargesOverdue: 50000,
    totalExpectedRepayment: 6000000,
    totalRepayment: 2750000,
    totalOutstanding: 3250000,
    totalOverdue: 50000,
    daysInArrears: 180,
    classification: 'LOSS',
    provisionPercentage: 100,
    provisionAmount: 3250000,
    repaymentAllocationPolicy: 'mifos-standard-strategy',
    eligibleActions: {
      canRestructure: false,
      canWriteOff: true,
      canRecover: false,
      canReleaseSecurity: false,
      canClose: false
    }
  };

  const mockWriteOffResponse: LoanWriteOffResponse = {
    loanId: 105,
    nativeTransactionId: 602,
    writtenOffPrincipal: 2800000,
    writtenOffInterest: 350000,
    writtenOffFee: 50000,
    writtenOffPenalty: 50000,
    totalWrittenOff: 3250000,
    status: 'WRITTEN_OFF',
    writtenOffOn: '2026-09-12'
  };

  const mockRecoveryResponse: LoanRecoveryResponse = {
    loanId: 105,
    recoveryTransactionId: 605,
    amount: 500000,
    transactionDate: '2026-09-12',
    totalRecoveredToDate: 500000,
    receiptNumber: 'REC-REC-0012'
  };

  beforeEach(async () => {
    mockServicingService = {
      getLoanServicingSummary: jest.fn().mockReturnValue(of(mockSummary)),
      executeWriteOff: jest.fn().mockReturnValue(of(mockWriteOffResponse)),
      recordRecovery: jest.fn().mockReturnValue(of(mockRecoveryResponse))
    };

    mockAuthService = {
      getCredentials: jest.fn().mockReturnValue({
        permissions: ['CREATE_PEWOSAWRITEOFF', 'CREATE_PEWOSARECOVERY']
      })
    };

    mockDates = {
      formatDate: jest.fn((d: Date) => '2026-09-12')
    };

    await TestBed.configureTestingModule({
      imports: [
        LoanWriteOffComponent,
        ReactiveFormsModule,
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
        { provide: Dates, useValue: mockDates },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: { loanId: '105' } },
            parent: { snapshot: { params: { loanId: '105' } } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanWriteOffComponent);
    component = fixture.componentInstance;
  });

  it('should create the write-off component', () => {
    expect(component).toBeTruthy();
  });

  it('should reject write-off submission when total outstanding is zero', () => {
    mockServicingService.getLoanServicingSummary.mockReturnValue(
      of({ ...mockSummary, totalOutstanding: 0 })
    );

    fixture.detectChanges();
    component.writeOffForm.patchValue({
      transactionDate: new Date('2026-09-12'),
      reason: 'EXHAUSTED_RECOVERY',
      governanceReference: 'BR-2026-Q3-014',
      explanation: 'All avenues exhausted'
    });

    component.submitWriteOff();

    expect(component.errorMessage).toContain('positive outstanding balance');
    expect(mockServicingService.executeWriteOff).not.toHaveBeenCalled();
  });

  it('should submit write-off with expected version and idempotency key', () => {
    fixture.detectChanges();

    component.writeOffForm.patchValue({
      transactionDate: new Date('2026-09-12'),
      reason: 'EXHAUSTED_RECOVERY',
      governanceReference: 'BR-2026-Q3-014',
      explanation: 'All avenues exhausted',
      evidenceDocumentIds: 'DOC-512, DOC-513',
      idempotencyKey: 'TEST-WO-KEY'
    });

    component.submitWriteOff();

    expect(mockServicingService.executeWriteOff).toHaveBeenCalledWith(
      105,
      expect.objectContaining({
        expectedLoanVersion: 3,
        idempotencyKey: 'TEST-WO-KEY',
        transactionDate: '2026-09-12',
        reason: 'EXHAUSTED_RECOVERY',
        governanceReference: 'BR-2026-Q3-014',
        explanation: 'All avenues exhausted',
        evidenceDocumentIds: ['DOC-512', 'DOC-513']
      })
    );
    expect(component.writeOffResult).toEqual(mockWriteOffResponse);
    expect(component.summary?.loanStatus).toBe('WRITTEN_OFF');
  });

  it('should handle 409 concurrency conflict on write-off', () => {
    mockServicingService.executeWriteOff.mockReturnValue(
      throwError(() => ({ status: 409 }))
    );

    fixture.detectChanges();
    component.writeOffForm.patchValue({
      transactionDate: new Date('2026-09-12'),
      reason: 'EXHAUSTED_RECOVERY',
      governanceReference: 'BR-2026-Q3-014',
      explanation: 'All avenues exhausted'
    });

    component.submitWriteOff();

    expect(component.conflictError).toContain('Concurrency conflict');
  });

  it('should submit recovery payment when loan status is WRITTEN_OFF', () => {
    mockServicingService.getLoanServicingSummary.mockReturnValue(
      of({ ...mockSummary, loanStatus: 'WRITTEN_OFF' })
    );

    fixture.detectChanges();

    component.recoveryForm.patchValue({
      transactionDate: new Date('2026-09-12'),
      amount: 500000,
      paymentTypeId: 1,
      receiptNumber: 'REC-REC-0012',
      notes: 'Guarantor settlement',
      idempotencyKey: 'REC-TEST-KEY'
    });

    component.submitRecovery();

    expect(mockServicingService.recordRecovery).toHaveBeenCalledWith(
      105,
      expect.objectContaining({
        expectedLoanVersion: 3,
        idempotencyKey: 'REC-TEST-KEY',
        amount: 500000,
        paymentTypeId: 1,
        receiptNumber: 'REC-REC-0012'
      })
    );
    expect(component.recoveryResult).toEqual(mockRecoveryResponse);
  });
});
