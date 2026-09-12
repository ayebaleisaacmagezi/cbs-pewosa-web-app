/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { normalizedWorkspaceRoles, staffWorkspaceGuard } from './staff-workspace.guard';

describe('normalizedWorkspaceRoles', () => {
  it('normalizes string roles', () => {
    expect(
      normalizedWorkspaceRoles([
        ' Cashier ',
        'Loan Officer'
      ])
    ).toEqual([
      'cashier',
      'loan officer'
    ]);
  });

  it('normalizes role objects returned by Fineract', () => {
    expect(
      normalizedWorkspaceRoles([
        { name: 'Chief Teller' },
        { displayName: 'Loan Officer' },
        { roleName: 'Cashier' }
      ])
    ).toEqual([
      'chief teller',
      'loan officer',
      'cashier'
    ]);
  });

  it('returns an empty list when roles are missing', () => {
    expect(normalizedWorkspaceRoles(null)).toEqual([]);
  });
});

describe('staffWorkspaceGuard', () => {
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthService = {
      getCredentials: jest.fn()
    };
    mockRouter = {
      createUrlTree: jest.fn().mockReturnValue('/home' as any)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthenticationService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('allows access when role matches and no permission required', () => {
    mockAuthService.getCredentials.mockReturnValue({
      roles: ['loan officer']
    });
    const route = {
      data: { workspaceRole: 'loan officer' }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => staffWorkspaceGuard(route, null as any));
    expect(result).toBe(true);
  });

  it('allows access when role and required permission both match', () => {
    mockAuthService.getCredentials.mockReturnValue({
      roles: ['loan officer'],
      permissions: ['READ_PEWOSALOANSERVICING']
    });
    const route = {
      data: { workspaceRole: 'loan officer', permission: 'READ_PEWOSALOANSERVICING' }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => staffWorkspaceGuard(route, null as any));
    expect(result).toBe(true);
  });

  it('allows access when user has ALL_FUNCTIONS_READ for a READ_ permission', () => {
    mockAuthService.getCredentials.mockReturnValue({
      roles: ['loan officer'],
      permissions: ['ALL_FUNCTIONS_READ']
    });
    const route = {
      data: { workspaceRole: 'loan officer', permission: 'READ_PEWOSALOANSERVICING' }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => staffWorkspaceGuard(route, null as any));
    expect(result).toBe(true);
  });

  it('allows access when user has ALL_FUNCTIONS', () => {
    mockAuthService.getCredentials.mockReturnValue({
      roles: ['loan officer'],
      permissions: ['ALL_FUNCTIONS']
    });
    const route = {
      data: { workspaceRole: 'loan officer', permission: 'READ_PEWOSALOANSERVICING' }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => staffWorkspaceGuard(route, null as any));
    expect(result).toBe(true);
  });

  it('allows access for a non-loan-officer role when route requires permission and user has READ_PEWOSALOANSERVICING', () => {
    mockAuthService.getCredentials.mockReturnValue({
      roles: ['compliance officer'],
      permissions: ['READ_PEWOSALOANSERVICING']
    });
    const route = {
      data: { permission: 'READ_PEWOSALOANSERVICING' }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => staffWorkspaceGuard(route, null as any));
    expect(result).toBe(true);
  });

  it('blocks access when required permission is missing', () => {
    mockAuthService.getCredentials.mockReturnValue({
      roles: ['loan officer'],
      permissions: ['SOME_OTHER_PERMISSION']
    });
    const route = {
      data: { workspaceRole: 'loan officer', permission: 'READ_PEWOSALOANSERVICING' }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => staffWorkspaceGuard(route, null as any));
    expect(result).toBe('/home');
  });
});
