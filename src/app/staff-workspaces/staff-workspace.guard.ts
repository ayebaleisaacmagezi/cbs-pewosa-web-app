/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { AuthenticationService } from 'app/core/authentication/authentication.service';

export const normalizedWorkspaceRoles = (roles: any): string[] =>
  Array.isArray(roles)
    ? roles.map((role: any) =>
        String(typeof role === 'string' ? role : role?.name || role?.displayName || role?.roleName || '')
          .trim()
          .toLowerCase()
      )
    : [];

/** Entry target for a dedicated staff workspace role. */
export interface FocusedWorkspaceEntry {
  path: string;
  view?: string;
}

/** Roles whose users keep the standard portal instead of a focused workspace. */
const ELEVATED_WORKSPACE_ROLES = [
  'super user',
  'general manager',
  'deputy gm',
  'branch manager',
  'accountant',
  'it officer'
];

/**
 * Resolves the focused workspace entry for the user's roles, if any.
 * Mirrors the role priority used by the home component fallback redirect.
 */
export const focusedWorkspaceEntry = (roles: any): FocusedWorkspaceEntry | null => {
  const roleNames = normalizedWorkspaceRoles(roles);
  const hasRole = (role: string) => roleNames.includes(role);
  const hasElevatedRole = roleNames.some((role) => ELEVATED_WORKSPACE_ROLES.includes(role));
  const focused = (role: string) => hasRole(role) && !hasElevatedRole;

  if (hasRole('branch manager')) return { path: 'manager', view: 'home' };
  if (hasRole('chief teller')) return { path: 'chief-teller', view: 'drawers' };
  if (focused('vault officer')) return { path: 'vault-officer' };
  if (focused('compliance officer')) return { path: 'compliance-officer' };
  if (focused('cashier')) return { path: 'cashier', view: 'home' };
  if (focused('loan officer')) return { path: 'loan-officer', view: 'home' };
  return null;
};

/**
 * Redirects dedicated staff roles straight to their workspace before the
 * home portal renders, so they never see the default dashboard flash.
 */
export const staffWorkspaceHomeRedirectGuard: CanActivateFn = () => {
  const authenticationService = inject(AuthenticationService);
  const router = inject(Router);
  const credentials = authenticationService.getCredentials();
  const entry = credentials ? focusedWorkspaceEntry(credentials.roles) : null;
  if (!entry) return true;
  return router.createUrlTree(
    [
      '/staff-workspaces',
      entry.path
    ],
    { queryParams: entry.view ? { view: entry.view } : undefined }
  );
};

export const staffWorkspaceGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authenticationService = inject(AuthenticationService);
  const router = inject(Router);
  const credentials = authenticationService.getCredentials();

  if (!credentials) {
    return router.createUrlTree(['/home']);
  }

  const requiredPermission = route.data['permission'] ? String(route.data['permission']) : null;
  if (requiredPermission) {
    const userPermissions = credentials.permissions || [];
    const isReadPermission = requiredPermission.startsWith('READ_');
    const hasPerm =
      userPermissions.includes('ALL_FUNCTIONS') ||
      (isReadPermission && userPermissions.includes('ALL_FUNCTIONS_READ')) ||
      userPermissions.includes(requiredPermission);

    return hasPerm ? true : router.createUrlTree(['/home']);
  }

  const expectedRole = String(route.data['workspaceRole'] || '').toLowerCase();
  if (normalizedWorkspaceRoles(credentials.roles).includes(expectedRole)) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
