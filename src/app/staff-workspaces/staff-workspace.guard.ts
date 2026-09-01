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

export const staffWorkspaceGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authenticationService = inject(AuthenticationService);
  const router = inject(Router);
  const credentials = authenticationService.getCredentials();
  const expectedRole = String(route.data['workspaceRole'] || '').toLowerCase();

  if (credentials && normalizedWorkspaceRoles(credentials.roles).includes(expectedRole)) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
