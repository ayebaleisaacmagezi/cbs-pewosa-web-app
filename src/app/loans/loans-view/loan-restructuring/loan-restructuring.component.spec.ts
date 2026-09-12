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
  LoanServicingSummary,
  RestructuringDecisionResponse,
  RestructuringExecutionResponse,
  RestructuringProposal
} from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { IconsModule } from 'app/shared/icons.module';
import { LoanRestructuringComponent } from './loan-restructuring.component';

describe('LoanRestructuringComponent', () => {
  let component: LoanRestructuringComponent;
  let fixture: ComponentFixture<LoanRestructuringComponent>;
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
    daysInArrears: 14,
    classification: 'PERFORMING',
    provisionPercentage: 1,
    provisionAmount: 32500,
    repaymentAllocationPolicy: 'mifos-standard-strategy',
    eligibleActions: {
      canRestructure: true,
      canWriteOff: false,
      canRecover: false,
      canReleaseSecurity: false,
      canClose: false
    }
  };

  const mockProposal: RestructuringProposal = {
    proposalId: 12,
    loanId: 105,
    status: 'SUBMITTED',
    version: 1,
    reason: 'ECONOMIC_HARDSHIP',
    explanation: 'Seasonal crop yield drop.',
    submittedBy: 19,
    submittedByName: 'Loan Officer John',
    submittedOnUtc: '2026-09-12T10:00:00Z',
    originalTermsSnapshot: {
      principalOutstanding: 2800000,
      interestOutstanding: 350000,
      feeOutstanding: 50000,
      penaltyOutstanding: 50000,
      termRemainingMonths: 6,
      nominalInterestRate: 18.0
    },
    proposedTerms: {
      rescheduleFromDate: '2026-10-01',
      graceOnPrincipal: 3,
      graceOnInterest: 0,
      extraTerms: 6,
      newInterestRate: 15.0
    }
  };

  beforeEach(async () => {
    mockServicingService = {
      getLoanServicingSummary: jest.fn().mockReturnValue(of(mockSummary)),
      submitRestructuringProposal: jest.fn().mockReturnValue(of(mockProposal)),
      recordProposalDecision: jest.fn().mockReturnValue(
        of({
          proposalId: 12,
          loanId: 105,
          status: 'APPROVED',
          version: 2,
          decision: 'APPROVED',
          comments: 'Approved by BM'
        } as RestructuringDecisionResponse)
      ),
      executeRestructuringProposal: jest.fn().mockReturnValue(
        of({
          proposalId: 12,
          loanId: 105,
          status: 'EXECUTED',
          postOperationLoanStatus: 'ACTIVE',
          postOperationDaysInArrears: 0,
          postOperationDelinquencyClassification: 'PERFORMING',
          newScheduleInstallmentCount: 12,
          newOutstandingBalance: 3250000
        } as RestructuringExecutionResponse)
      )
    };

    mockAuthService = {
      getCredentials: jest.fn().mockReturnValue({
        userId: 25,
        permissions: [
          'CREATE_PEWOSARESTRUCTURING',
          'APPROVE_PEWOSARESTRUCTURING',
          'EXECUTE_PEWOSARESTRUCTURING'
        ]
      })
    };

    mockDates = {
      formatDate: jest.fn((d: Date) => '2026-10-01')
    };

    await TestBed.configureTestingModule({
      imports: [
        LoanRestructuringComponent,
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

    fixture = TestBed.createComponent(LoanRestructuringComponent);
    component = fixture.componentInstance;
  });

  it('should create the restructuring component', () => {
    expect(component).toBeTruthy();
  });

  it('should validate form and submit restructuring proposal with expected version', () => {
    fixture.detectChanges();

    component.proposalForm.patchValue({
      reason: 'ECONOMIC_HARDSHIP',
      explanation: 'Seasonal crop yield drop.',
      rescheduleFromDate: new Date('2026-10-01'),
      graceOnPrincipal: 3,
      graceOnInterest: 0,
      extraTerms: 6,
      newInterestRate: 15.0,
      evidenceDocumentIds: 'DOC-101, DOC-102'
    });

    component.submitProposal();

    expect(mockServicingService.submitRestructuringProposal).toHaveBeenCalledWith(
      105,
      expect.objectContaining({
        expectedLoanVersion: 3,
        reason: 'ECONOMIC_HARDSHIP',
        graceOnPrincipal: 3,
        extraTerms: 6,
        newInterestRate: 15.0,
        evidenceDocumentIds: [
          'DOC-101',
          'DOC-102'
        ]
      })
    );
    expect(component.activeProposal).toEqual(mockProposal);
  });

  it('should handle 409 concurrency conflict on proposal submission', () => {
    mockServicingService.submitRestructuringProposal.mockReturnValue(throwError(() => ({ status: 409 })));

    fixture.detectChanges();
    component.proposalForm.patchValue({
      reason: 'ECONOMIC_HARDSHIP',
      rescheduleFromDate: new Date('2026-10-01')
    });

    component.submitProposal();

    expect(component.conflictError).toContain('Optimistic lock conflict');
  });

  it('should block author from approving their own proposal (maker-checker violation)', () => {
    fixture.detectChanges();
    component.activeProposal = { ...mockProposal, submittedBy: 25 }; // User ID is 25

    component.decisionForm.patchValue({
      decision: 'APPROVED',
      comments: 'Self approval attempt'
    });

    component.submitDecision();

    expect(component.errorMessage).toContain('Maker-checker');
    expect(mockServicingService.recordProposalDecision).not.toHaveBeenCalled();
  });

  it('should record decision when approver is different from author', () => {
    fixture.detectChanges();
    component.activeProposal = { ...mockProposal, submittedBy: 19 }; // User is 25

    component.decisionForm.patchValue({
      decision: 'APPROVED',
      comments: 'Verified by branch manager'
    });

    component.submitDecision();

    expect(mockServicingService.recordProposalDecision).toHaveBeenCalledWith(
      105,
      12,
      expect.objectContaining({
        expectedProposalVersion: 1,
        decision: 'APPROVED',
        comments: 'Verified by branch manager'
      })
    );
    expect(component.activeProposal.status).toBe('APPROVED');
  });

  it('should execute approved proposal and record native post-operation state', () => {
    fixture.detectChanges();
    component.activeProposal = { ...mockProposal, status: 'APPROVED', version: 2 };

    component.executionForm.patchValue({
      executionDate: new Date('2026-10-01'),
      rescheduleReasonId: 4,
      idempotencyKey: 'EXEC-TEST-001'
    });

    component.executeProposal();

    expect(mockServicingService.executeRestructuringProposal).toHaveBeenCalledWith(
      105,
      12,
      expect.objectContaining({
        expectedProposalVersion: 2,
        expectedLoanVersion: 3,
        rescheduleReasonId: 4,
        idempotencyKey: 'EXEC-TEST-001'
      })
    );
    expect(component.executionResult?.postOperationLoanStatus).toBe('ACTIVE');
    expect(component.activeProposal.status).toBe('EXECUTED');
  });
});
