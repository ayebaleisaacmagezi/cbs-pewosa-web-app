/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { ClientsService } from 'app/clients/clients.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { LoanOfficerWorkspaceView, WorkspaceNavigationService } from 'app/core/shell/workspace-navigation.service';
import { Dates } from 'app/core/utils/dates';
import { GroupsService } from 'app/groups/groups.service';
import { LoansService } from 'app/loans/loans.service';
import { LoanPrequalificationResult } from 'app/loans/pewosa-loan-application.models';
import { PewosaLoanApplicationService } from 'app/loans/pewosa-loan-application.service';
import { ProductsService } from 'app/products/products.service';
import { SettingsService } from 'app/settings/settings.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MemberSearchComponent } from './member-search/member-search.component';
import { resolveTellerCurrencyCode } from './teller-api.models';

@Component({
  selector: 'mifosx-loan-officer-workspace',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MemberSearchComponent
  ],
  templateUrl: './loan-officer-workspace.component.html',
  styleUrls: [
    './staff-workspace.scss',
    './loan-officer-workspace.component.scss'
  ]
})
export class LoanOfficerWorkspaceComponent implements OnInit {
  private authenticationService = inject(AuthenticationService);
  private clientsService = inject(ClientsService);
  private groupsService = inject(GroupsService);
  private loansService = inject(LoansService);
  private loanApplicationService = inject(PewosaLoanApplicationService);
  private productsService = inject(ProductsService);
  private settingsService = inject(SettingsService);
  private dates = inject(Dates);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private workspaceNavigation = inject(WorkspaceNavigationService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  credentials = this.authenticationService.getCredentials();
  activeView: LoanOfficerWorkspaceView = 'home';
  clients: any[] = [];
  selectedClient: any = null;
  selectedLoanApplicant: any = null;
  loanProducts: any[] = [];
  eligibilityResult: LoanPrequalificationResult | null = null;
  checkingEligibility = false;
  accounts: any = null;
  charges: any[] = [];
  applications: any[] = [];
  groups: any[] = [];
  groupMemberResults: any[] = [];
  selectedGroupMembers: any[] = [];
  loading = false;
  submitting = false;
  message = '';
  messageType: 'error' | 'success' | '' = '';
  private memberRequestId = 0;

  currencyCodeFor(source: unknown): string {
    return resolveTellerCurrencyCode([source]);
  }

  get hasServicingPermission(): boolean {
    const permissions = this.credentials?.permissions || [];
    return (
      permissions.includes('ALL_FUNCTIONS') ||
      permissions.includes('ALL_FUNCTIONS_READ') ||
      permissions.includes('READ_PEWOSALOANSERVICING')
    );
  }

  get hasApprovalPermission(): boolean {
    const permissions = this.credentials?.permissions || [];
    return (
      permissions.includes('ALL_FUNCTIONS') ||
      permissions.includes('ALL_FUNCTIONS_READ') ||
      permissions.includes('READ_PEWOSALOANAPPROVAL') ||
      permissions.includes('APPROVE_PEWOSALOANAPPROVAL') ||
      permissions.includes('APPROVE_PEWOSALOANBRANCHMANAGER') ||
      permissions.includes('APPROVE_PEWOSALOANCREDITCOMMITTEE') ||
      permissions.includes('APPROVE_PEWOSALOANBOARD')
    );
  }

  memberSearchControl = this.formBuilder.control('', [
    Validators.required,
    Validators.minLength(2)
  ]);
  groupMemberSearchControl = this.formBuilder.control('', [
    Validators.required,
    Validators.minLength(2)
  ]);
  groupForm = this.formBuilder.group({
    name: [
      '',
      [
        Validators.required,
        Validators.pattern('(^[A-z]).*')
      ]
    ],
    active: [true],
    activationDate: [
      this.settingsService.businessDate,
      Validators.required
    ]
  });
  eligibilityForm = this.formBuilder.group({
    loanProductId: this.formBuilder.control<number | null>(null, Validators.required),
    requestedAmount: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ])
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const view = params.get('view') as LoanOfficerWorkspaceView | null;
      if (view && [
          'home',
          'new-loan',
          'members',
          'groups',
          'applications'
        ].includes(view)) this.workspaceNavigation.setLoanOfficerView(view);
    });
    this.workspaceNavigation.loanOfficerView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
      this.setView(view);
      this.changeDetectorRef.markForCheck();
    });
    this.eligibilityForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.eligibilityResult = null;
    });
    this.loadApplications();
    this.loadGroups();
    this.loadLoanProducts();
  }

  setView(view: LoanOfficerWorkspaceView): void {
    this.workspaceNavigation.setLoanOfficerView(view);
    this.activeView = view;
    this.message = '';
    if (view === 'applications') this.loadApplications();
    if (view === 'groups') this.loadGroups();
  }

  searchMembers(): void {
    if (this.memberSearchControl.invalid) {
      this.showMessage('Enter at least two letters or numbers to find a member.', 'error');
      return;
    }
    this.loading = true;
    this.clientsService
      .searchClientsInOffice(this.memberSearchControl.value || '', this.credentials.officeId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (response: any) => {
          this.clients = response || [];
          if (!this.clients.length) this.showMessage('No member matched that search.', 'error');
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.showMessage(
            'Members could not be loaded. Ask an administrator to check your member permissions.',
            'error'
          );
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  openMember(client: any): void {
    const requestId = ++this.memberRequestId;
    this.selectedClient = client;
    this.accounts = null;
    this.charges = [];
    this.loading = true;
    forkJoin({
      details: this.clientsService.getClientData(client.id),
      accounts: this.clientsService.getClientAccountData(client.id),
      charges: this.clientsService.getClientChargesData(client.id).pipe(catchError(() => of([])))
    })
      .pipe(
        finalize(() => {
          if (requestId === this.memberRequestId) this.loading = false;
        })
      )
      .subscribe({
        next: ({ details, accounts, charges }: any) => {
          if (requestId !== this.memberRequestId) return;
          this.selectedClient = details;
          this.accounts = accounts;
          this.charges = charges?.pageItems || charges || [];
          this.message = '';
        },
        error: () => {
          if (requestId === this.memberRequestId) {
            this.showMessage('This member’s products could not be loaded.', 'error');
          }
        }
      });
  }

  searchGroupMembers(): void {
    if (this.groupMemberSearchControl.invalid) return;
    this.clientsService
      .getFilteredClients(
        'displayName',
        'ASC',
        true,
        this.groupMemberSearchControl.value || '',
        this.credentials?.officeId
      )
      .subscribe({
        next: (response: any) => (this.groupMemberResults = response?.pageItems || response || []),
        error: () => this.showMessage('Available members could not be loaded.', 'error')
      });
  }

  addGroupMember(client: any): void {
    if (!this.selectedGroupMembers.some((member) => member.id === client.id)) this.selectedGroupMembers.push(client);
  }

  removeGroupMember(client: any): void {
    this.selectedGroupMembers = this.selectedGroupMembers.filter((member) => member.id !== client.id);
  }

  createGroup(): void {
    if (this.groupForm.invalid || !this.selectedGroupMembers.length || this.submitting) {
      this.showMessage('Enter the group name and attach at least one member.', 'error');
      return;
    }
    this.submitting = true;
    const values = this.groupForm.getRawValue();
    const dateFormat = this.settingsService.dateFormat;
    const payload = {
      name: values.name?.trim(),
      officeId: this.credentials?.officeId,
      staffId: this.credentials?.staffId,
      submittedOnDate: this.dates.formatDate(this.settingsService.businessDate, dateFormat),
      active: values.active,
      activationDate: this.dates.formatDate(values.activationDate, dateFormat),
      clientMembers: this.selectedGroupMembers.map((member) => member.id),
      dateFormat,
      locale: this.settingsService.language.code
    };
    this.groupsService
      .createGroup(payload)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (response: any) => {
          this.groupForm.reset({ active: true, activationDate: this.settingsService.businessDate });
          this.selectedGroupMembers = [];
          this.groupMemberResults = [];
          this.showMessage(`Group created successfully. Group reference: ${response.resourceId}`, 'success');
          this.loadGroups();
        },
        error: () =>
          this.showMessage(
            'The group was not created. Confirm that all selected members belong to this office.',
            'error'
          )
      });
  }

  startLoan(clientId?: any): void {
    const id = clientId || this.selectedClient?.id;
    if (id && this.eligibilityResult?.eligible)
      this.router.navigate(
        [
          '/clients',
          id,
          'loans-accounts',
          'create'
        ],
        {
          queryParams: {
            workspace: 'loan-officer',
            loanProductId: this.eligibilityResult.loanProductId,
            requestedAmount: this.eligibilityResult.requestedAmount,
            eligibilityReference: this.eligibilityResult.reference
          }
        }
      );
  }

  selectLoanApplicant(client: any): void {
    this.selectedLoanApplicant = client;
    this.eligibilityResult = null;
    this.eligibilityForm.reset();
    this.message = '';
  }

  clearLoanApplicant(): void {
    this.selectedLoanApplicant = null;
    this.eligibilityResult = null;
    this.eligibilityForm.reset();
  }

  beginLoanForMember(client: any): void {
    this.selectLoanApplicant(client);
    this.setView('new-loan');
  }

  checkEligibility(): void {
    if (!this.selectedLoanApplicant || this.eligibilityForm.invalid || this.checkingEligibility) {
      this.eligibilityForm.markAllAsTouched();
      this.showMessage('Choose a member, loan product, and valid requested amount.', 'error');
      return;
    }
    const values = this.eligibilityForm.getRawValue();
    this.checkingEligibility = true;
    this.eligibilityResult = null;
    this.message = '';
    this.loanApplicationService
      .evaluatePrequalification({
        clientId: this.selectedLoanApplicant.id,
        loanProductId: values.loanProductId as number,
        requestedAmount: values.requestedAmount as number
      })
      .pipe(finalize(() => (this.checkingEligibility = false)))
      .subscribe({
        next: (result) => {
          this.eligibilityResult = result;
          if (!result.eligible)
            this.showMessage('This member does not currently meet the selected product rules.', 'error');
          this.changeDetectorRef.markForCheck();
        },
        error: () =>
          this.showMessage(
            'Pre-qualification could not be completed. Confirm that this product has an active loan policy.',
            'error'
          )
      });
  }

  openApplication(application: any): void {
    const ownerId = application.clientId || application.groupId;
    if (!ownerId || !application.id) return;
    this.router.navigate([
      application.clientId ? '/clients' : '/groups',
      ownerId,
      'loans-accounts',
      application.id,
      'general'
    ]);
  }

  private loadApplications(): void {
    if (!this.credentials?.staffId) return;
    this.loansService.getLoansForOfficer(this.credentials.staffId).subscribe({
      next: (response: any) => (this.applications = response?.pageItems || response || []),
      error: () => this.showMessage('Loan applications assigned to you could not be loaded.', 'error')
    });
  }

  private loadLoanProducts(): void {
    this.productsService.getLoanProductsBasicDetails().subscribe({
      next: (response: any) => (this.loanProducts = response || []),
      error: () => this.showMessage('Loan products could not be loaded.', 'error')
    });
  }

  private loadGroups(): void {
    this.groupsService.getFilteredGroups('name', 'ASC', '', this.credentials?.officeId, false).subscribe({
      next: (response: any) => (this.groups = response?.pageItems || response || []),
      error: () => this.showMessage('Groups for this office could not be loaded.', 'error')
    });
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    this.message = message;
    this.messageType = type;
  }
}
