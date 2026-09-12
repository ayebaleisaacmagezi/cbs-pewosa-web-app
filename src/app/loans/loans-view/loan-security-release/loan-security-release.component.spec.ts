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
import { LoanClosureReadiness, SecurityReleaseResponse } from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { IconsModule } from 'app/shared/icons.module';
import { LoanSecurityReleaseComponent } from './loan-security-release.component';

describe('LoanSecurityReleaseComponent', () => {
  let component: LoanSecurityReleaseComponent;
  let fixture: ComponentFixture<LoanSecurityReleaseComponent>;
  let mockServicingService: jest.Mocked<Partial<PewosaLoanServicingService>>;
  let mockAuthService: jest.Mocked<Partial<AuthenticationService>>;

  const mockReadiness: LoanClosureReadiness = {
    loanId: 105,
    accountNo: '000000105',
    currencyCode: 'UGX',
    loanVersion: 3,
    loanStatus: 'ACTIVE',
    totalOutstanding: 0.0,
    principalOutstanding: 0.0,
    interestOutstanding: 0.0,
    feeOutstanding: 0.0,
    penaltyOutstanding: 0.0,
    isFullyPaid: true,
    unreleasedSecuritiesCount: 1,
    unreleasedSecurities: [
      {
        securityType: 'COLLATERAL',
        securityId: 41,
        securityVersion: 1,
        description: 'Land Title Reg 4492/Plot 12',
        isReleased: false
      }
    ],
    readyForClosure: false,
    blockingReasons: ['UNRELEASED_SECURITIES'],
    securityReleaseAllowed: true,
    securityReleaseFailedRules: []
  };

  const mockReleaseResponse: SecurityReleaseResponse = {
    loanId: 105,
    securityType: 'COLLATERAL',
    securityId: 41,
    isReleased: true,
    releasedOnUtc: '2026-09-12T11:00:00Z',
    releasedByName: 'Mary Namutebi'
  };

  beforeEach(async () => {
    mockServicingService = {
      getClosureReadiness: jest.fn().mockReturnValue(of(mockReadiness)),
      releaseSecurity: jest.fn().mockReturnValue(of(mockReleaseResponse))
    };

    mockAuthService = {
      getCredentials: jest.fn().mockReturnValue({
        permissions: ['RELEASE_PEWOSASECURITY']
      })
    };

    await TestBed.configureTestingModule({
      imports: [
        LoanSecurityReleaseComponent,
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
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: { loanId: '105' } },
            parent: { snapshot: { params: { loanId: '105' } } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanSecurityReleaseComponent);
    component = fixture.componentInstance;
  });

  it('should create the security release component', () => {
    expect(component).toBeTruthy();
  });

  it('should use backend release eligibility instead of calculating from the balance', () => {
    mockServicingService.getClosureReadiness.mockReturnValue(
      of({ ...mockReadiness, totalOutstanding: 150000, securityReleaseAllowed: true })
    );

    fixture.detectChanges();

    component.releaseForm.patchValue({
      securityId: 41,
      releaseReason: 'LOAN_FULLY_PAID',
      releaseNotes: 'Returned title'
    });

    component.submitRelease();

    expect(mockServicingService.releaseSecurity).toHaveBeenCalled();
  });

  it('should release security when fully paid with expected versions', () => {
    fixture.detectChanges();

    component.releaseForm.patchValue({
      securityId: 41,
      releaseReason: 'LOAN_FULLY_PAID',
      releaseNotes: 'Returned title with signed receipt',
      acknowledgementDocumentId: '520',
      idempotencyKey: 'TEST-REL-KEY'
    });

    component.submitRelease();

    expect(mockServicingService.releaseSecurity).toHaveBeenCalledWith(
      105,
      'COLLATERAL',
      41,
      expect.objectContaining({
        expectedLoanVersion: 3,
        expectedSecurityVersion: 1,
        idempotencyKey: 'TEST-REL-KEY',
        releaseReason: 'LOAN_FULLY_PAID',
        releaseNotes: 'Returned title with signed receipt',
        acknowledgementDocumentId: '520'
      })
    );
    expect(component.releasedSecurities.length).toBe(1);
    expect(component.successMessage).toContain('successfully released');
  });

  it('should handle 409 concurrency conflict on security release', () => {
    mockServicingService.releaseSecurity.mockReturnValue(throwError(() => ({ status: 409 })));

    fixture.detectChanges();

    component.releaseForm.patchValue({
      securityId: 41,
      releaseReason: 'LOAN_FULLY_PAID',
      releaseNotes: 'Returned title'
    });

    component.submitRelease();

    expect(component.conflictError).toContain('Optimistic lock conflict');
  });

  it('should deny access if user lacks RELEASE_PEWOSASECURITY permission', () => {
    mockAuthService.getCredentials.mockReturnValue({
      permissions: ['SOME_OTHER_PERMISSION']
    } as any);

    const unauthFixture = TestBed.createComponent(LoanSecurityReleaseComponent);
    const unauthComp = unauthFixture.componentInstance;
    unauthFixture.detectChanges();

    expect(unauthComp.denied).toBe(true);
    expect(unauthComp.errorMessage).toContain('RELEASE_PEWOSASECURITY');
  });
});
