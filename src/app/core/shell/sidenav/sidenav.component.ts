/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  Input,
  EventEmitter,
  Output,
  TemplateRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

/** Custom Components */
import { KeyboardShortcutsDialogComponent } from 'app/shared/keyboard-shortcuts-dialog/keyboard-shortcuts-dialog.component';

/** Custom Services */
import { AuthenticationService } from '../../authentication/authentication.service';
import { PopoverService } from '../../../configuration-wizard/popover/popover.service';
import { ConfigurationWizardService } from '../../../configuration-wizard/configuration-wizard.service';
import { DocumentationLinksService } from 'app/shared/services/documentation-links.service';

/** Custom Imports */
import { frequentActivities } from './frequent-activities';
import { SettingsService } from 'app/settings/settings.service';
import { NgClass } from '@angular/common';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatDivider } from '@angular/material/divider';
import { MatNavList, MatListItem } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { MatLine } from '@angular/material/grid-list';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { remittanceConfig } from '../../../remittances/remittance.config';
import {
  CashierWorkspaceView,
  ChiefTellerWorkspaceView,
  LoanOfficerWorkspaceView,
  ManagerWorkspaceView,
  VaultWorkspaceView,
  WorkspaceNavigationService
} from '../workspace-navigation.service';

import { catchError, finalize, of, take } from 'rxjs';

const WORKSPACE_ICON_PATHS: Record<string, string> = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z',
  transactions:
    'M7 7h11l-4-4 1.4-1.4L21.8 8l-6.4 6.4L14 13l4-4H7V7zm10 10H6l4 4-1.4 1.4L2.2 16l6.4-6.4L10 11l-4 4h11v2z',
  drawer:
    'M21 7V6c0-1.1-.9-2-2-2H5a3 3 0 0 0 0 6h14v2h-3a3 3 0 0 0 0 6h3v2H5a3 3 0 0 1-3-3V7.5A3.5 3.5 0 0 1 5 4h14c1.1 0 2 .9 2 2v1zm-5 7a1 1 0 1 0 0 2h5v-2h-5z',
  expenses: 'M20 6h-3V4H7v2H4v15h16V6zm-5 0H9V5h6v1zm1 11H8v-2h8v2zm0-4H8v-2h8v2z',
  operations: 'M12 2 2 7v2h20V7L12 2zm-7 9v8H3v2h18v-2h-2v-8h-2v8h-4v-8h-2v8H7v-8H5z',
  reports: 'M4 3h16v18H4V3zm3 14h2v-5H7v5zm4 0h2V7h-2v10zm4 0h2V9h-2v8z',
  reversals: 'M7.5 7H16a5 5 0 0 1 0 10h-4v-2h4a3 3 0 0 0 0-6H7.5l3 3L9 13.5 3.5 8 9 2.5 10.5 4l-3 3z',
  drawers: 'M4 10h16v9h2v2H2v-2h2v-9zm2 2v7h3v-7H6zm5 0v7h2v-7h-2zm4 0v7h3v-7h-3zM12 2l10 5v2H2V7l10-5z',
  movement: 'M7 7h9l-3-3 1.4-1.4L19.8 8l-5.4 5.4L13 12l3-3H7V7zm10 10H8l3 3-1.4 1.4L4.2 16l5.4-5.4L11 12l-3 3h9v2z',
  approvals: 'M12 2 4 5v6c0 5.1 3.4 9.7 8 11 4.6-1.3 8-5.9 8-11V5l-8-3zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10l-6 6z',
  reconciliation:
    'M19 3h-4.2A3 3 0 0 0 12 1a3 3 0 0 0-2.8 2H5a2 2 0 0 0-2 2v16h18V5a2 2 0 0 0-2-2zm-7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-2 14-4-4 1.4-1.4L10 14.2l6.6-6.6L18 9l-8 8z',
  requests:
    'M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v12h20V8a2 2 0 0 0-2-2zM10 4h4v2h-4V4zm3 11v3h-2v-3H8l4-4 4 4h-3z',
  cases: 'M12 2 4 5v6c0 5.1 3.4 9.7 8 11 4.6-1.3 8-5.9 8-11V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z',
  records: 'M13 3a9 9 0 1 1-8.9 10H1l4-4 4 4H6.1A7 7 0 1 0 13 5V3zm-1 4h2v5.2l4 2.3-1 1.7-5-3V7z',
  receipts: 'M6 2h12v20l-3-2-3 2-3-2-3 2V2zm3 5v2h6V7H9zm0 4v2h6v-2H9zm0 4v2h4v-2H9z',
  members: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.4 0-8 2-8 4.5V21h16v-2.5C20 16 16.4 14 12 14z',
  'new-loan':
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 15h-2v2h-2v-2H9v-2h2v-2h2v2h2v2zm-2-8V3.5L18.5 9H13z',
  groups:
    'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-3.3 0-6 1.5-6 3.5V19h12v-2.5C14 14.5 11.3 13 8 13zm8 0c-.4 0-.8 0-1.2.1 1.3.9 2.2 2 2.2 3.4V19h5v-2.5c0-2-2.7-3.5-6-3.5z',
  applications: 'M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM8 12v2h8v-2H8zm0 4v2h6v-2H8z'
};

/**
 * Sidenav component.
 */
@Component({
  selector: 'mifosx-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    NgClass,
    MatIconButton,
    MatTooltip,
    FaIconComponent,
    MatDivider,
    MatNavList,
    MatListItem,
    RouterLinkActive,
    MatIcon,
    MatLine
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidenavComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  dialog = inject(MatDialog);
  private authenticationService = inject(AuthenticationService);
  private settingsService = inject(SettingsService);
  private configurationWizardService = inject(ConfigurationWizardService);
  private popoverService = inject(PopoverService);
  private documentationLinks = inject(DocumentationLinksService);
  private workspaceNavigation = inject(WorkspaceNavigationService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  /** True if sidenav is in collapsed state. */
  @Input() sidenavCollapsed: boolean;
  @Output() collapse = new EventEmitter<boolean>();
  /** Tooltip position */
  tooltipPosition = 'after';
  /** Username of authenticated user. */
  username: string;
  staffDisplayName: string;
  officeName: string;
  /** Array of all user activities */
  userActivity: string[];
  /** Mapped Activites */
  mappedActivities: any[] = [];
  /** Collection of possible frequent activities */
  frequentActivities: any[] = frequentActivities;
  /** Whether remittance feature is enabled */
  mifosRemittanceEnabled = remittanceConfig.isRemittanceEnabled;
  /** Focused operational workspace for dedicated staff roles. */
  workspaceRole:
    | 'cashier'
    | 'chief-teller'
    | 'loan-officer'
    | 'vault-officer'
    | 'compliance-officer'
    | 'manager'
    | null = null;

  toggleWorkspaceSidebar(): void {
    this.collapse.emit(!this.sidenavCollapsed);
  }
  /** Role-specific navigation links. */
  workspaceLinks: { label: string; view: string }[] = [];
  activeWorkspaceView = '';

  /* Refernce of logo */
  @ViewChild('logo') logo: ElementRef<any>;
  /* Template for popover on logo */
  @ViewChild('templateLogo') templateLogo: TemplateRef<any>;
  /* Refernce of chart of accounts */
  @ViewChild('chartOfAccounts') chartOfAccounts: ElementRef<any>;
  /* Template for popover on chart of accounts */
  @ViewChild('templateChartOfAccounts') templateChartOfAccounts: TemplateRef<any>;

  /**
   * @param {Router} router Router for navigation.
   * @param {MatDialog} dialog Mat Dialog
   * @param {AuthenticationService} authenticationService Authentication Service.
   * @param {SettingsService} settingsService Settings Service.
   * @param {ConfigurationWizardService} configurationWizardService ConfigurationWizard Service.
   * @param {PopoverService} popoverService PopoverService.
   */
  constructor() {
    this.userActivity = JSON.parse(localStorage.getItem('mifosXLocation'));
  }

  /**
   * Sets the username of the authenticated user.
   */
  ngOnInit() {
    const credentials = this.authenticationService.getCredentials();
    this.username = credentials.username;
    this.staffDisplayName = credentials.staffDisplayName || credentials.username;
    this.officeName = credentials.officeName;
    this.setWorkspaceNavigation(credentials.roles);
    if (this.workspaceRole === 'cashier') {
      const requestedView = this.router.parseUrl(this.router.url).queryParams['view'];
      if (this.isCashierView(requestedView)) this.workspaceNavigation.setCashierView(requestedView);
      this.workspaceNavigation.cashierView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
        this.activeWorkspaceView = view;
        this.changeDetectorRef.markForCheck();
      });
    } else if (this.workspaceRole === 'loan-officer') {
      const requestedView = this.router.parseUrl(this.router.url).queryParams['view'];
      if (this.isLoanOfficerView(requestedView)) this.workspaceNavigation.setLoanOfficerView(requestedView);
      this.workspaceNavigation.loanOfficerView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
        this.activeWorkspaceView = view;
        this.changeDetectorRef.markForCheck();
      });
    } else if (this.workspaceRole === 'chief-teller') {
      const requestedView = this.router.parseUrl(this.router.url).queryParams['view'];
      if (this.isChiefTellerView(requestedView)) this.workspaceNavigation.setChiefTellerView(requestedView);
      this.workspaceNavigation.chiefTellerView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
        this.activeWorkspaceView = view;
        this.changeDetectorRef.markForCheck();
      });
    } else if (this.workspaceRole === 'vault-officer') {
      this.workspaceNavigation.vaultView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
        this.activeWorkspaceView = view;
        this.changeDetectorRef.markForCheck();
      });
    } else if (this.workspaceRole === 'compliance-officer') {
      this.activeWorkspaceView = 'cases';
    } else if (this.workspaceRole === 'manager') {
      const requestedView = this.router.parseUrl(this.router.url).queryParams['view'];
      if (this.isManagerView(requestedView)) this.workspaceNavigation.setManagerView(requestedView);
      this.workspaceNavigation.managerView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
        this.activeWorkspaceView = view;
        this.changeDetectorRef.markForCheck();
      });
    }
    this.setMappedAcitivites();
  }

  private setWorkspaceNavigation(roles: any): void {
    if (!Array.isArray(roles)) return;
    const roleNames = roles.map((role: any) =>
      String(typeof role === 'string' ? role : role?.name || role?.displayName || role?.roleName || '')
        .trim()
        .toLowerCase()
    );
    const elevatedRoles = [
      'super user',
      'general manager',
      'deputy gm',
      'branch manager',
      'accountant',
      'it officer'
    ];
    if (roleNames.includes('branch manager')) {
      this.workspaceRole = 'manager';
      this.workspaceLinks = [
        { label: 'Manager overview', view: 'home' },
        { label: 'Approvals', view: 'approvals' },
        { label: 'Expenses', view: 'expenses' },
        { label: 'Branch operations', view: 'operations' },
        { label: 'Reports', view: 'reports' }
      ];
      return;
    }
    if (roleNames.includes('chief teller')) {
      this.workspaceRole = 'chief-teller';
      this.workspaceLinks = [
        { label: 'Cashier drawers', view: 'drawers' },
        { label: 'Allocate or recover', view: 'movement' },
        { label: 'Approvals', view: 'approvals' },
        { label: 'Reconciliation', view: 'reconciliation' },
        { label: 'Drawer records', view: 'records' }
      ];
      return;
    }
    if (roleNames.includes('vault officer')) {
      this.workspaceRole = 'vault-officer';
      this.workspaceLinks = [{ label: 'Cash movement requests', view: 'requests' }];
      return;
    }
    if (roleNames.includes('compliance officer')) {
      this.workspaceRole = 'compliance-officer';
      this.workspaceLinks = [{ label: 'Compliance cases', view: 'cases' }];
      return;
    }
    if (roleNames.some((role: string) => elevatedRoles.includes(role))) return;

    if (roleNames.includes('cashier')) {
      this.workspaceRole = 'cashier';
      this.workspaceLinks = [
        { label: 'Cashier home', view: 'home' },
        { label: 'Teller drawer', view: 'drawer' },
        { label: 'Transaction reversals', view: 'reversals' },
        { label: 'Transactions', view: 'records' },
        { label: 'Receipts', view: 'receipts' }
      ];
    } else if (roleNames.includes('loan officer')) {
      this.workspaceRole = 'loan-officer';
      this.workspaceLinks = [
        { label: 'Home', view: 'home' },
        { label: 'Start loan application', view: 'new-loan' },
        { label: 'Loan applications', view: 'applications' }
      ];
    }
  }

  openWorkspaceView(view: string): void {
    if (!this.workspaceRole) return;
    if (this.workspaceRole === 'cashier' && this.isCashierView(view)) {
      this.workspaceNavigation.setCashierView(view);
    } else if (this.workspaceRole === 'loan-officer' && this.isLoanOfficerView(view)) {
      this.workspaceNavigation.setLoanOfficerView(view);
    } else if (this.workspaceRole === 'chief-teller' && this.isChiefTellerView(view)) {
      this.workspaceNavigation.setChiefTellerView(view);
    } else if (this.workspaceRole === 'vault-officer' && this.isVaultView(view)) {
      this.workspaceNavigation.setVaultView(view);
    } else if (this.workspaceRole === 'compliance-officer' && view === 'cases') {
      void this.router.navigate(['/staff-workspaces/compliance-officer']);
      return;
    } else if (this.workspaceRole === 'manager' && this.isManagerView(view)) {
      this.workspaceNavigation.setManagerView(view);
    } else {
      return;
    }

    void this.router.navigate(
      [
        '/staff-workspaces',
        this.workspaceRole
      ],
      {
        queryParams: { view }
      }
    );
  }

  isWorkspaceViewActive(view: string): boolean {
    return this.activeWorkspaceView === view;
  }

  workspaceIconPath(view: string): string {
    return WORKSPACE_ICON_PATHS[view] || WORKSPACE_ICON_PATHS['applications'];
  }

  private isCashierView(view: string | undefined): view is CashierWorkspaceView {
    return (
      view === 'home' ||
      view === 'transactions' ||
      view === 'drawer' ||
      view === 'expenses' ||
      view === 'reversals' ||
      view === 'records' ||
      view === 'receipts'
    );
  }

  private isLoanOfficerView(view: string | undefined): view is LoanOfficerWorkspaceView {
    return view === 'home' || view === 'new-loan' || view === 'members' || view === 'groups' || view === 'applications';
  }

  private isChiefTellerView(view: string | undefined): view is ChiefTellerWorkspaceView {
    return (
      view === 'drawers' ||
      view === 'movement' ||
      view === 'approvals' ||
      view === 'reconciliation' ||
      view === 'records'
    );
  }

  private isVaultView(view: string | undefined): view is VaultWorkspaceView {
    return view === 'requests';
  }

  private isManagerView(view: string | undefined): view is ManagerWorkspaceView {
    return (
      view === 'home' || view === 'approvals' || view === 'expenses' || view === 'operations' || view === 'reports'
    );
  }

  get workspaceHomeView(): string {
    if (this.workspaceRole === 'chief-teller') return 'drawers';
    if (this.workspaceRole === 'vault-officer') return 'requests';
    if (this.workspaceRole === 'manager') return 'home';
    return 'home';
  }

  /**
   * Logs out the authenticated user and redirects to login page.
   * Uses unified AuthenticationService which handles both OAuth2 and OIDC logout.
   */
  logout() {
    this.authenticationService
      .logout()
      .pipe(
        take(1),
        catchError(() => of(void 0)),
        finalize(() => this.router.navigate(['/login'], { replaceUrl: true }))
      )
      .subscribe();
  }

  /**
   * Opens Mifos JIRA Wiki page.
   */
  help() {
    this.documentationLinks.open('userManual');
  }

  /**
   * Opens Keyboard shortcuts dialog.
   */
  showKeyboardShortcuts() {
    const dialogRef = this.dialog.open(KeyboardShortcutsDialogComponent);
    dialogRef.afterClosed().subscribe((response: any) => {});
  }

  /**
   * Returns top three frequent activities.
   */
  getFrequentActivities() {
    const frequencyCounts: any = {};
    let index = this.userActivity?.length;
    while (index) {
      const activity = this.userActivity[--index];
      frequencyCounts[activity] = (frequencyCounts[activity] || 0) + 1;
    }
    const frequencyCountsArray = Object.entries(frequencyCounts);
    const topThreeFrequentActivities = frequencyCountsArray
      .sort((a: any, b: any) => b[1] - a[1])
      .map((entry: any[]) => entry[0])
      .filter(
        (activity: string) => ![
            '/',
            '/login',
            '/home',
            '/dashboard'
          ].includes(activity)
      )
      .slice(0, 3);
    return topThreeFrequentActivities;
  }

  /**
   * Maps frequently accessed urls to button objects.
   */
  setMappedAcitivites() {
    const activities: string[] = this.getFrequentActivities();
    activities.forEach((activity: string) => {
      if (activity.includes('/clients')) {
        this.pushActivity('/clients');
      } else if (activity.includes('/groups')) {
        this.pushActivity('/groups');
      } else if (activity.includes('/centers')) {
        this.pushActivity('/centers');
      } else if (activity.includes('/accounting')) {
        this.pushActivity('/accounting');
      } else if (activity.includes('/reports')) {
        this.pushActivity('/reports');
      } else if (activity.includes('/appusers')) {
        this.pushActivity('/appusers');
      } else if (activity.includes('/organization')) {
        this.pushActivity('/organization');
      } else if (activity.includes('/system')) {
        this.pushActivity('/system');
      } else if (activity.includes('/products')) {
        this.pushActivity('/products');
      } else if (activity.includes('/templates')) {
        this.pushActivity('/templates');
      }
    });
    this.mappedActivities.reverse();
  }

  /**
   * Pushes activity to mapped activities
   * @param {string} path Activity Path
   */
  pushActivity(path: string) {
    const activity = this.frequentActivities.find((entry: any) => entry.path === path);
    if (!this.mappedActivities.includes(activity)) {
      this.mappedActivities.push(activity);
    }
  }

  /**
   * Popover function
   * @param template TemplateRef<any>.
   * @param target HTMLElement | ElementRef<any>.
   * @param position String.
   * @param backdrop Boolean.
   */
  showPopover(
    template: TemplateRef<any>,
    target: HTMLElement | ElementRef<any>,
    position: string,
    backdrop: boolean
  ): void {
    if (!target) {
      return;
    }
    setTimeout(() => this.popoverService.open(template, target, position, backdrop, {}), 200);
  }

  /**
   * To show popovers
   */
  ngAfterViewInit() {
    if (this.configurationWizardService.showSideNav && this.logo) {
      setTimeout(() => {
        this.showPopover(this.templateLogo, this.logo.nativeElement, 'bottom', true);
      });
    }
    if (this.configurationWizardService.showSideNavChartofAccounts && this.chartOfAccounts) {
      setTimeout(() => {
        this.showPopover(this.templateChartOfAccounts, this.chartOfAccounts.nativeElement, 'top', true);
      });
    }
  }

  /**
   * Next Step (Breadcrumbs) Configuration Wizard.
   */
  nextStep() {
    this.configurationWizardService.showSideNav = false;
    this.configurationWizardService.showSideNavChartofAccounts = false;
    this.configurationWizardService.showBreadcrumbs = true;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }

  /**
   * Previous Step (Toolbar) Configuration Wizard.
   */
  previousStep() {
    this.configurationWizardService.showSideNav = false;
    this.configurationWizardService.showSideNavChartofAccounts = false;
    this.configurationWizardService.showToolbarAdmin = true;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }

  get tenantIdentifier(): string {
    if (!this.settingsService.tenantIdentifier || this.settingsService.tenantIdentifier === '') {
      return 'default';
    }
    return this.settingsService.tenantIdentifier;
  }
}
