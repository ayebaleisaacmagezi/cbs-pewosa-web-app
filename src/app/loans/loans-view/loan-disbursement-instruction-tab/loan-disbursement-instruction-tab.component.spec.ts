/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { environment } from 'environments/environment';
import { LoanDisbursementInstruction } from '../../pewosa-loan-application.models';
import { PewosaLoanApplicationService } from '../../pewosa-loan-application.service';
import { LoanDisbursementInstructionTabComponent } from './loan-disbursement-instruction-tab.component';

describe('LoanDisbursementInstructionTabComponent', () => {
  let component: LoanDisbursementInstructionTabComponent;
  let fixture: ComponentFixture<LoanDisbursementInstructionTabComponent>;
  let mockLoanService: jest.Mocked<Partial<PewosaLoanApplicationService>>;
  let mockAuthService: jest.Mocked<Partial<AuthenticationService>>;

  const readyInstruction: LoanDisbursementInstruction = {
    id: 12,
    loanId: 101,
    idempotencyKey: 'idem-101-ready',
    rail: 'CASH',
    railDetails: {},
    status: 'READY',
    approvalCaseId: 5,
    approvalCaseVersion: 2,
    creditScoreId: 7,
    creditScoreVersion: 1,
    grossAmount: 5000000,
    chargesDueAtDisbursement: 150000,
    netAmount: 4850000,
    currencyCode: 'UGX',
    feeSettlementMode: 'DEDUCT_FROM_DISBURSEMENT',
    createdBy: 1,
    createdOn: '2026-09-12T10:00:00Z'
  };

  const consumedInstruction: LoanDisbursementInstruction = {
    ...readyInstruction,
    status: 'CONSUMED',
    consumedBy: 1,
    consumedOn: '2026-09-12T11:00:00Z',
    nativeTransactionId: 90210
  };

  beforeEach(async () => {
    environment.productionModeEnableRBAC = true;

    mockLoanService = {
      getDisbursementInstruction: jest.fn().mockReturnValue(of(readyInstruction)),
      createDisbursementInstruction: jest.fn(),
      executeDisbursementInstruction: jest.fn()
    };

    mockAuthService = {
      getCredentials: jest.fn().mockReturnValue({
        username: 'disbursement_officer',
        officeId: 1,
        officeName: 'Head Office',
        staffId: 10,
        staffDisplayName: 'Disbursement Officer',
        permissions: [
          'READ_LOAN',
          'EXECUTE_PEWOSALOANDISBURSEMENT'
        ]
      })
    };

    await TestBed.configureTestingModule({
      imports: [
        LoanDisbursementInstructionTabComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            parent: {
              snapshot: {
                params: { loanId: '101' }
              }
            }
          }
        },
        { provide: PewosaLoanApplicationService, useValue: mockLoanService },
        { provide: AuthenticationService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanDisbursementInstructionTabComponent);
    component = fixture.componentInstance;
  });

  it('should initialize and load READY instruction', () => {
    fixture.detectChanges();

    expect(mockLoanService.getDisbursementInstruction).toHaveBeenCalledWith(101);
    expect(component.instruction).toEqual(readyInstruction);
    expect(component.loading).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.instruction-status')?.textContent).toContain('READY');
  });

  it('should display execute action when status is READY and user has permission', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const executeBtn = compiled.querySelector('.execute-btn') as HTMLButtonElement;
    expect(executeBtn).toBeTruthy();
    expect(executeBtn.textContent).toContain('Execute disbursement');
  });

  it('should hide execute action when user lacks EXECUTE_PEWOSALOANDISBURSEMENT permission', () => {
    mockAuthService.getCredentials.mockReturnValue({
      username: 'viewer',
      officeId: 1,
      officeName: 'Head Office',
      staffId: 11,
      staffDisplayName: 'Read Only User',
      permissions: ['READ_LOAN']
    });

    fixture = TestBed.createComponent(LoanDisbursementInstructionTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.execute-container')).toBeFalsy();
    expect(compiled.querySelector('.execute-btn')).toBeFalsy();
  });

  it('should display confirmation with server-provided gross amount, deductions, net amount, currency, and rail without calculations', () => {
    fixture.detectChanges();

    component.promptConfirmation();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const confirmationSection = compiled.querySelector('.confirmation-section');
    expect(confirmationSection).toBeTruthy();

    const confirmationText = confirmationSection?.textContent || '';
    expect(confirmationText).toContain('5,000,000');
    expect(confirmationText).toContain('150,000');
    expect(confirmationText).toContain('4,850,000');
    expect(confirmationText).toContain('UGX');
    expect(confirmationText).toContain('CASH');

    const confirmBtn = compiled.querySelector('.confirm-execute-btn') as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();
  });

  it('should prevent double-click and multiple submissions while executing', () => {
    fixture.detectChanges();
    component.promptConfirmation();
    fixture.detectChanges();

    mockLoanService.executeDisbursementInstruction.mockReturnValue(of(consumedInstruction));

    component.executing = true;
    component.execute();

    expect(mockLoanService.executeDisbursementInstruction).not.toHaveBeenCalled();

    component.executing = false;
    component.execute();
    expect(mockLoanService.executeDisbursementInstruction).toHaveBeenCalledTimes(1);
    expect(mockLoanService.executeDisbursementInstruction).toHaveBeenCalledWith(101, 12, {});
  });

  it('should replace displayed instruction with server response and show CONSUMED state with native transaction ID on success', () => {
    mockLoanService.executeDisbursementInstruction.mockReturnValue(of(consumedInstruction));
    fixture.detectChanges();

    component.promptConfirmation();
    fixture.detectChanges();

    component.execute();
    fixture.detectChanges();

    expect(component.instruction).toEqual(consumedInstruction);
    expect(component.instruction?.status).toBe('CONSUMED');
    expect(component.showConfirmation).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.instruction-status')?.textContent).toContain('CONSUMED');
    expect(compiled.querySelector('.native-transaction-id')?.textContent).toContain('90210');
    expect(compiled.querySelector('.execute-container')).toBeFalsy();
  });

  it('should preserve local instruction status and display backend message on error without mutating local status', () => {
    const backendError = {
      status: 409,
      error: {
        defaultUserMessage: 'The instruction is not in READY status or has already been consumed.'
      }
    };
    mockLoanService.executeDisbursementInstruction.mockReturnValue(throwError(() => backendError));
    fixture.detectChanges();

    component.promptConfirmation();
    fixture.detectChanges();

    component.execute();
    fixture.detectChanges();

    expect(component.error).toBe('The instruction is not in READY status or has already been consumed.');
    expect(component.instruction?.status).toBe('READY');
    expect(component.instruction).toEqual(readyInstruction);
    expect(component.showConfirmation).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-message')?.textContent).toContain(
      'The instruction is not in READY status or has already been consumed.'
    );
    expect(compiled.querySelector('.instruction-status')?.textContent).toContain('READY');
  });

  it('should prevent unauthorized direct call from opening confirmation or executing service', () => {
    mockAuthService.getCredentials.mockReturnValue({
      username: 'unauthorized_officer',
      officeId: 1,
      officeName: 'Head Office',
      staffId: 13,
      staffDisplayName: 'Unauthorized Staff',
      permissions: ['READ_LOAN']
    });

    fixture = TestBed.createComponent(LoanDisbursementInstructionTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.hasExecutePermission).toBe(false);

    // Direct call to promptConfirmation must be blocked
    component.promptConfirmation();
    expect(component.showConfirmation).toBe(false);

    // Direct call to execute must be blocked
    component.execute();
    expect(mockLoanService.executeDisbursementInstruction).not.toHaveBeenCalled();
  });

  it('should grant execution access when user has ALL_FUNCTIONS superuser permission', () => {
    mockAuthService.getCredentials.mockReturnValue({
      username: 'superuser',
      officeId: 1,
      officeName: 'Head Office',
      staffId: 99,
      staffDisplayName: 'Super User',
      permissions: ['ALL_FUNCTIONS']
    });

    fixture = TestBed.createComponent(LoanDisbursementInstructionTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.hasExecutePermission).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.execute-btn')).toBeTruthy();

    component.promptConfirmation();
    expect(component.showConfirmation).toBe(true);

    mockLoanService.executeDisbursementInstruction.mockReturnValue(of(consumedInstruction));
    component.execute();
    expect(mockLoanService.executeDisbursementInstruction).toHaveBeenCalledWith(101, 12, {});
  });
});
