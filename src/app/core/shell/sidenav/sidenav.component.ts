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
  WorkspaceNavigationService
} from '../workspace-navigation.service';

import { catchError, finalize, of, take } from 'rxjs';

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
  workspaceRole: 'cashier' | 'chief-teller' | 'loan-officer' | null = null;
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
    if (roleNames.includes('chief teller')) {
      this.workspaceRole = 'chief-teller';
      this.workspaceLinks = [
        { label: 'Cashier drawers', view: 'drawers' },
        { label: 'Allocate or recover', view: 'movement' },
        { label: 'Drawer records', view: 'records' }
      ];
      return;
    }
    if (roleNames.some((role: string) => elevatedRoles.includes(role))) return;

    if (roleNames.includes('cashier')) {
      this.workspaceRole = 'cashier';
      this.workspaceLinks = [
        { label: 'Cashier home', view: 'home' },
        { label: 'Member transactions', view: 'transactions' },
        { label: 'Teller drawer', view: 'drawer' },
        { label: "Today's transactions", view: 'records' },
        { label: 'Receipts', view: 'receipts' }
      ];
    } else if (roleNames.includes('loan officer')) {
      this.workspaceRole = 'loan-officer';
      this.workspaceLinks = [
        { label: 'Overview', view: 'home' },
        { label: 'Start loan application', view: 'new-loan' },
        { label: 'Members', view: 'members' },
        { label: 'Create member', view: 'create-member' },
        { label: 'Groups', view: 'groups' },
        { label: 'Loan applications', view: 'applications' }
      ];
    }
  }

  openWorkspaceView(view: string): void {
    if (!this.workspaceRole) return;
    if (this.workspaceRole === 'cashier' && this.isCashierView(view)) {
      this.workspaceNavigation.setCashierView(view);
      return;
    }
    if (this.workspaceRole === 'loan-officer' && this.isLoanOfficerView(view)) {
      this.workspaceNavigation.setLoanOfficerView(view);
      return;
    }
    if (this.workspaceRole === 'chief-teller' && this.isChiefTellerView(view)) {
      this.workspaceNavigation.setChiefTellerView(view);
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

  private isCashierView(view: string | undefined): view is CashierWorkspaceView {
    return view === 'home' || view === 'transactions' || view === 'drawer' || view === 'records' || view === 'receipts';
  }

  private isLoanOfficerView(view: string | undefined): view is LoanOfficerWorkspaceView {
    return (
      view === 'home' ||
      view === 'new-loan' ||
      view === 'members' ||
      view === 'create-member' ||
      view === 'groups' ||
      view === 'applications'
    );
  }

  private isChiefTellerView(view: string | undefined): view is ChiefTellerWorkspaceView {
    return view === 'drawers' || view === 'movement' || view === 'records';
  }

  get staffInitials(): string {
    return (this.staffDisplayName || this.username || 'C')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join('')
      .toUpperCase();
  }

  get workspaceHomeView(): string {
    return this.workspaceRole === 'chief-teller' ? 'drawers' : 'home';
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
