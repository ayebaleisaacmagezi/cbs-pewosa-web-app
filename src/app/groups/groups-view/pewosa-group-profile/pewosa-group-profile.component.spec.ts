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
import { PewosaGroupProfileComponent } from './pewosa-group-profile.component';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import { GroupsService } from 'app/groups/groups.service';
import { AlertService } from 'app/core/alert/alert.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { PewosaGroupProfileResponse } from 'app/groups/pewosa-group-lending.models';

describe('PewosaGroupProfileComponent', () => {
  let component: PewosaGroupProfileComponent;
  let fixture: ComponentFixture<PewosaGroupProfileComponent>;
  let lendingServiceMock: any;
  let groupsServiceMock: any;
  let alertServiceMock: any;

  const mockProfile: PewosaGroupProfileResponse = {
    groupId: 105,
    registrationNumber: 'PEWOSA-GRP-2026-081',
    registrationDate: '2025-06-15',
    constitutionAdopted: true,
    constitutionAdoptedDate: '2025-06-20',
    trainingCompleted: true,
    trainingCompletedDate: '2025-07-10',
    trainerStaffId: 14,
    trainerStaffName: 'John Mukasa',
    meetingFrequency: 'MONTHLY',
    meetingDayOfWeek: 'WEDNESDAY',
    cycleNumber: 2,
    socialFundSavingsAccountId: 850,
    groupSavingsAccountId: 712,
    minimumActiveMembers: 5,
    version: 2,
    lastModifiedBy: 'admin',
    lastModifiedDate: '2026-09-12T10:00:00Z'
  };

  beforeEach(async () => {
    localStorage.setItem('mifosXLanguage', JSON.stringify({ name: 'English', code: 'en' }));

    lendingServiceMock = {
      getGroupProfile: jest.fn().mockReturnValue(of(mockProfile)),
      updateGroupProfile: jest.fn().mockReturnValue(of({ ...mockProfile, version: 3 }))
    };

    groupsServiceMock = {
      getGroupAccountsData: jest.fn().mockReturnValue(
        of({
          savingsAccounts: [
            { id: 850, accountNo: 'SA-00850', productName: 'Social Fund', accountBalance: 1500000 },
            { id: 712, accountNo: 'SA-00712', productName: 'Group Savings', accountBalance: 5000000 }
          ]
        })
      )
    };

    alertServiceMock = {
      alert: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PewosaGroupProfileComponent, NoopAnimationsModule],
      providers: [
        DatePipe,
        Dates,
        { provide: PewosaGroupLendingService, useValue: lendingServiceMock },
        { provide: GroupsService, useValue: groupsServiceMock },
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

    fixture = TestBed.createComponent(PewosaGroupProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load profile and account data', () => {
    expect(component).toBeTruthy();
    expect(component.groupId).toBe(105);
    expect(lendingServiceMock.getGroupProfile).toHaveBeenCalledWith(105);
    expect(groupsServiceMock.getGroupAccountsData).toHaveBeenCalledWith('105');
    expect(component.profile).toEqual(mockProfile);
    expect(component.profileForm.get('registrationNumber')?.value).toBe('PEWOSA-GRP-2026-081');
    expect(component.profileForm.get('constitutionAdopted')?.value).toBe(true);
    expect(component.groupSavingsAccounts.length).toBe(2);
  });

  it('should call updateGroupProfile on form submit with expected version', () => {
    component.profileForm.patchValue({
      meetingFrequency: 'BI_WEEKLY'
    });

    component.saveProfile();

    expect(lendingServiceMock.updateGroupProfile).toHaveBeenCalledWith(
      105,
      expect.objectContaining({
        meetingFrequency: 'BI_WEEKLY',
        expectedVersion: 2
      })
    );
    expect(alertServiceMock.alert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SUCCESS' })
    );
    expect(component.profile?.version).toBe(3);
  });
});
