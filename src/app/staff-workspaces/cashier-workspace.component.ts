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
import { ActivatedRoute } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';

import { ClientsService } from 'app/clients/clients.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Dates } from 'app/core/utils/dates';
import { OrganizationService } from 'app/organization/organization.service';
import { SavingsService } from 'app/savings/savings.service';
import { SettingsService } from 'app/settings/settings.service';
import { SharesService } from 'app/shares/shares.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { CashierWorkspaceView, WorkspaceNavigationService } from 'app/core/shell/workspace-navigation.service';

type CashierAction = 'deposit' | 'withdrawal' | 'shares' | 'fee';

@Component({
  selector: 'mifosx-cashier-workspace',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon
  ],
  templateUrl: './cashier-workspace.component.html',
  styleUrls: ['./cashier-workspace.component.scss']
})
export class CashierWorkspaceComponent implements OnInit {
  private authenticationService = inject(AuthenticationService);
  private clientsService = inject(ClientsService);
  private savingsService = inject(SavingsService);
  private sharesService = inject(SharesService);
  private organizationService = inject(OrganizationService);
  private settingsService = inject(SettingsService);
  private dates = inject(Dates);
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private workspaceNavigation = inject(WorkspaceNavigationService);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  credentials = this.authenticationService.getCredentials();
  activeView: CashierWorkspaceView = 'transactions';
  selectedAction: CashierAction = 'deposit';
  clients: any[] = [];
  selectedClient: any = null;
  accounts: any = null;
  charges: any[] = [];
  drawer: any = null;
  tellerId: any = null;
  cashierId: any = null;
  drawerReady = false;
  loading = false;
  submitting = false;
  message = '';
  messageType: 'error' | 'success' | '' = '';
  pendingTransaction: any = null;
  receipt: any = null;

  searchControl = this.formBuilder.control('', [
    Validators.required,
    Validators.minLength(2)
  ]);
  transactionForm = this.formBuilder.group({
    savingsAccountId: [
      '',
      Validators.required
    ],
    shareAccountId: [''],
    chargeId: [''],
    amount: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    requestedShares: [
      null as number | null,
      [Validators.min(1)]
    ],
    note: ['']
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const view = params.get('view');
      if (
        view === 'home' ||
        view === 'transactions' ||
        view === 'drawer' ||
        view === 'records' ||
        view === 'receipts'
      ) {
        this.workspaceNavigation.setCashierView(view);
      }
    });
    this.workspaceNavigation.cashierView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
      this.setView(view);
      this.changeDetectorRef.markForCheck();
    });
    this.loadDrawer();
  }

  setView(view: CashierWorkspaceView): void {
    this.activeView = view;
  }

  startTransaction(action: CashierAction): void {
    this.workspaceNavigation.setCashierView('transactions');
    this.selectAction(action);
  }

  get cashierName(): string {
    return this.credentials?.staffDisplayName || this.credentials?.username || 'Cashier';
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

  get drawerRecords(): any[] {
    return this.drawer?.cashierTransactions?.pageItems || this.drawer?.cashierTransactions || [];
  }

  get availableCash(): number {
    return Number(this.drawer?.netCash || 0);
  }

  get actionTitle(): string {
    return {
      deposit: 'Cash deposit',
      withdrawal: 'Cash withdrawal',
      shares: 'Share purchase',
      fee: 'Fee payment'
    }[this.selectedAction];
  }

  selectAction(action: CashierAction): void {
    this.selectedAction = action;
    this.pendingTransaction = null;
    this.receipt = null;
    this.message = '';
    this.transactionForm.patchValue({
      savingsAccountId: '',
      shareAccountId: '',
      chargeId: '',
      amount: null,
      requestedShares: null
    });
  }

  searchMembers(): void {
    if (this.searchControl.invalid) {
      this.showMessage('Enter at least two letters or numbers to find a member.', 'error');
      return;
    }
    this.loading = true;
    this.message = '';
    this.clientsService
      .searchClientsInOffice(this.searchControl.value || '', this.credentials.officeId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          this.clients = response || [];
          if (!this.clients.length) this.showMessage('No member matched that search.', 'error');
        },
        error: () =>
          this.showMessage(
            'Members could not be loaded. Ask an administrator to check your member permissions.',
            'error'
          )
      });
  }

  selectClient(client: any): void {
    this.loading = true;
    this.selectedClient = client;
    this.pendingTransaction = null;
    this.receipt = null;
    forkJoin({
      accounts: this.clientsService.getClientAccountData(client.id),
      charges: this.clientsService.getClientChargesData(client.id).pipe(catchError(() => of([])))
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ accounts, charges }: any) => {
          this.accounts = accounts;
          this.charges = charges?.pageItems || charges || [];
          this.message = '';
        },
        error: () =>
          this.showMessage('This member’s accounts could not be opened. Check your account permissions.', 'error')
      });
  }

  get savingsAccounts(): any[] {
    return (this.accounts?.savingsAccounts || []).filter((account: any) => account.status?.active !== false);
  }

  get shareAccounts(): any[] {
    return (this.accounts?.shareAccounts || []).filter(
      (account: any) => !account.status?.closed && !account.status?.rejected
    );
  }

  prepareTransaction(): void {
    if (!this.drawerReady) {
      this.showMessage('Your cashier drawer is not ready. Ask the Chief Teller to assign and fund it first.', 'error');
      return;
    }
    const form = this.transactionForm.getRawValue();
    const amount = Number(form.amount || 0);
    if (this.selectedAction === 'shares' && (!form.shareAccountId || Number(form.requestedShares || 0) < 1)) {
      this.showMessage('Choose a share account and enter the number of shares.', 'error');
      return;
    }
    if (this.selectedAction === 'fee' && (!form.chargeId || amount < 1)) {
      this.showMessage('Choose an outstanding fee and enter the amount received.', 'error');
      return;
    }
    if (
      (this.selectedAction === 'deposit' || this.selectedAction === 'withdrawal') &&
      (!form.savingsAccountId || amount < 1)
    ) {
      this.showMessage('Choose a savings account and enter a valid amount.', 'error');
      return;
    }
    if (this.selectedAction === 'withdrawal' && this.drawer && amount > Number(this.drawer.netCash || 0)) {
      this.showMessage('The drawer does not have enough cash for this withdrawal.', 'error');
      return;
    }

    this.pendingTransaction = {
      action: this.selectedAction,
      amount,
      requestedShares: Number(form.requestedShares || 0),
      member: this.selectedClient?.displayName,
      accountId: form.savingsAccountId || form.shareAccountId,
      chargeId: form.chargeId
    };
    this.message = '';
  }

  cancelPending(): void {
    this.pendingTransaction = null;
  }

  confirmTransaction(): void {
    if (!this.pendingTransaction || this.submitting) return;
    this.submitting = true;
    const form = this.transactionForm.getRawValue();
    const dateFormat = this.settingsService.dateFormat;
    const locale = this.settingsService.language.code;
    const transactionDate = this.dates.formatDate(this.settingsService.businessDate, dateFormat);
    let request$;

    if (this.selectedAction === 'deposit' || this.selectedAction === 'withdrawal') {
      request$ = this.savingsService.getSavingsTransactionTemplateResource(form.savingsAccountId).pipe(
        switchMap((template: any) => {
          const paymentType =
            (template?.paymentTypeOptions || []).find((item: any) => item.isCashPayment) ||
            template?.paymentTypeOptions?.[0];
          return this.savingsService.executeSavingsAccountTransactionsCommand(
            form.savingsAccountId,
            this.selectedAction,
            {
              transactionDate,
              transactionAmount: Number(form.amount),
              paymentTypeId: paymentType?.id,
              note: form.note,
              dateFormat,
              locale
            }
          );
        })
      );
    } else if (this.selectedAction === 'shares') {
      request$ = this.sharesService.getSharesAccountData(form.shareAccountId, true).pipe(
        switchMap((shareAccount: any) =>
          this.sharesService.executeSharesAccountCommand(form.shareAccountId, 'applyadditionalshares', {
            requestedDate: transactionDate,
            requestedShares: Number(form.requestedShares),
            unitPrice: shareAccount.currentMarketPrice,
            dateFormat,
            locale
          })
        )
      );
    } else {
      request$ = this.clientsService.payClientCharge(this.selectedClient.id, form.chargeId, {
        amount: Number(form.amount),
        transactionDate,
        dateFormat,
        locale
      });
    }

    request$.pipe(finalize(() => (this.submitting = false))).subscribe({
      next: (response: any) => {
        this.receipt = {
          reference: response?.changes?.transactionId || response?.resourceId || response?.transactionId || 'Recorded',
          member: this.selectedClient.displayName,
          action: this.selectedAction,
          amount: this.selectedAction === 'shares' ? `${form.requestedShares} share(s)` : Number(form.amount),
          date: transactionDate
        };
        this.pendingTransaction = null;
        this.showMessage('The transaction was recorded successfully.', 'success');
        this.selectClient(this.selectedClient);
        this.refreshDrawerSummary();
      },
      error: () =>
        this.showMessage(
          'The transaction was not recorded. No second attempt was made; please check the details and try again.',
          'error'
        )
    });
  }

  printReceipt(): void {
    window.print();
  }

  private loadDrawer(): void {
    if (!this.credentials?.staffId) {
      this.showMessage(
        'Your login is not linked to a staff record. Ask an administrator to complete the cashier setup.',
        'error'
      );
      return;
    }
    this.organizationService.getTellers().subscribe({
      next: (tellers: any) => {
        const tellerList = tellers?.pageItems || tellers || [];
        if (!tellerList.length) {
          this.showMessage('No teller drawer has been configured for your office.', 'error');
          return;
        }
        forkJoin(
          tellerList.map((teller: any) =>
            this.organizationService.getCashiers(teller.id).pipe(
              catchError(() => of([])),
              switchMap((cashiers: any) => of({ teller, cashiers: cashiers?.pageItems || cashiers || [] }))
            )
          )
        ).subscribe((results: any[]) => {
          const match = results
            .flatMap((result: any) => result.cashiers.map((cashier: any) => ({ teller: result.teller, cashier })))
            .find((item: any) => Number(item.cashier.staffId) === Number(this.credentials.staffId));
          if (!match) {
            this.showMessage(
              'You are not assigned to an active cashier drawer. Ask the Chief Teller to assign you.',
              'error'
            );
            return;
          }
          this.tellerId = match.teller.id;
          this.cashierId = match.cashier.id;
          this.drawerReady = true;
          this.refreshDrawerSummary();
        });
      },
      error: () =>
        this.showMessage(
          'Your drawer could not be checked. Ask an administrator to confirm your teller permissions.',
          'error'
        )
    });
  }

  private refreshDrawerSummary(): void {
    if (!this.tellerId || !this.cashierId) return;
    this.organizationService.getCashierSummaryAndTransactions(this.tellerId, this.cashierId, 'UGX').subscribe({
      next: (response: any) => {
        this.drawer = response;
        this.drawerReady = true;
      },
      error: () => this.showMessage('Your drawer summary could not be refreshed.', 'error')
    });
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    this.message = message;
    this.messageType = type;
  }
}
