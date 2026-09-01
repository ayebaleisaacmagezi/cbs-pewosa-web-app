/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Routes } from '@angular/router';

import { Route } from 'app/core/route/route.service';
import { staffWorkspaceGuard } from './staff-workspace.guard';

export const STAFF_WORKSPACE_ROUTES: Routes = [
  Route.withShell([
    {
      path: 'cashier',
      loadComponent: () => import('./cashier-workspace.component').then((m) => m.CashierWorkspaceComponent),
      canActivate: [staffWorkspaceGuard],
      data: { title: 'Cashier workspace', workspaceRole: 'cashier' }
    },
    {
      path: 'chief-teller',
      loadComponent: () => import('./chief-teller-workspace.component').then((m) => m.ChiefTellerWorkspaceComponent),
      canActivate: [staffWorkspaceGuard],
      data: { title: 'Chief Teller workspace', workspaceRole: 'chief teller' }
    },
    {
      path: 'loan-officer',
      loadComponent: () => import('./loan-officer-workspace.component').then((m) => m.LoanOfficerWorkspaceComponent),
      canActivate: [staffWorkspaceGuard],
      data: { title: 'Loan Officer workspace', workspaceRole: 'loan officer' }
    }
  ])
];
