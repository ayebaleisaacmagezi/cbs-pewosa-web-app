/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';

import { ClientsService } from 'app/clients/clients.service';
import { MemberSearchComponent } from './member-search.component';

describe('MemberSearchComponent', () => {
  let component: MemberSearchComponent;
  let clientsService: { searchClientsInOffice: jest.Mock };

  beforeEach(async () => {
    clientsService = { searchClientsInOffice: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [
        MemberSearchComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [{ provide: ClientsService, useValue: clientsService }]
    }).compileComponents();

    const fixture = TestBed.createComponent(MemberSearchComponent);
    component = fixture.componentInstance;
    component.officeId = 7;
    fixture.detectChanges();
  });

  it('debounces member searches', fakeAsync(() => {
    clientsService.searchClientsInOffice.mockReturnValue(of([]));

    component.searchControl.setValue('Am');
    tick(199);
    expect(clientsService.searchClientsInOffice).not.toHaveBeenCalled();

    tick(1);
    expect(clientsService.searchClientsInOffice).toHaveBeenCalledWith('Am', 7);
    expect(component.searchState).toBe('empty');
  }));

  it('ignores a stale response after the query changes', fakeAsync(() => {
    const firstResponse = new Subject<any[]>();
    clientsService.searchClientsInOffice
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(of([{ id: 2, displayName: 'Amina' }]));

    component.searchControl.setValue('Am');
    tick(200);
    component.searchControl.setValue('Ami');
    firstResponse.next([{ id: 1, displayName: 'Amos' }]);
    expect(component.members).toEqual([]);

    tick(200);
    expect(component.members).toEqual([{ id: 2, displayName: 'Amina' }]);
    expect(component.searchState).toBe('results');
  }));

  it('shows an inline error state when the request fails', fakeAsync(() => {
    clientsService.searchClientsInOffice.mockReturnValue(throwError(() => new Error('Search failed')));

    component.searchControl.setValue('Am');
    tick(200);
    expect(component.searchState).toBe('error');
    expect(component.members).toEqual([]);
  }));
});
