/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PewosaGroupEligibilityComponent } from './pewosa-group-eligibility.component';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import { ProductsService } from 'app/products/products.service';
import { AlertService } from 'app/core/alert/alert.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { PewosaGroupEligibilityResponse } from 'app/groups/pewosa-group-lending.models';

describe('PewosaGroupEligibilityComponent', () => {
  let component: PewosaGroupEligibilityComponent;
  let fixture: ComponentFixture<PewosaGroupEligibilityComponent>;
  let lendingServiceMock: any;
  let productsServiceMock: any;
  let alertServiceMock: any;

  const mockEvaluation: PewosaGroupEligibilityResponse = {
    reference: 'GPE-105-20260912-8821',
    groupId: 105,
    groupName: 'Kireka Women Tukole',
    loanProductId: 5,
    loanProductName: 'Group Solidarity Loan',
    policyVersion: 3,
    requestedTotalAmount: 20000000.0,
    evaluatedOn: '2026-09-12T10:15:00Z',
    evaluatedBy: 'loanofficer1',
    eligible: true,
    overallOutcome: 'ELIGIBLE',
    factsSnapshot: {
      groupAgeMonths: 15,
      activeMemberCount: 10,
      totalGroupSavings: 6500000.0,
      hasConstitution: true,
      hasCompletedTraining: true,
      activeDelinquentMemberCount: 0,
      meetingAttendanceRate: 92.5,
      appointedRoles: ['CHAIRPERSON', 'SECRETARY', 'TREASURER'],
      lookbackMeetingsCount: 10
    },
    rules: [
      {
        code: 'MIN_GROUP_AGE',
        description: 'Group age in months meets policy threshold',
        policyThreshold: '6',
        actualValue: '15',
        passed: true,
        message: 'Group age (15 months) meets required 6 months from policy v3.'
      }
    ]
  };

  beforeEach(async () => {
    localStorage.setItem('mifosXLanguage', JSON.stringify({ name: 'English', code: 'en' }));

    lendingServiceMock = {
      listEligibility: jest.fn().mockReturnValue(of([mockEvaluation])),
      createEligibility: jest.fn().mockReturnValue(of(mockEvaluation))
    };

    productsServiceMock = {
      getLoanProducts: jest.fn().mockReturnValue(of([{ id: 5, name: 'Group Solidarity Loan' }]))
    };

    alertServiceMock = {
      alert: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PewosaGroupEligibilityComponent, NoopAnimationsModule],
      providers: [
        DatePipe,
        Dates,
        { provide: PewosaGroupLendingService, useValue: lendingServiceMock },
        { provide: ProductsService, useValue: productsServiceMock },
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
            snapshot: { paramMap: convertToParamMap({ groupId: '105' }) },
            parent: null
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PewosaGroupEligibilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load products and history', () => {
    expect(component).toBeTruthy();
    expect(component.groupId).toBe(105);
    expect(productsServiceMock.getLoanProducts).toHaveBeenCalledWith('loanproducts');
    expect(lendingServiceMock.listEligibility).toHaveBeenCalledWith(105);
    expect(component.loanProducts.length).toBe(1);
    expect(component.history.length).toBe(1);
    expect(component.latestEvaluation).toEqual(mockEvaluation);
  });

  it('should submit evaluation and display result banner', () => {
    component.evalForm.patchValue({
      loanProductId: 5,
      requestedTotalAmount: 20000000
    });

    component.evaluate();

    expect(lendingServiceMock.createEligibility).toHaveBeenCalledWith(105, {
      loanProductId: 5,
      requestedTotalAmount: 20000000
    });
    expect(alertServiceMock.alert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SUCCESS' })
    );
    expect(component.latestEvaluation?.reference).toBe('GPE-105-20260912-8821');
  });

  it('should allow selecting an item from evaluation history', () => {
    const historicalItem = { ...mockEvaluation, reference: 'GPE-OLD-999' };
    component.selectEvaluation(historicalItem);
    expect(component.latestEvaluation?.reference).toBe('GPE-OLD-999');
  });
});
