/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { LoanApprovalQueueItem, LoanApprovalQueueResponse } from '../pewosa-loan-application.models';
import { PewosaLoanApplicationService } from '../pewosa-loan-application.service';
import { LoanApprovalQueueComponent } from './loan-approval-queue.component';

describe('LoanApprovalQueueComponent', () => {
  let component: LoanApprovalQueueComponent;
  let fixture: ComponentFixture<LoanApprovalQueueComponent>;
  let mockRouter: any;
  let mockLoanService: any;
  let mockAuthService: any;

  const mockQueueResponse: LoanApprovalQueueResponse = {
    totalFilteredRecords: 2,
    page: 0,
    size: 20,
    pageItems: [
      {
        approvalCaseId: 10,
        loanId: 100,
        clientId: 20,
        officeId: 1,
        loanAccountNo: '000000100',
        clientName: 'Alice Nakato',
        clientAccountNo: 'CLI001',
        productName: 'PEWOSA Business Loan',
        officeName: 'Head Office',
        currencyCode: 'UGX',
        routedAmount: 5000000,
        proposedPrincipal: 5000000,
        requiredAuthority: 'BRANCH_MANAGER',
        status: 'PENDING',
        caseVersion: 1,
        createdOn: '2026-09-12T10:00:00Z',
        conditionCount: 0,
        evidenceCount: 0,
        isEvidenceReady: true
      },
      {
        approvalCaseId: 11,
        loanId: 101,
        clientId: 21,
        officeId: 1,
        loanAccountNo: '000000101',
        clientName: 'Bob Mukasa',
        clientAccountNo: 'CLI002',
        productName: 'PEWOSA Agriculture Loan',
        officeName: 'Head Office',
        currencyCode: 'UGX',
        routedAmount: 15000000,
        proposedPrincipal: 15000000,
        requiredAuthority: 'CREDIT_COMMITTEE',
        status: 'CONDITIONAL',
        caseVersion: 2,
        createdOn: '2026-09-12T11:00:00Z',
        conditionCount: 2,
        evidenceCount: 1,
        isEvidenceReady: false
      }
    ]
  };

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn()
    };

    mockLoanService = {
      getApprovalQueue: jest.fn().mockReturnValue(of(mockQueueResponse))
    };

    mockAuthService = {
      getCredentials: jest.fn().mockReturnValue({
        permissions: ['READ_PEWOSALOANAPPROVAL', 'APPROVE_PEWOSALOANBRANCHMANAGER']
      })
    };

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        TranslateModule.forRoot(),
        LoanApprovalQueueComponent
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: PewosaLoanApplicationService, useValue: mockLoanService },
        { provide: AuthenticationService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanApprovalQueueComponent);
    component = fixture.componentInstance;
  });

  it('should initialize and load approval queue when user has read permission', () => {
    fixture.detectChanges();

    expect(component.denied).toBe(false);
    expect(mockLoanService.getApprovalQueue).toHaveBeenCalledWith({
      authority: undefined,
      page: 0,
      size: 20
    });
    expect(component.items.length).toBe(2);
    expect(component.totalFilteredRecords).toBe(2);
  });

  it('should set denied=true and not fetch queue when user lacks approval read permissions', () => {
    mockAuthService.getCredentials.mockReturnValue({ permissions: [] });
    fixture = TestBed.createComponent(LoanApprovalQueueComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.denied).toBe(true);
    expect(mockLoanService.getApprovalQueue).not.toHaveBeenCalled();
  });

  it('should handle 403 error by marking state as denied', () => {
    mockLoanService.getApprovalQueue.mockReturnValue(throwError(() => ({ status: 403 })));
    fixture.detectChanges();

    expect(component.denied).toBe(true);
    expect(component.loading).toBe(false);
  });

  it('should handle general error by setting errorMessage and allow retry', () => {
    mockLoanService.getApprovalQueue.mockReturnValue(throwError(() => new Error('Server down')));
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Approval queue could not be loaded.');
    expect(component.loading).toBe(false);

    // Test retry
    mockLoanService.getApprovalQueue.mockReturnValue(of(mockQueueResponse));
    component.retry();
    expect(component.errorMessage).toBeNull();
    expect(component.items.length).toBe(2);
  });

  it('should handle pagination changes', () => {
    fixture.detectChanges();

    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 20 });
    expect(component.page).toBe(1);
    expect(component.pageSize).toBe(10);
    expect(mockLoanService.getApprovalQueue).toHaveBeenCalledWith({
      authority: undefined,
      page: 1,
      size: 10
    });
  });

  it('should handle authority filter change and reset page to 0', () => {
    fixture.detectChanges();

    component.page = 2;
    component.onAuthorityChange('BRANCH_MANAGER');
    expect(component.page).toBe(0);
    expect(component.selectedAuthority).toBe('BRANCH_MANAGER');
    expect(mockLoanService.getApprovalQueue).toHaveBeenCalledWith({
      authority: 'BRANCH_MANAGER',
      page: 0,
      size: 20
    });
  });

  it('should correctly evaluate canReview based on requiredAuthority and user permissions', () => {
    const branchManagerItem = mockQueueResponse.pageItems[0];
    const creditCommitteeItem = mockQueueResponse.pageItems[1];

    // User has APPROVE_PEWOSALOANBRANCHMANAGER
    expect(component.canReview(branchManagerItem)).toBe(true);
    expect(component.canReview(creditCommitteeItem)).toBe(false);

    // User with ALL_FUNCTIONS
    mockAuthService.getCredentials.mockReturnValue({ permissions: ['ALL_FUNCTIONS'] });
    expect(component.canReview(creditCommitteeItem)).toBe(true);
  });

  it('should navigate to loan approval tab on navigateToApproval', () => {
    const item = mockQueueResponse.pageItems[0];
    component.navigateToApproval(item);

    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/clients',
      item.clientId,
      'loans-accounts',
      item.loanId,
      'approval'
    ]);
  });
});
