/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { inject, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Observable, tap } from 'rxjs';

// Not Found Component
import { NotFoundComponent } from './not-found/not-found.component';
import { CallbackComponent } from './zitadel/callback/callback.component';
import { ClientsService } from './clients/clients.service';

/** Custom Services */
import { Route } from './core/route/route.service';

const CASHIER_ONBOARDING_PERFORMANCE_MARK = 'mifosx.cashier-onboarding.navigation-start';

function logCashierOnboardingNavigationStart(): boolean {
  performance.clearMarks(CASHIER_ONBOARDING_PERFORMANCE_MARK);
  performance.mark(CASHIER_ONBOARDING_PERFORMANCE_MARK);
  console.info('[CashierOnboardingPerformance]', {
    event: 'navigation.start',
    timestamp: new Date().toISOString()
  });
  return true;
}

function timedCashierOnboardingRequest<T>(
  requestName: string,
  request: () => Observable<T>,
  summarize: (response: T) => Record<string, number> = () => ({})
): Observable<T> {
  const startedAt = performance.now();
  console.info('[CashierOnboardingPerformance]', { event: 'request.start', request: requestName });
  return request().pipe(
    tap({
      next: (response) =>
        console.info('[CashierOnboardingPerformance]', {
          event: 'request.complete',
          request: requestName,
          durationMs: Math.round(performance.now() - startedAt),
          ...summarize(response)
        }),
      error: (error: unknown) =>
        console.error('[CashierOnboardingPerformance]', {
          event: 'request.failed',
          request: requestName,
          durationMs: Math.round(performance.now() - startedAt),
          status: typeof error === 'object' && error !== null && 'status' in error ? error.status : null
        })
    })
  );
}

/**
 * App routing module.
 *
 * Registers all feature modules as lazy-loaded routes plus the fallback routes.
 */
const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then((m) => m.LoginModule)
  },
  {
    path: 'accounting',
    loadChildren: () => import('./accounting/accounting.module').then((m) => m.AccountingModule)
  },
  {
    path: 'centers',
    loadChildren: () => import('./centers/centers.module').then((m) => m.CentersModule)
  },
  Route.withShell([
    {
      path: 'clients/create',
      data: { title: 'Create Member', breadcrumb: 'Create Member', routeParamBreadcrumb: false },
      canMatch: [logCashierOnboardingNavigationStart],
      loadComponent: () => {
        const startedAt = performance.now();
        console.info('[CashierOnboardingPerformance]', { event: 'component-load.start' });
        return import('./clients/create-client/create-client.component').then(
          (module) => {
            console.info('[CashierOnboardingPerformance]', {
              event: 'component-load.complete',
              durationMs: Math.round(performance.now() - startedAt)
            });
            return module.CreateClientComponent;
          },
          (error) => {
            console.error('[CashierOnboardingPerformance]', {
              event: 'component-load.failed',
              durationMs: Math.round(performance.now() - startedAt)
            });
            throw error;
          }
        );
      },
      resolve: {
        clientAddressFieldConfig: () =>
          timedCashierOnboardingRequest(
            'address-field-configuration',
            () => inject(ClientsService).getAddressFieldConfiguration(),
            (response: any) => ({ fields: Array.isArray(response) ? response.length : 0 })
          ),
        clientTemplate: () =>
          timedCashierOnboardingRequest(
            'client-template',
            () => inject(ClientsService).getClientTemplate(),
            (response: any) => ({
              offices: response?.officeOptions?.length ?? 0,
              staff: response?.staffOptions?.length ?? 0,
              savingsProducts: response?.savingProductOptions?.length ?? 0,
              datatables: response?.datatables?.length ?? 0
            })
          )
      }
    }
  ]),
  {
    path: 'clients',
    loadChildren: () => import('./clients/clients.module').then((m) => m.ClientsModule)
  },
  {
    path: 'collections',
    loadChildren: () => import('./collections/collections.module').then((m) => m.CollectionsModule)
  },
  {
    path: 'groups',
    loadChildren: () => import('./groups/groups.module').then((m) => m.GroupsModule)
  },
  {
    path: 'navigation',
    loadChildren: () => import('./navigation/navigation.module').then((m) => m.NavigationModule)
  },
  {
    path: 'notifications',
    loadChildren: () => import('./notifications/notifications.module').then((m) => m.NotificationsModule)
  },
  {
    path: 'organization',
    loadChildren: () => import('./organization/organization.module').then((m) => m.OrganizationModule)
  },
  {
    path: 'products',
    loadChildren: () => import('./products/products.module').then((m) => m.ProductsModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then((m) => m.ProfileModule)
  },
  {
    path: 'remittances',
    loadChildren: () => import('./remittances/remittances.module').then((m) => m.RemittancesModule)
  },
  {
    path: 'reports',
    loadChildren: () => import('./reports/reports.module').then((m) => m.ReportsModule)
  },
  {
    path: 'search',
    loadChildren: () => import('./search/search.module').then((m) => m.SearchModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.module').then((m) => m.SettingsModule)
  },
  {
    path: 'staff-workspaces',
    loadChildren: () => import('./staff-workspaces/staff-workspaces.routes').then((m) => m.STAFF_WORKSPACE_ROUTES)
  },
  {
    path: 'system',
    loadChildren: () => import('./system/system.module').then((m) => m.SystemModule)
  },
  {
    path: 'checker-inbox-and-tasks',
    loadChildren: () => import('./tasks/tasks.module').then((m) => m.TasksModule)
  },
  {
    path: 'templates',
    loadChildren: () => import('./templates/templates.module').then((m) => m.TemplatesModule)
  },
  {
    path: 'appusers',
    loadChildren: () => import('./users/users.module').then((m) => m.UsersModule)
  },
  {
    path: 'callback',
    component: CallbackComponent
  },
  {
    path: 'diagnostics',
    loadComponent: () => import('./diagnostics/diagnostics.component').then((m) => m.DiagnosticsComponent)
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];

/**
 * App Routing Module.
 *
 * Configures the top-level routes with lazy loading for all feature modules.
 */
@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule {}
