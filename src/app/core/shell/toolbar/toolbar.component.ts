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
  ViewChild,
  AfterViewInit,
  ElementRef,
  TemplateRef,
  AfterContentChecked,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router } from '@angular/router';

/** rxjs Imports */
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, take } from 'rxjs/operators';

/** Custom Services */
import { AuthenticationService } from '../../authentication/authentication.service';
import { PopoverService } from '../../../configuration-wizard/popover/popover.service';
import { ConfigurationWizardService } from '../../../configuration-wizard/configuration-wizard.service';

/** Custom Components */
import { ConfigurationWizardComponent } from '../../../configuration-wizard/configuration-wizard.component';
import { NotificationsTrayComponent } from 'app/shared/notifications-tray/notifications-tray.component';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { SearchToolComponent } from '../../../shared/search-tool/search-tool.component';
import { LanguageSelectorComponent } from '../../../shared/language-selector/language-selector.component';
import { MatIcon } from '@angular/material/icon';
import { NotificationsTrayComponent as NotificationsTrayComponent_1 } from '../../../shared/notifications-tray/notifications-tray.component';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { DocumentationLinksService } from 'app/shared/services/documentation-links.service';

/**
 * Toolbar component.
 */
@Component({
  selector: 'mifosx-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatToolbar,
    MatIconButton,
    MatTooltip,
    FaIconComponent,
    MatMenuTrigger,
    SearchToolComponent,
    LanguageSelectorComponent,
    MatIcon,
    NotificationsTrayComponent_1,
    ThemeToggleComponent,
    MatMenu,
    MatMenuItem
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent implements OnInit, AfterViewInit, AfterContentChecked {
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);
  private authenticationService = inject(AuthenticationService);
  private popoverService = inject(PopoverService);
  private configurationWizardService = inject(ConfigurationWizardService);
  private dialog = inject(MatDialog);
  private changeDetector = inject(ChangeDetectorRef);
  private documentationLinks = inject(DocumentationLinksService);
  private destroyRef = inject(DestroyRef);

  /* Reference of institution */
  @ViewChild('institution') institution: ElementRef<any>;
  /* Template for popover on institution */
  @ViewChild('templateInstitution') templateInstitution: TemplateRef<any>;
  /* Reference of appMenu */
  @ViewChild('appMenu') appMenu: ElementRef<any>;
  /* Template for popover on appMenu */
  @ViewChild('templateAppMenu') templateAppMenu: TemplateRef<any>;
  @ViewChild('notificationsTray') notificationsTray: NotificationsTrayComponent;

  /** Subscription to breakpoint observer for handset. */
  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map((result) => result.matches));

  /** Sets the initial state of sidenav as collapsed. Not collapsed if false. */
  @Input() sidenavCollapsed = true;

  /** Instance of sidenav. */
  @Input() sidenav: MatSidenav;
  /** Sidenav collapse event. */
  @Output() collapse = new EventEmitter<boolean>();
  cashierWorkspace = false;
  loanOfficerWorkspace = false;
  chiefTellerWorkspace = false;
  vaultOfficerWorkspace = false;
  complianceOfficerWorkspace = false;
  cashierName = '';
  cashierOffice = '';

  /**
   * Subscribes to breakpoint for handset.
   */
  ngOnInit() {
    const credentials = this.authenticationService.getCredentials();
    const roles = Array.isArray(credentials?.roles) ? credentials.roles : [];
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
    this.chiefTellerWorkspace = roleNames.includes('chief teller');
    this.vaultOfficerWorkspace = !this.chiefTellerWorkspace && roleNames.includes('vault officer');
    this.complianceOfficerWorkspace =
      !this.chiefTellerWorkspace && !this.vaultOfficerWorkspace && roleNames.includes('compliance officer');
    this.cashierWorkspace =
      !this.chiefTellerWorkspace &&
      !this.vaultOfficerWorkspace &&
      !this.complianceOfficerWorkspace &&
      roleNames.includes('cashier') &&
      !roleNames.some((role: string) => elevatedRoles.includes(role));
    this.loanOfficerWorkspace =
      !this.chiefTellerWorkspace &&
      !this.vaultOfficerWorkspace &&
      !this.complianceOfficerWorkspace &&
      !this.cashierWorkspace &&
      roleNames.includes('loan officer') &&
      !roleNames.some((role: string) => elevatedRoles.includes(role));
    this.cashierName = credentials?.staffDisplayName || credentials?.username || 'Cashier';
    this.cashierOffice = credentials?.officeName || '';
    this.isHandset$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isHandset) => {
      if (isHandset && this.sidenavCollapsed) {
        this.toggleSidenavCollapse(false);
      }
    });
  }

  get focusedWorkspace(): boolean {
    return (
      this.cashierWorkspace ||
      this.loanOfficerWorkspace ||
      this.chiefTellerWorkspace ||
      this.vaultOfficerWorkspace ||
      this.complianceOfficerWorkspace
    );
  }

  get workspaceTitle(): string {
    if (this.cashierWorkspace) return 'Cashier';
    if (this.chiefTellerWorkspace) return 'Chief Teller';
    if (this.vaultOfficerWorkspace) return 'Vault Officer';
    if (this.complianceOfficerWorkspace) return 'Compliance Officer';
    return 'Loan Officer';
  }

  get workspaceIcon(): string {
    if (this.cashierWorkspace) return 'point_of_sale';
    if (this.chiefTellerWorkspace) return 'account_balance';
    if (this.vaultOfficerWorkspace) return 'inventory_2';
    if (this.complianceOfficerWorkspace) return 'policy';
    return 'request_quote';
  }

  get workspaceSubtitle(): string {
    if (this.cashierWorkspace) return 'Serve members and manage your teller drawer';
    if (this.chiefTellerWorkspace) return 'Control cashier drawers, allocations and recoveries';
    if (this.vaultOfficerWorkspace) return 'Verify controlled vault cash movements';
    if (this.complianceOfficerWorkspace) return 'Review CTR and suspicious transaction cases';
    return 'Manage members, groups and loan applications';
  }

  ngAfterContentChecked(): void {
    this.changeDetector.detectChanges();
  }

  /**
   * Toggles the current state of sidenav.
   */
  toggleSidenav() {
    this.sidenav.toggle();
  }

  /**
   * Toggles the current collapsed state of sidenav.
   */
  toggleSidenavCollapse(sidenavCollapsed?: boolean) {
    this.sidenavCollapsed = sidenavCollapsed ?? !this.sidenavCollapsed;
    this.collapse.emit(this.sidenavCollapsed);
  }

  get cashierInitials(): string {
    return this.cashierName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join('')
      .toUpperCase();
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
   * Popover function
   * @param template TemplateRef<any>.
   * @param target HTMLElement | ElementRef<any>.
   * @param position String.
   * @param backdrop Boolean.
   */
  showPopover(template: TemplateRef<any>, target: ElementRef<any> | HTMLElement): void {
    if (!target) {
      return;
    }
    setTimeout(() => this.popoverService.open(template, target, 'bottom', true, {}), 200);
  }

  /**
   * Next Step (SideNavbar) Configuration Wizard.
   */
  nextStep() {
    this.configurationWizardService.showToolbar = false;
    this.configurationWizardService.showToolbarAdmin = false;
    this.configurationWizardService.showSideNav = true;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }

  /**
   * Open Configuration Wizard Dialog
   */
  openDialog() {
    const configWizardRef = this.dialog.open(ConfigurationWizardComponent, {});

    configWizardRef.afterClosed().subscribe((response: { show: number } | undefined) => {
      if (!response) {
        return;
      }

      switch (response.show) {
        case 1:
          this.configurationWizardService.showToolbar = true;
          this.router.routeReuseStrategy.shouldReuseRoute = () => false;
          this.router.onSameUrlNavigation = 'reload';
          this.router.navigate(['/home']);
          break;
        case 2:
          this.configurationWizardService.showCreateOffice = true;
          this.router.navigate(['/organization']);
          break;
        case 3:
          this.configurationWizardService.showDatatables = true;
          this.router.navigate(['/system']);
          break;
        case 4:
          this.configurationWizardService.showChartofAccounts = true;
          this.router.navigate(['/accounting']);
          break;
        case 5:
          this.configurationWizardService.showCharges = true;
          this.router.navigate(['/products']);
          break;
        case 6:
          this.configurationWizardService.showManageFunds = true;
          this.router.navigate(['/organization']);
          break;
        case 0:
          break;
        default:
          break;
      }
    });
  }

  /**
   * To show popovers
   */
  ngAfterViewInit() {
    if (this.configurationWizardService.showToolbar) {
      setTimeout(() => {
        this.showPopover(this.templateInstitution, this.institution.nativeElement);
      });
    }

    if (this.configurationWizardService.showSideNav || this.configurationWizardService.showSideNavChartofAccounts) {
      this.toggleSidenavCollapse();
    }

    if (this.configurationWizardService.showToolbarAdmin) {
      setTimeout(() => {
        this.showPopover(this.templateAppMenu, this.appMenu.nativeElement);
      });
    }
  }

  navigateMenu(routePath: string): void {
    this.router.navigate([routePath]);
  }
}
