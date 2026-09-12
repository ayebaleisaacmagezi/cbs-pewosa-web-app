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
import { LoanCloseResponse, LoanClosureReadiness } from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { IconsModule } from 'app/shared/icons.module';
import { LoanClosureComponent } from './loan-closure.component';

describe('LoanClosureComponent', () => {
  let component: LoanClosureComponent;
  let fixture: ComponentFixture<LoanClosureComponent>;
  let mockServicingService: jest.Mocked<Partial<PewosaLoanServicingService>>;
  let mockAuthService: jest.Mocked<Partial<AuthenticationService>>;
  let mockDates: Partial<Dates>;

  const mockBlockedReadiness: LoanClosureReadiness = {
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
    blockingReasons: [
      'UNRELEASED_SECURITIES: 1 security item(s) must be released before loan closure.'
    ],
    securityReleaseAllowed: true,
    securityReleaseFailedRules: []
  };

  const mockReadyReadiness: LoanClosureReadiness = {
    loanId: 105,
    accountNo: '000000105',
    currencyCode: 'UGX',
    loanVersion: 4,
    loanStatus: 'ACTIVE',
    totalOutstanding: 0.0,
    principalOutstanding: 0.0,
    interestOutstanding: 0.0,
    feeOutstanding: 0.0,
    penaltyOutstanding: 0.0,
    isFullyPaid: true,
    unreleasedSecuritiesCount: 0,
    unreleasedSecurities: [],
    readyForClosure: true,
    blockingReasons: [],
    securityReleaseAllowed: true,
    securityReleaseFailedRules: []
  };

  const mockCloseResponse: LoanCloseResponse = {
    loanId: 105,
    accountNo: '000000105',
    loanStatus: 'CLOSED_OBLIGATIONS_MET',
    closedOnDate: '2026-09-12',
    closedByName: 'Mary Namutebi'
  };

  beforeEach(async () => {
    mockServicingService = {
      getClosureReadiness: jest.fn().mockReturnValue(of(mockBlockedReadiness)),
      closeLoan: jest.fn().mockReturnValue(of(mockCloseResponse))
    };

    mockAuthService = {
      getCredentials: jest.fn().mockReturnValue({
        permissions: ['CLOSE_PEWOSALOAN']
      })
    };

    mockDates = {
      formatDate: jest.fn((d: Date) => '2026-09-12')
    };

    await TestBed.configureTestingModule({
      imports: [
        LoanClosureComponent,
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

    fixture = TestBed.createComponent(LoanClosureComponent);
    component = fixture.componentInstance;
  });

  it('should create the closure component', () => {
    expect(component).toBeTruthy();
  });

  it('should block closure submission when readiness check fails', () => {
    fixture.detectChanges();

    component.closureForm.patchValue({
      closureDate: new Date('2026-09-12'),
      closureNotes: 'Closing attempt while securities remain'
    });

    component.submitClosure();

    expect(component.errorMessage).toContain('not ready for closure');
    expect(mockServicingService.closeLoan).not.toHaveBeenCalled();
  });

  it('should submit closure when readyForClosure is true', () => {
    mockServicingService.getClosureReadiness.mockReturnValue(of(mockReadyReadiness));
    fixture.detectChanges();

    component.closureForm.patchValue({
      closureDate: new Date('2026-09-12'),
      closureNotes: 'Full repayment completed and verified released',
      idempotencyKey: 'TEST-CLOSE-KEY'
    });

    component.submitClosure();

    expect(mockServicingService.closeLoan).toHaveBeenCalledWith(
      105,
      expect.objectContaining({
        expectedLoanVersion: 4,
        idempotencyKey: 'TEST-CLOSE-KEY',
        closureDate: '2026-09-12',
        closureNotes: 'Full repayment completed and verified released'
      })
    );
    expect(component.closureResult).toEqual(mockCloseResponse);
    expect(component.readiness?.loanStatus).toBe('CLOSED_OBLIGATIONS_MET');
  });

  it('should handle 409 concurrency conflict on closure', () => {
    mockServicingService.getClosureReadiness.mockReturnValue(of(mockReadyReadiness));
    mockServicingService.closeLoan.mockReturnValue(throwError(() => ({ status: 409 })));

    fixture.detectChanges();

    component.closureForm.patchValue({
      closureDate: new Date('2026-09-12'),
      closureNotes: 'Closing loan'
    });

    component.submitClosure();

    expect(component.conflictError).toContain('Concurrency conflict');
  });

  it('should deny access if user lacks CLOSE_PEWOSALOAN permission', () => {
    mockAuthService.getCredentials.mockReturnValue({
      permissions: ['SOME_OTHER_PERMISSION']
    });

    const unauthFixture = TestBed.createComponent(LoanClosureComponent);
    const unauthComp = unauthFixture.componentInstance;
    unauthFixture.detectChanges();

    expect(unauthComp.denied).toBe(true);
    expect(unauthComp.errorMessage).toContain('CLOSE_PEWOSALOAN');
  });
});
