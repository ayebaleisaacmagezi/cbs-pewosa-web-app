/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Dates } from 'app/core/utils/dates';
import { LoanWorkQueueResponse } from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { IconsModule } from 'app/shared/icons.module';
import { LoanServicingQueueComponent } from './loan-servicing-queue.component';

describe('LoanServicingQueueComponent', () => {
  let component: LoanServicingQueueComponent;
  let fixture: ComponentFixture<LoanServicingQueueComponent>;
  let mockServicingService: jest.Mocked<Partial<PewosaLoanServicingService>>;
  let mockAuthService: jest.Mocked<Partial<AuthenticationService>>;
  let mockDates: jest.Mocked<Partial<Dates>>;

  const mockResponse: LoanWorkQueueResponse = {
    totalElements: 1,
    totalPages: 1,
    page: 0,
    size: 20,
    content: [
      {
        loanId: 105,
        accountNo: '000000105',
        loanVersion: 3,
        clientId: 34,
        clientName: 'Grace Nakitto',
        officeId: 2,
        officeName: 'Masaka Branch',
        loanOfficerId: 12,
        loanOfficerName: 'Peter Ssemwogerere',
        productName: 'SME Working Capital',
        principalDisbursed: 5000000.0,
        totalOutstanding: 3250000.0,
        principalOutstanding: 2800000.0,
        interestOutstanding: 350000.0,
        feeOutstanding: 50000.0,
        penaltyOutstanding: 50000.0,
        currencyCode: 'UGX',
        nextPaymentDueDate: '2026-09-20',
        nextPaymentAmount: 450000.0,
        daysInArrears: 14,
        classification: 'PERFORMING',
        riskBand: 'LOW',
        loanStatus: 'ACTIVE',
        bucket: 'PORTFOLIO'
      }
    ]
  };

  beforeEach(async () => {
    mockServicingService = {
      getWorkQueue: jest.fn().mockReturnValue(of(mockResponse))
    };

    mockAuthService = {
      getCredentials: jest.fn().mockReturnValue({
        username: 'mifos',
        officeId: 2,
        officeName: 'Head Office',
        staffId: 12,
        staffDisplayName: 'Loan Officer 1',
        permissions: ['READ_PEWOSALOANSERVICING']
      })
    };

    mockDates = {
      getDate: jest.fn().mockImplementation((d: Date) => '2026-09-20')
    };

    await TestBed.configureTestingModule({
      imports: [
        LoanServicingQueueComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
        IconsModule
      ],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        DatePipe,
        { provide: PewosaLoanServicingService, useValue: mockServicingService },
        { provide: AuthenticationService, useValue: mockAuthService },
        { provide: Dates, useValue: mockDates }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanServicingQueueComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load default PORTFOLIO bucket on init', () => {
    fixture.detectChanges();

    expect(mockServicingService.getWorkQueue).toHaveBeenCalledWith({
      bucket: 'PORTFOLIO',
      page: 0,
      size: 20
    });
    expect(component.queueItems.length).toBe(1);
    expect(component.queueItems[0].accountNo).toBe('000000105');
    expect(component.totalElements).toBe(1);
    expect(component.loading).toBe(false);
  });

  it('should switch bucket and reload queue when setBucket is called', () => {
    fixture.detectChanges();

    component.setBucket('DUE_SOON');

    expect(component.activeBucket).toBe('DUE_SOON');
    expect(component.pageIndex).toBe(0);
    expect(mockServicingService.getWorkQueue).toHaveBeenCalledWith({
      bucket: 'DUE_SOON',
      page: 0,
      size: 20
    });
  });

  it('should handle pagination changes', () => {
    fixture.detectChanges();

    component.onPageChange({ pageIndex: 2, pageSize: 50, length: 100 });

    expect(component.pageIndex).toBe(2);
    expect(component.pageSize).toBe(50);
    expect(mockServicingService.getWorkQueue).toHaveBeenCalledWith({
      bucket: 'PORTFOLIO',
      page: 2,
      size: 50
    });
  });

  it('should handle 403 access denied error', () => {
    mockServicingService.getWorkQueue!.mockReturnValue(throwError(() => ({ status: 403, message: 'Forbidden' })));

    fixture.detectChanges();

    expect(component.denied).toBe(true);
    expect(component.errorMessage).toContain('Access denied');
    expect(component.queueItems.length).toBe(0);
  });

  it('should handle general server error and support retry', () => {
    mockServicingService.getWorkQueue!.mockReturnValue(
      throwError(() => ({ status: 500, error: { defaultUserMessage: 'Server timeout' } }))
    );

    fixture.detectChanges();

    expect(component.errorMessage).toBe('Server timeout');
    expect(component.queueItems.length).toBe(0);

    // Now restore mock response and retry
    mockServicingService.getWorkQueue!.mockReturnValue(of(mockResponse));
    component.retry();

    expect(component.errorMessage).toBeNull();
    expect(component.queueItems.length).toBe(1);
  });

  it('should reset filters and reload queue', () => {
    fixture.detectChanges();

    component.filterForm.patchValue({
      classification: 'SUBSTANDARD',
      riskBand: 'HIGH'
    });

    component.resetFilters();

    expect(component.filterForm.value.classification).toBe('');
    expect(component.filterForm.value.riskBand).toBe('');
    expect(component.pageIndex).toBe(0);
  });

  it('should filter by authenticated staffId when assignedToMe is toggled', () => {
    fixture.detectChanges();

    component.toggleAssignedToMe(true);

    expect(component.filterForm.value.assignedToMe).toBe(true);
    expect(component.filterForm.value.loanOfficerId).toBe('12');
    expect(mockServicingService.getWorkQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        loanOfficerId: 12
      })
    );
  });

  it('should include minOverdueDays and maxOverdueDays in query when provided', () => {
    fixture.detectChanges();

    component.filterForm.patchValue({
      minOverdueDays: '30',
      maxOverdueDays: '90'
    });
    component.applyFilters();

    expect(mockServicingService.getWorkQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        minOverdueDays: 30,
        maxOverdueDays: 90
      })
    );
  });

  it('should deny access if user lacks READ_PEWOSALOANSERVICING permission', () => {
    mockAuthService.getCredentials.mockReturnValue({
      username: 'mifos',
      officeId: 2,
      officeName: 'Head Office',
      permissions: ['SOME_OTHER_PERMISSION']
    } as any);

    const unauthFixture = TestBed.createComponent(LoanServicingQueueComponent);
    const unauthComp = unauthFixture.componentInstance;
    unauthFixture.detectChanges();

    expect(unauthComp.denied).toBe(true);
    expect(unauthComp.errorMessage).toContain('READ_PEWOSALOANSERVICING');
  });

  it('should allow access if user has ALL_FUNCTIONS_READ permission', () => {
    mockAuthService.getCredentials.mockReturnValue({
      username: 'mifos',
      officeId: 2,
      officeName: 'Head Office',
      permissions: ['ALL_FUNCTIONS_READ']
    } as any);

    const authFixture = TestBed.createComponent(LoanServicingQueueComponent);
    const authComp = authFixture.componentInstance;
    authFixture.detectChanges();

    expect(authComp.denied).toBe(false);
    expect(authComp.hasServicingPermission).toBe(true);
  });

  it('should send entered text filters for classification and riskBand unchanged', () => {
    fixture.detectChanges();

    component.filterForm.patchValue({
      classification: 'SUBSTANDARD',
      riskBand: 'HIGH'
    });
    component.applyFilters();

    expect(mockServicingService.getWorkQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: 'SUBSTANDARD',
        riskBand: 'HIGH'
      })
    );
  });
});
