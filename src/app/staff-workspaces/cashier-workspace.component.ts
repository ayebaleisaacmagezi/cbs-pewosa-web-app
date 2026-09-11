/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { ClientsService } from 'app/clients/clients.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Dates } from 'app/core/utils/dates';
import { OrganizationService } from 'app/organization/organization.service';
import { LoansService } from 'app/loans/loans.service';
import { SavingsService } from 'app/savings/savings.service';
import { SettingsService } from 'app/settings/settings.service';
import { SharesService } from 'app/shares/shares.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { CashierWorkspaceView, WorkspaceNavigationService } from 'app/core/shell/workspace-navigation.service';
import { MemberSearchComponent } from './member-search/member-search.component';
import {
  CashierMemberContext,
  CashierTransactionDraft,
  CashierTransactionResult,
  CashierTransactionState,
  TellerDrawerSummary,
  TellerDrawerTransaction,
  TellerCashMovement,
  TellerOperationType,
  TellerPreflightResponse,
  TellerReversal,
  TellerShift,
  TellerTransactionDetail,
  TellerTransactionAction,
  TellerTransactionStage,
  extractTellerTransactionReference,
  resolveTellerCurrencyCode
} from './teller-api.models';
import { TellerApiService } from './teller-api.service';
import { TellerTransactionStateService } from './teller-transaction-state.service';

function cashCountMatchesAmount(control: AbstractControl): ValidationErrors | null {
  const transactionAmount = Number(control.parent?.get('amount')?.value || 0);
  const countedAmount = Number(control.value || 0);
  if (!transactionAmount || !countedAmount) return null;
  return transactionAmount === countedAmount ? null : { cashCountMismatch: true };
}

@Component({
  selector: 'mifosx-cashier-workspace',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIconButton,
    MatIcon,
    MemberSearchComponent
  ],
  templateUrl: './cashier-workspace.component.html',
  styleUrls: ['./cashier-workspace.component.scss']
})
export class CashierWorkspaceComponent implements OnInit {
  private authenticationService = inject(AuthenticationService);
  private clientsService = inject(ClientsService);
  private loansService = inject(LoansService);
  private savingsService = inject(SavingsService);
  private sharesService = inject(SharesService);
  private organizationService = inject(OrganizationService);
  private settingsService = inject(SettingsService);
  private dates = inject(Dates);
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private workspaceNavigation = inject(WorkspaceNavigationService);
  private tellerApi = inject(TellerApiService);
  private transactionState = inject(TellerTransactionStateService);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  credentials = this.authenticationService.getCredentials();
  activeView: CashierWorkspaceView = 'transactions';
  transactionStage: TellerTransactionStage = 'member';
  selectedAction: TellerTransactionAction = 'deposit';
  selectedClient: any = null;
  accounts: any = null;
  charges: any[] = [];
  approvedLoanQueue: any[] = [];
  sharePreview: any = null;
  loanDisbursementPreview: any = null;
  drawer: TellerDrawerSummary | null = null;
  tellerId: any = null;
  cashierId: any = null;
  drawerReady = false;
  loading = false;
  submitting = false;
  reviewAttempted = false;
  message = '';
  messageType: 'error' | 'success' | '' = '';
  pendingTransaction: CashierTransactionDraft | null = null;
  receipt: CashierTransactionResult | null = null;
  shift: TellerShift | null = null;
  awaitingCashReceipt: TellerCashMovement | null = null;
  reversal: TellerReversal | null = null;
  reversalOriginalTransaction: TellerTransactionDetail | null = null;
  private memberDetailsRequestId = 0;
  private queuedLoanId: number | null = null;
  transactionForm = this.formBuilder.group({
    savingsAccountId: [
      '',
      Validators.required
    ],
    shareAccountId: [''],
    loanAccountId: [''],
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
    note: [''],
    identityMethod: [
      '',
      Validators.required
    ],
    slipReference: [
      '',
      Validators.required
    ],
    slipVerified: [false],
    amountVerified: [false],
    countedAmount: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1),
        cashCountMatchesAmount
      ]
    ],
    cashAuthenticityVerified: [false],
    signatureVerified: [false],
    disbursementMode: ['CASH' as 'CASH' | 'CHEQUE' | 'DIRECT_TO_SAVINGS'],
    chequeNumber: [''],
    bankName: [''],
    loanApprovalVerified: [false],
    collateralSecured: [false],
    loanDocumentsVerified: [false]
  });
  reconciliationForm = this.formBuilder.group({
    denominations: this.formBuilder.array([this.createDenominationLine()]),
    explanation: [''],
    depositSlipsSubmitted: [false],
    withdrawalSlipsSubmitted: [false],
    loanDocumentsSubmitted: [false],
    expenseVouchersSubmitted: [false]
  });
  cashRequestForm = this.formBuilder.group({
    amount: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    note: [
      '',
      Validators.required
    ],
    denominations: this.formBuilder.array([this.createDenominationLine()])
  });
  reversalForm = this.formBuilder.group({
    originalReference: [
      '',
      Validators.required
    ],
    reason: [
      '',
      Validators.required
    ]
  });

  get denominationLines() {
    return this.reconciliationForm.controls.denominations;
  }

  get physicalCashTotal(): number {
    return this.denominationLines
      .getRawValue()
      .reduce((total, line) => total + Number(line.denomination || 0) * Number(line.quantity || 0), 0);
  }

  get cashRequestDenominationLines() {
    return this.cashRequestForm.controls.denominations;
  }

  get requestedCashTotal(): number {
    return this.cashRequestDenominationLines
      .getRawValue()
      .reduce((total, line) => total + Number(line.denomination || 0) * Number(line.quantity || 0), 0);
  }

  ngOnInit(): void {
    this.transactionForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pendingTransaction = null;
      this.transactionForm.controls.countedAmount.updateValueAndValidity({ emitEvent: false });
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const view = params.get('view');
      if (
        view === 'home' ||
        view === 'transactions' ||
        view === 'drawer' ||
        view === 'reversals' ||
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
    this.restoreTransactionState();
    this.loadDrawer();
    this.loadApprovedLoanQueue();
  }

  setView(view: CashierWorkspaceView): void {
    this.activeView = view;
  }

  startTransaction(action: TellerTransactionAction): void {
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

  get drawerRecords(): TellerDrawerTransaction[] {
    const transactions = this.drawer?.cashierTransactions;
    if (Array.isArray(transactions)) return transactions;
    return transactions?.pageItems || [];
  }

  get currencyCode(): string {
    const form = this.transactionForm.getRawValue();
    const selectedAccount = [
      ...this.savingsAccounts,
      ...this.loanAccounts,
      ...this.shareAccounts
    ].find((account: any) => account.id === (form.savingsAccountId || form.loanAccountId || form.shareAccountId));
    return resolveTellerCurrencyCode(
      [
        this.receipt,
        selectedAccount,
        this.drawer
      ],
      'UGX'
    );
  }

  currencyCodeFor(source: unknown): string {
    return resolveTellerCurrencyCode([
      source,
      this.drawer
    ]);
  }

  get transactionNeedsRecovery(): boolean {
    return this.transactionState?.snapshot.submissionStatus === 'recovery-required';
  }

  get incompleteDepositCount(): number {
    if (!this.reviewAttempted || this.selectedAction !== 'deposit') return 0;

    const form = this.transactionForm.getRawValue();
    const amount = Number(form.amount || 0);
    const countedAmount = Number(form.countedAmount || 0);

    return [
      !form.savingsAccountId,
      amount < 1,
      !form.identityMethod,
      !form.slipReference?.trim(),
      !form.slipVerified,
      !form.amountVerified,
      !form.cashAuthenticityVerified,
      countedAmount < 1 || countedAmount !== amount
    ].filter(Boolean).length;
  }

  get availableCash(): number {
    return Number(this.drawer?.netCash || 0);
  }

  addDenominationLine(): void {
    this.denominationLines.push(this.createDenominationLine());
  }

  removeDenominationLine(index: number): void {
    if (this.denominationLines.length > 1) this.denominationLines.removeAt(index);
  }

  addCashRequestDenominationLine(): void {
    this.cashRequestDenominationLines.push(this.createDenominationLine());
  }

  removeCashRequestDenominationLine(index: number): void {
    if (this.cashRequestDenominationLines.length > 1) this.cashRequestDenominationLines.removeAt(index);
  }

  requestVaultCash(): void {
    if (!this.cashierId || this.submitting || this.cashRequestForm.invalid) {
      this.showMessage('Enter a cash request amount, denomination breakdown, and reason.', 'error');
      return;
    }
    const value = this.cashRequestForm.getRawValue();
    const amount = Number(value.amount || 0);
    const denominations = value.denominations.map((line) => ({
      denomination: Number(line.denomination || 0),
      quantity: Number(line.quantity || 0)
    }));
    if (amount !== this.requestedCashTotal) {
      this.showMessage('The denomination total must equal the requested amount.', 'error');
      return;
    }
    this.submitting = true;
    this.tellerApi
      .createCashMovement({
        movementType: 'VAULT_TO_TELLER',
        cashierId: Number(this.cashierId),
        amount,
        currencyCode: this.currencyCode,
        denominations,
        note: value.note || undefined
      })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (movement) => {
          this.cashRequestForm.reset({ amount: null, note: '', denominations: [] });
          while (this.cashRequestDenominationLines.length) this.cashRequestDenominationLines.removeAt(0);
          this.cashRequestDenominationLines.push(this.createDenominationLine());
          this.showMessage(`Cash request ${movement.reference} is awaiting two vault verifications.`, 'success');
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  acknowledgeCashReceipt(): void {
    if (!this.awaitingCashReceipt || this.submitting) return;
    this.submitting = true;
    this.tellerApi
      .updateCashMovement(this.awaitingCashReceipt.reference, 'ACKNOWLEDGE')
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.awaitingCashReceipt = null;
          this.showMessage('Cash receipt was acknowledged and the drawer was updated.', 'success');
          this.refreshDrawerSummary();
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  requestReversal(): void {
    if (this.reversalForm.invalid || this.submitting) return;
    const value = this.reversalForm.getRawValue();
    this.submitting = true;
    this.tellerApi
      .requestReversal(value.originalReference || '', value.reason || '')
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (reversal) => {
          this.reversal = reversal;
          this.loadReversalEvidence(reversal.originalReference);
          this.showMessage('The reversal request was recorded for authorized review.', 'success');
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  findReversal(): void {
    const reference = this.reversalForm.value.originalReference?.trim();
    if (!reference || this.submitting) return;
    this.submitting = true;
    this.tellerApi
      .getReversal(reference)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (reversal) => {
          this.reversal = reversal;
          this.loadReversalEvidence(reversal.originalReference);
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  printReversal(): void {
    if (!this.reversal) return;
    this.receipt = {
      reference: this.reversal.reference,
      member: this.reversal.originalReference,
      action: 'reversal',
      amount: this.reversal.status,
      date: this.reversal.audit?.createdAt || this.settingsService.businessDate,
      currencyCode: ''
    };
  }

  private loadReversalEvidence(originalReference: string): void {
    this.reversalOriginalTransaction = null;
    this.tellerApi.getTransaction(originalReference).subscribe({
      next: (transaction) => {
        this.reversalOriginalTransaction = transaction;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.reversalOriginalTransaction = null;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  openShift(): void {
    if (!this.cashierId || this.submitting) return;
    this.submitting = true;
    this.tellerApi
      .openShift(Number(this.cashierId), this.currencyCode)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (shift) => {
          this.shift = shift;
          this.showMessage('The teller shift is open.', 'success');
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  stopShift(): void {
    this.updateShift('STOP');
  }

  countShift(): void {
    const denominations = this.denominationLines.getRawValue().map((line) => ({
      denomination: Number(line.denomination || 0),
      quantity: Number(line.quantity || 0)
    }));
    if (denominations.some((line) => line.denomination <= 0 || line.quantity < 0)) {
      this.showMessage('Enter valid denomination values and quantities.', 'error');
      return;
    }
    this.updateShift('COUNT', { denominations, explanation: this.reconciliationForm.value.explanation || undefined });
  }

  submitShift(): void {
    const checklist = this.reconciliationForm.getRawValue();
    if (
      !checklist.depositSlipsSubmitted ||
      !checklist.withdrawalSlipsSubmitted ||
      !checklist.loanDocumentsSubmitted ||
      !checklist.expenseVouchersSubmitted
    ) {
      this.showMessage('Confirm that all supporting vouchers and documents were submitted.', 'error');
      return;
    }
    if (Number(this.shift?.variance || 0) !== 0 && !checklist.explanation?.trim()) {
      this.showMessage('Enter an explanation for the cash variance before submission.', 'error');
      return;
    }
    this.updateShift('SUBMIT', { explanation: checklist.explanation || undefined });
  }

  closeShift(): void {
    this.updateShift('CLOSE');
  }

  get actionTitle(): string {
    return {
      deposit: 'Cash deposit',
      withdrawal: 'Cash withdrawal',
      loanRepayment: 'Loan repayment',
      loanDisbursement: 'Loan disbursement',
      shares: 'Share purchase',
      fee: 'Fee payment'
    }[this.selectedAction];
  }

  selectAction(action: TellerTransactionAction): void {
    if (this.submitting) return;
    this.selectedAction = action;
    this.pendingTransaction = null;
    this.receipt = null;
    this.sharePreview = null;
    this.loanDisbursementPreview = null;
    this.reviewAttempted = false;
    this.message = '';
    this.transactionForm.patchValue({
      savingsAccountId: '',
      shareAccountId: '',
      loanAccountId: '',
      chargeId: '',
      amount: null,
      requestedShares: null,
      slipReference: '',
      slipVerified: false,
      amountVerified: false,
      countedAmount: null,
      cashAuthenticityVerified: false,
      signatureVerified: false,
      disbursementMode: 'CASH',
      chequeNumber: '',
      bankName: '',
      loanApprovalVerified: false,
      collateralSecured: false,
      loanDocumentsVerified: false
    });
    this.transactionStage = this.selectedClient ? 'transaction' : 'member';
    if (this.selectedClient) this.transactionState.selectMember(this.memberContext(this.selectedClient));
    else this.transactionState.reset();
  }

  resetMemberSelection(): void {
    if (this.submitting) return;
    this.memberDetailsRequestId += 1;
    this.selectedClient = null;
    this.accounts = null;
    this.charges = [];
    this.loanDisbursementPreview = null;
    this.pendingTransaction = null;
    this.receipt = null;
    this.message = '';
    this.reviewAttempted = false;
    this.loading = false;
    this.transactionStage = 'member';
    this.transactionState.reset();
    this.transactionForm.reset({
      savingsAccountId: '',
      shareAccountId: '',
      loanAccountId: '',
      chargeId: '',
      amount: null,
      requestedShares: null,
      note: '',
      identityMethod: '',
      slipReference: '',
      slipVerified: false,
      amountVerified: false,
      countedAmount: null,
      cashAuthenticityVerified: false,
      signatureVerified: false,
      disbursementMode: 'CASH',
      chequeNumber: '',
      bankName: '',
      loanApprovalVerified: false,
      collateralSecured: false,
      loanDocumentsVerified: false
    });
  }

  selectClient(client: any, preserveReceipt = false, restoredState?: CashierTransactionState): void {
    if (this.submitting && !preserveReceipt) return;
    const requestId = ++this.memberDetailsRequestId;
    this.loading = true;
    this.selectedClient = client;
    this.accounts = null;
    this.charges = [];
    this.loanDisbursementPreview = null;
    this.pendingTransaction = null;
    this.reviewAttempted = false;
    if (!preserveReceipt) this.receipt = null;
    this.transactionForm.reset();
    if (!preserveReceipt && !restoredState) {
      this.transactionStage = 'transaction';
      this.transactionState.selectMember(this.memberContext(client));
    }
    forkJoin({
      accounts: this.clientsService.getClientAccountData(client.id),
      charges: this.clientsService.getClientChargesData(client.id).pipe(catchError(() => of([])))
    })
      .pipe(
        finalize(() => {
          if (requestId === this.memberDetailsRequestId) this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: ({ accounts, charges }: any) => {
          if (requestId !== this.memberDetailsRequestId) return;
          this.accounts = accounts;
          this.charges = charges?.pageItems || charges || [];
          if (this.queuedLoanId) {
            const queuedLoan = this.approvedLoanAccounts.find(
              (account: any) => Number(account.id) === this.queuedLoanId
            );
            this.queuedLoanId = null;
            if (queuedLoan) this.selectLoanForDisbursement(queuedLoan);
          }
          if (restoredState) this.applyRestoredState(restoredState);
          this.message = '';
        },
        error: () => {
          if (requestId !== this.memberDetailsRequestId) return;
          this.showMessage('This member’s accounts could not be opened. Check your account permissions.', 'error');
        }
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

  get loanAccounts(): any[] {
    return (this.accounts?.loanAccounts || []).filter(
      (account: any) => account.status?.active || account.inArrears || account.status?.value?.toLowerCase() === 'active'
    );
  }

  get approvedLoanAccounts(): any[] {
    return (this.accounts?.loanAccounts || []).filter(
      (account: any) =>
        Number(account.status?.id) === 200 ||
        `${account.status?.code || account.status?.value || ''}`.toLowerCase().includes('approved')
    );
  }

  openApprovedLoanInstruction(loan: any): void {
    if (!loan?.clientId || !loan?.id || this.submitting) return;
    this.queuedLoanId = Number(loan.id);
    this.workspaceNavigation.setCashierView('transactions');
    this.selectAction('loanDisbursement');
    this.clientsService.getClientData(loan.clientId).subscribe({
      next: (client) => this.selectClient(client),
      error: () => {
        this.queuedLoanId = null;
        this.showMessage('The member attached to this approved loan could not be loaded.', 'error');
      }
    });
  }

  private loadApprovedLoanQueue(): void {
    this.loansService.getLoansByStatus(200).subscribe({
      next: (response: any) => {
        this.approvedLoanQueue = response?.pageItems || response || [];
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.approvedLoanQueue = [];
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  selectShareAccount(account: any): void {
    this.transactionForm.controls.shareAccountId.setValue(account.id);
    this.sharePreview = null;
    this.sharesService.getSharesAccountData(String(account.id), true).subscribe({
      next: (shareAccount) => {
        if (String(this.transactionForm.controls.shareAccountId.value) === String(account.id)) {
          this.sharePreview = shareAccount;
          this.changeDetectorRef.markForCheck();
        }
      },
      error: () => this.showMessage('The current share price and holding could not be loaded.', 'error')
    });
  }

  selectLoanForDisbursement(account: any): void {
    this.transactionForm.controls.loanAccountId.setValue(account.id);
    this.loanDisbursementPreview = null;
    this.loansService.getLoanAccountDetails(String(account.id)).subscribe({
      next: (loanAccount) => {
        if (String(this.transactionForm.controls.loanAccountId.value) === String(account.id)) {
          this.loanDisbursementPreview = loanAccount;
          this.changeDetectorRef.markForCheck();
        }
      },
      error: () => this.showMessage('The approved disbursement and deduction details could not be loaded.', 'error')
    });
  }

  get loanDisbursementDeductions(): number | null {
    const approvedPrincipal = Number(this.loanDisbursementPreview?.approvedPrincipal);
    const netDisbursalAmount = Number(this.loanDisbursementPreview?.netDisbursalAmount);
    if (!Number.isFinite(approvedPrincipal) || !Number.isFinite(netDisbursalAmount)) return null;
    return Math.max(approvedPrincipal - netDisbursalAmount, 0);
  }

  prepareTransaction(): void {
    this.reviewAttempted = true;
    this.transactionForm.markAllAsTouched();
    this.logTransactionEvent('review.started', {
      action: this.selectedAction,
      stage: this.transactionStage,
      formValid: this.transactionForm.valid,
      memberSelected: Boolean(this.selectedClient),
      accountsLoaded: Boolean(this.accounts),
      submitting: this.submitting,
      loading: this.loading,
      drawerReady: this.drawerReady,
      currencyCode: this.currencyCode
    });
    if (this.submitting || !this.selectedClient || !this.accounts || this.loading) {
      this.logTransactionEvent(
        'review.blocked',
        {
          reason: this.submitting
            ? 'submission-in-progress'
            : !this.selectedClient
              ? 'member-not-selected'
              : !this.accounts
                ? 'accounts-not-loaded'
                : 'member-details-loading'
        },
        'warning'
      );
      return;
    }
    if (this.shift && this.shift.status !== 'OPEN') {
      this.showMessage('This teller shift is not open for new transactions.', 'error');
      return;
    }
    this.pendingTransaction = null;
    const form = this.transactionForm.getRawValue();
    const amount = Number(form.amount || 0);
    const countedAmount = Number(form.countedAmount || 0);
    const configuredNetDisbursement = Number(this.loanDisbursementPreview?.netDisbursalAmount);
    const netDisbursementAmount =
      this.selectedAction === 'loanDisbursement' && Number.isFinite(configuredNetDisbursement)
        ? configuredNetDisbursement
        : amount;
    if (!form.identityMethod) {
      this.showMessage('Select the identity evidence checked for this member.', 'error');
      return;
    }
    if (
      this.selectedAction === 'shares' &&
      (!form.shareAccountId || Number(form.requestedShares || 0) < 1 || amount < 1)
    ) {
      this.showMessage('Choose a share account and enter the number of shares and cash amount.', 'error');
      return;
    }
    if (this.selectedAction === 'fee' && (!form.chargeId || amount < 1)) {
      this.showMessage('Choose an outstanding fee and enter the amount received.', 'error');
      return;
    }
    if (this.selectedAction === 'loanRepayment' && (!form.loanAccountId || amount < 1)) {
      this.showMessage('Choose an active loan account and enter a valid repayment amount.', 'error');
      return;
    }
    if (this.selectedAction === 'loanDisbursement' && (!form.loanAccountId || amount < 1)) {
      this.showMessage('Choose an approved loan and enter the instructed disbursement amount.', 'error');
      return;
    }
    if (
      this.selectedAction === 'loanDisbursement' &&
      (!form.loanApprovalVerified || !form.collateralSecured || !form.loanDocumentsVerified)
    ) {
      this.showMessage('Confirm the loan approval, collateral, and required documents before disbursement.', 'error');
      return;
    }
    if (
      this.selectedAction === 'loanDisbursement' &&
      form.disbursementMode === 'CHEQUE' &&
      (!form.chequeNumber?.trim() || !form.bankName?.trim())
    ) {
      this.showMessage('Enter the cheque number and issuing bank before disbursement.', 'error');
      return;
    }
    if (
      (this.selectedAction === 'deposit' || this.selectedAction === 'withdrawal') &&
      (!form.savingsAccountId || amount < 1)
    ) {
      this.showMessage('Choose a savings account and enter a valid amount.', 'error');
      return;
    }
    if ((this.selectedAction === 'deposit' || this.selectedAction === 'withdrawal') && !form.slipReference?.trim()) {
      this.showMessage('Enter the member slip or voucher reference.', 'error');
      return;
    }
    if (this.selectedAction === 'deposit' && (!form.slipVerified || !form.amountVerified)) {
      this.showMessage('Confirm the deposit slip and the amount in words before continuing.', 'error');
      return;
    }
    if (
      (this.selectedAction === 'deposit' ||
        this.selectedAction === 'loanRepayment' ||
        this.selectedAction === 'shares' ||
        this.selectedAction === 'fee') &&
      !form.cashAuthenticityVerified
    ) {
      this.showMessage('Confirm that the received cash was counted and checked for authenticity.', 'error');
      return;
    }
    if (this.selectedAction === 'withdrawal' && !form.signatureVerified) {
      this.showMessage('Confirm that the member signature matches the specimen.', 'error');
      return;
    }
    const expectedCashCount = this.selectedAction === 'loanDisbursement' ? netDisbursementAmount : amount;
    if (
      !(this.selectedAction === 'loanDisbursement' && form.disbursementMode !== 'CASH') &&
      countedAmount !== expectedCashCount
    ) {
      this.showMessage('The physical cash count must equal the net cash handed over at the counter.', 'error');
      return;
    }
    if (
      (this.selectedAction === 'withdrawal' ||
        (this.selectedAction === 'loanDisbursement' && form.disbursementMode === 'CASH')) &&
      !this.drawerReady
    ) {
      this.showMessage(
        'Cash withdrawals require an active teller drawer. Ask the Chief Teller to complete your setup.',
        'error'
      );
      return;
    }
    if (
      (this.selectedAction === 'withdrawal' ||
        (this.selectedAction === 'loanDisbursement' && form.disbursementMode === 'CASH')) &&
      expectedCashCount > this.availableCash
    ) {
      this.showMessage('The drawer does not have enough cash for this withdrawal.', 'error');
      return;
    }

    this.pendingTransaction = {
      ...form,
      action: this.selectedAction,
      amount,
      netDisbursementAmount: this.selectedAction === 'loanDisbursement' ? netDisbursementAmount : undefined,
      countedAmount,
      identityMethod: form.identityMethod || '',
      slipReference: form.slipReference || undefined,
      slipVerified: Boolean(form.slipVerified),
      amountVerified: Boolean(form.amountVerified),
      cashAuthenticityVerified: Boolean(form.cashAuthenticityVerified),
      signatureVerified: Boolean(form.signatureVerified),
      disbursementMode: form.disbursementMode || 'CASH',
      chequeNumber: form.chequeNumber || undefined,
      bankName: form.bankName || undefined,
      loanApprovalVerified: Boolean(form.loanApprovalVerified),
      collateralSecured: Boolean(form.collateralSecured),
      loanDocumentsVerified: Boolean(form.loanDocumentsVerified),
      requestedShares: Number(form.requestedShares || 0),
      member: this.selectedClient?.displayName,
      clientId: this.selectedClient.id,
      accountId:
        this.selectedAction === 'fee'
          ? this.selectedClient.id
          : form.savingsAccountId || form.loanAccountId || form.shareAccountId,
      chargeId: form.chargeId || undefined,
      currencyCode: this.currencyCode,
      idempotencyKey: this.transactionState.createIdempotencyKey()
    };
    this.transactionStage = 'review';
    this.transactionState.review(this.memberContext(this.selectedClient), this.pendingTransaction);
    this.message = '';
    this.logTransactionEvent('review.ready', {
      action: this.selectedAction,
      stage: this.transactionStage,
      currencyCode: this.pendingTransaction.currencyCode,
      drawerReady: this.drawerReady
    });
  }

  cancelPending(): void {
    this.logTransactionEvent('review.cancelled', { action: this.pendingTransaction?.action || this.selectedAction });
    this.pendingTransaction = null;
    this.reviewAttempted = false;
    this.transactionStage = 'transaction';
    if (this.selectedClient) this.transactionState.selectMember(this.memberContext(this.selectedClient));
  }

  verifyPendingTransaction(): void {
    const form = this.pendingTransaction;
    const reference = form?.serverReference;
    this.logTransactionEvent('recovery.verification-started', {
      action: form?.action,
      referencePresent: Boolean(reference),
      submitting: this.submitting
    });
    if (this.submitting) {
      this.logTransactionEvent(
        'recovery.verification-skipped',
        {
          reason: 'submission-in-progress',
          retryAllowed: false
        },
        'warning'
      );
      return;
    }
    if (!form) {
      this.transactionState.reset();
      this.transactionStage = 'transaction';
      this.logTransactionEvent(
        'recovery.verification-skipped',
        { reason: 'draft-missing', retryAllowed: false },
        'warning'
      );
      this.showMessage('The saved transaction details are unavailable. Enter the transaction again.', 'error');
      return;
    }
    if (!reference) {
      this.transactionState.allowRetry();
      this.logTransactionEvent(
        'recovery.retry-allowed',
        { reason: 'server-reference-missing', retryAllowed: true },
        'warning'
      );
      this.showMessage('No posting request was started. You can safely select Confirm and post again.', 'success');
      return;
    }

    this.submitting = true;
    this.tellerApi
      .getTransaction(reference)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.logTransactionEvent('recovery.verification-finished', { reference });
        })
      )
      .subscribe({
        next: (transaction) => {
          this.logTransactionEvent('recovery.verification-response', {
            reference,
            status: transaction.status
          });
          if (transaction.status === 'POSTED') {
            this.receipt = {
              reference,
              member: form.member,
              action: form.action,
              amount:
                form.action === 'shares'
                  ? `${form.requestedShares} share(s)`
                  : form.action === 'loanDisbursement'
                    ? Number(form.netDisbursementAmount || form.amount)
                    : Number(form.amount),
              grossAmount: form.action === 'loanDisbursement' ? Number(form.amount) : undefined,
              date: transaction.checkedAt,
              currencyCode: transaction.currencyCode,
              notificationStatus: transaction.notificationStatus
            };
            this.pendingTransaction = null;
            this.transactionStage = 'result';
            this.transactionState.complete(this.receipt);
            this.showMessage('The transaction was already recorded successfully.', 'success');
            this.refreshDrawerSummary();
            return;
          }

          this.transactionState.allowRetry();
          this.logTransactionEvent('recovery.retry-allowed', { reference, status: transaction.status });
          this.showMessage('No posted transaction was found. You may submit it again.', 'success');
        },
        error: (error: unknown) => {
          const mappedError = this.tellerApi.mapError(error);
          this.logTransactionEvent(
            'recovery.verification-failed',
            {
              reference,
              httpStatus: mappedError.status,
              errorCode: mappedError.code,
              retryable: mappedError.retryable
            },
            'error'
          );
          if (mappedError.status === 404) {
            this.transactionState.allowRetry();
            this.showMessage('No posted transaction was found. You may submit it again.', 'success');
          } else {
            this.showMessage(mappedError.message, 'error');
          }
        }
      });
  }

  confirmTransaction(): void {
    if (!this.pendingTransaction || this.submitting || this.transactionNeedsRecovery) {
      this.logTransactionEvent(
        'post.blocked',
        {
          reason: !this.pendingTransaction
            ? 'draft-missing'
            : this.submitting
              ? 'submission-in-progress'
              : 'recovery-required'
        },
        'warning'
      );
      return;
    }
    this.submitting = true;
    this.transactionState?.beginSubmission();
    const form = this.pendingTransaction;
    const action: TellerTransactionAction = form.action;
    this.logTransactionEvent('post.started', {
      action,
      stage: this.transactionStage,
      currencyCode: form.currencyCode,
      serverReferencePresent: Boolean(form.serverReference),
      drawerReady: this.drawerReady
    });
    const dateFormat = this.settingsService.dateFormat;
    const locale = this.settingsService.language.code;
    const transactionDate = this.dates.formatDate(this.settingsService.businessDate, dateFormat);
    let request$;

    if (action === 'deposit' || action === 'withdrawal') {
      request$ = this.savingsService.getSavingsTransactionTemplateResource(String(form.savingsAccountId)).pipe(
        switchMap((template: any) => {
          const paymentTypeOptions = template?.paymentTypeOptions || [];
          const paymentType = paymentTypeOptions.find((item: any) => {
            const description = [
              item.name,
              item.value,
              item.description,
              item.codeName
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return item.isCashPayment || description.includes('cash');
          });
          this.logTransactionEvent('payment-options.loaded', {
            action,
            optionCount: paymentTypeOptions.length,
            cashPaymentTypeFound: Boolean(paymentType),
            options: paymentTypeOptions.map((item: any) => ({
              id: item.id,
              name: item.name || item.value || item.description || item.codeName || 'Unnamed payment type',
              isCashPayment: item.isCashPayment === true
            }))
          });
          if (!paymentType) throw new Error('No cash payment type is configured for teller savings transactions.');
          return this.preflightTransaction(
            form,
            action === 'deposit' ? 'SAVINGS_DEPOSIT' : 'SAVINGS_WITHDRAWAL',
            paymentType.id
          ).pipe(
            switchMap((preflight: TellerPreflightResponse) =>
              this.savingsService.executeSavingsAccountTransactionsCommand(String(form.savingsAccountId), action, {
                transactionDate,
                transactionAmount: Number(form.amount),
                paymentTypeId: paymentType.id,
                externalId: preflight.reference,
                note: form.note,
                dateFormat,
                locale
              })
            )
          );
        })
      );
    } else if (action === 'loanRepayment') {
      request$ = this.loansService.getLoanActionTemplate(String(form.loanAccountId), 'repayment').pipe(
        switchMap((template: any) => {
          const paymentType = (template?.paymentTypeOptions || []).find(
            (item: any) => item.isCashPayment || `${item.name || item.value || ''}`.toLowerCase().includes('cash')
          );
          if (!paymentType) throw new Error('No cash payment type is configured for teller loan repayments.');
          return this.preflightTransaction(form, 'LOAN_REPAYMENT', paymentType.id).pipe(
            switchMap((preflight: TellerPreflightResponse) =>
              this.loansService.executeLoansAccountTransactionsCommand(String(form.loanAccountId), 'repayment', {
                transactionDate,
                transactionAmount: Number(form.amount),
                paymentTypeId: paymentType.id,
                externalId: preflight.reference,
                note: form.note,
                dateFormat,
                locale
              })
            )
          );
        })
      );
    } else if (action === 'loanDisbursement') {
      const disbursementMode = form.disbursementMode || 'CASH';
      const command = disbursementMode === 'DIRECT_TO_SAVINGS' ? 'disbursetosavings' : 'disburse';
      request$ = this.loansService.getLoanActionTemplate(String(form.loanAccountId), command).pipe(
        switchMap((template: any) => {
          const payload = {
            actualDisbursementDate: transactionDate,
            transactionAmount: Number(form.amount),
            note: form.note,
            dateFormat,
            locale
          };

          if (disbursementMode === 'DIRECT_TO_SAVINGS') {
            return this.loansService.loanActionButtons(String(form.loanAccountId), command, {
              ...payload,
              externalId: form.idempotencyKey
            });
          }

          const paymentType = (template?.paymentTypeOptions || []).find((item: any) => {
            const name = `${item.name || item.value || ''}`.toLowerCase();
            return disbursementMode === 'CASH' ? item.isCashPayment || name.includes('cash') : name.includes('che');
          });
          if (!paymentType) {
            throw new Error(
              disbursementMode === 'CASH'
                ? 'No cash payment type is configured for loan disbursement.'
                : 'No cheque payment type is configured for loan disbursement.'
            );
          }

          return this.preflightTransaction(form, 'LOAN_DISBURSEMENT', paymentType.id).pipe(
            switchMap((preflight: TellerPreflightResponse) =>
              this.loansService.loanActionButtons(String(form.loanAccountId), command, {
                ...payload,
                paymentTypeId: paymentType.id,
                externalId: preflight.reference,
                checkNumber: form.chequeNumber,
                bankNumber: form.bankName
              })
            )
          );
        })
      );
    } else if (action === 'shares') {
      request$ = this.sharesService.getSharesAccountData(String(form.shareAccountId), true).pipe(
        switchMap((shareAccount: any) =>
          this.organizationService.getPaymentTypes().pipe(map((paymentTypes: any) => ({ shareAccount, paymentTypes })))
        ),
        switchMap(({ shareAccount, paymentTypes }: any) => {
          const expectedAmount = Number(shareAccount.currentMarketPrice || 0) * Number(form.requestedShares);
          if (!expectedAmount || expectedAmount !== Number(form.amount)) {
            throw new Error('The cash amount does not match the current share price and requested quantity.');
          }
          const paymentType = (paymentTypes?.pageItems || paymentTypes || []).find(
            (item: any) => item.isCashPayment || `${item.name || item.value || ''}`.toLowerCase().includes('cash')
          );
          if (!paymentType) throw new Error('No cash payment type is configured for teller share purchases.');
          return this.preflightTransaction(form, 'SHARE_PURCHASE', paymentType.id).pipe(
            switchMap((preflight: TellerPreflightResponse) =>
              this.tellerApi.purchaseShares({
                reference: preflight.reference,
                accountId: Number(form.shareAccountId),
                cashierId: Number(this.cashierId),
                requestedShares: Number(form.requestedShares),
                amount: Number(form.amount),
                currencyCode: form.currencyCode
              })
            )
          );
        })
      );
    } else {
      request$ = this.organizationService.getPaymentTypes().pipe(
        switchMap((paymentTypes: any) => {
          const paymentType = (paymentTypes?.pageItems || paymentTypes || []).find(
            (item: any) => item.isCashPayment || `${item.name || item.value || ''}`.toLowerCase().includes('cash')
          );
          if (!paymentType) throw new Error('No cash payment type is configured for teller fee payments.');
          return this.preflightTransaction(form, 'CLIENT_CHARGE', paymentType.id).pipe(
            switchMap((preflight: TellerPreflightResponse) =>
              this.tellerApi.payFee({
                reference: preflight.reference,
                clientId: Number(form.clientId),
                chargeId: Number(form.chargeId),
                cashierId: Number(this.cashierId),
                paymentTypeId: Number(paymentType.id),
                amount: Number(form.amount),
                currencyCode: form.currencyCode,
                locale
              })
            )
          );
        })
      );
    }

    request$
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.logTransactionEvent('post.finished', { action });
        })
      )
      .subscribe({
        next: (response: any) => {
          const reference = form.serverReference || extractTellerTransactionReference(response);
          this.logTransactionEvent('post.response-received', {
            action,
            referencePresent: Boolean(reference),
            status: response?.status || response?.transaction?.status
          });
          if (!reference) {
            this.transactionState?.requireRecovery();
            this.logTransactionEvent(
              'post.recovery-required',
              { action, reason: 'server-reference-missing' },
              'warning'
            );
            this.showMessage(
              'The server did not return a transaction reference. Verify the transaction before retrying.',
              'error'
            );
            return;
          }
          this.receipt = {
            reference,
            member: form.member,
            action,
            amount:
              action === 'shares'
                ? `${form.requestedShares} share(s)`
                : action === 'loanDisbursement'
                  ? Number(form.netDisbursementAmount || form.amount)
                  : Number(form.amount),
            grossAmount: action === 'loanDisbursement' ? Number(form.amount) : undefined,
            date: transactionDate,
            currencyCode: resolveTellerCurrencyCode([
              response,
              form
            ]),
            clientId: Number(form.clientId),
            loanAccountId: action === 'loanDisbursement' ? Number(form.loanAccountId) : undefined,
            status: response?.status || response?.transaction?.status || 'POSTED'
          };
          this.pendingTransaction = null;
          this.transactionStage = 'result';
          this.transactionState?.complete(this.receipt);
          const posted = this.receipt.status === 'POSTED' || this.receipt.status === 'COMPLETED';
          this.logTransactionEvent('post.completed', {
            action,
            reference,
            status: this.receipt.status,
            posted
          });
          this.showMessage(
            posted
              ? 'The transaction was recorded successfully.'
              : 'The request was recorded and is awaiting approval.',
            'success'
          );
          if (posted) this.refreshReceiptNotification(reference);
          if (action === 'loanRepayment' && response?.subResourceId) {
            this.refreshLoanRepaymentAllocation(String(form.loanAccountId), String(response.subResourceId), reference);
          }
          this.selectClient(this.selectedClient, true);
          this.refreshDrawerSummary();
        },
        error: (error: unknown) => {
          const mappedError = this.tellerApi?.mapError(error);
          this.logTransactionEvent(
            'post.failed',
            {
              action,
              reference: form.serverReference,
              httpStatus: mappedError?.status,
              errorCode: mappedError?.code,
              retryable: mappedError?.retryable
            },
            'error'
          );
          if (mappedError?.retryable) this.transactionState?.requireRecovery();
          else this.transactionState?.allowRetry();
          this.showMessage(
            mappedError?.message ||
              'The transaction was not recorded. No second attempt was made; please check the details and try again.',
            'error'
          );
        }
      });
  }

  printReceipt(record?: TellerDrawerTransaction): void {
    if (record) {
      const date = record.txnDate || record.transactionDate;
      this.receipt = {
        reference: String(record.transactionId ?? record.id ?? 'Recorded'),
        member: record.clientName || record.entityName || '',
        action: record.entityType || this.drawerTransactionType(record.transactionType),
        amount: record.amount ?? record.txnAmount ?? 0,
        currencyCode: resolveTellerCurrencyCode([
          record,
          this.drawer
        ]),
        date: Array.isArray(date)
          ? this.dates.formatDate(new Date(date[0], date[1] - 1, date[2]), this.settingsService.dateFormat)
          : date
      };
    }
    if (!this.receipt) return;
    this.changeDetectorRef.detectChanges();
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
        const tellerList = (tellers?.pageItems || tellers || []).filter(
          (teller: any) =>
            Number(teller.officeId) === Number(this.credentials.officeId) &&
            (Number(teller.status?.id ?? teller.status) === 300 || teller.status === 'ACTIVE') &&
            this.assignmentIsCurrent(teller)
        );
        if (!tellerList.length) {
          this.showMessage('No teller drawer has been configured for your office.', 'error');
          return;
        }
        forkJoin(
          tellerList.map((teller: any) =>
            this.organizationService.getCashiers(teller.id).pipe(
              catchError(() => of([])),
              switchMap((cashiers: any) =>
                of({
                  teller,
                  cashiers: cashiers?.cashiers || cashiers?.pageItems || (Array.isArray(cashiers) ? cashiers : [])
                })
              )
            )
          )
        ).subscribe((results: any[]) => {
          const match = results
            .flatMap((result: any) => result.cashiers.map((cashier: any) => ({ teller: result.teller, cashier })))
            .find(
              (item: any) =>
                Number(item.cashier.staffId) === Number(this.credentials.staffId) &&
                this.assignmentIsCurrent(item.cashier)
            );
          if (!match) {
            this.showMessage(
              'You are not assigned to an active cashier drawer. Ask the Chief Teller to assign you.',
              'error'
            );
            return;
          }
          this.tellerId = match.teller.id;
          this.cashierId = match.cashier.id;
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

  private refreshReceiptNotification(reference: string): void {
    this.tellerApi.getTransaction(reference).subscribe({
      next: (transaction) => {
        if (this.receipt?.reference === reference) {
          this.receipt = {
            ...this.receipt,
            amount:
              this.receipt.action === 'loanDisbursement' && transaction.drawerMovement?.amount !== undefined
                ? transaction.drawerMovement.amount
                : this.receipt.amount,
            notificationStatus: transaction.notificationStatus
          };
          this.transactionState.complete(this.receipt);
          this.changeDetectorRef.markForCheck();
        }
      },
      error: () => undefined
    });
  }

  private refreshLoanRepaymentAllocation(loanId: string, transactionId: string, reference: string): void {
    this.loansService.getLoansAccountTransaction('loans', loanId, transactionId).subscribe({
      next: (transaction: any) => {
        if (this.receipt?.reference === reference) {
          this.receipt = {
            ...this.receipt,
            loanAllocation: {
              principal: Number(transaction.principalPortion || 0),
              interest: Number(transaction.interestPortion || 0),
              fees: Number(transaction.feeChargesPortion || 0),
              penalties: Number(transaction.penaltyChargesPortion || 0),
              remainingBalance:
                transaction.outstandingLoanBalance === undefined
                  ? undefined
                  : Number(transaction.outstandingLoanBalance)
            }
          };
          this.transactionState.complete(this.receipt);
          this.changeDetectorRef.markForCheck();
        }
      },
      error: () => undefined
    });
  }

  private refreshDrawerSummary(): void {
    this.drawerReady = false;
    this.drawer = null;
    if (!this.tellerId || !this.cashierId) return;
    this.organizationService
      .getCashierSummaryAndTransactions(this.tellerId, this.cashierId, this.currencyCode)
      .subscribe({
        next: (response: TellerDrawerSummary) => {
          this.drawer = response;
          this.drawerReady = true;
          this.loadActiveShift();
          this.loadAwaitingCashReceipt();
        },
        error: () => this.showMessage('Your drawer summary could not be refreshed.', 'error')
      });
  }

  private loadActiveShift(): void {
    if (!this.cashierId) return;
    this.tellerApi.getActiveShift(Number(this.cashierId), this.currencyCode).subscribe({
      next: (shift) => (this.shift = shift),
      error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
    });
  }

  private loadAwaitingCashReceipt(): void {
    if (!this.cashierId) return;
    this.tellerApi.getCashMovements('COMPLETED', true).subscribe({
      next: (movements) => {
        this.awaitingCashReceipt =
          movements.find((movement) => Number(movement.cashierId) === Number(this.cashierId)) || null;
      },
      error: () => (this.awaitingCashReceipt = null)
    });
  }

  private updateShift(
    action: 'STOP' | 'COUNT' | 'SUBMIT' | 'CLOSE',
    data: { denominations?: { denomination: number; quantity: number }[]; explanation?: string } = {}
  ): void {
    if (!this.shift?.reference || this.submitting) return;
    this.submitting = true;
    this.tellerApi
      .updateShift(this.shift.reference, action, data)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (shift) => {
          this.shift = shift;
          this.showMessage('The reconciliation status was updated.', 'success');
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  private createDenominationLine() {
    return this.formBuilder.group({
      denomination: [
        null as number | null,
        [
          Validators.required,
          Validators.min(1)
        ]
      ],
      quantity: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ]
    });
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    this.message = message;
    this.messageType = type;
    if (this.activeView === 'transactions') {
      this.logTransactionEvent(
        `message.${type}`,
        { stage: this.transactionStage, message },
        type === 'error' ? 'warning' : 'info'
      );
    }
  }

  private logTransactionEvent(
    event: string,
    details: Record<string, unknown> = {},
    level: 'info' | 'warning' | 'error' = 'info'
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      ...details
    };
    const output = `[CashierTransaction] ${JSON.stringify(entry)}`;

    if (level === 'error') {
      console.error(output);
      return;
    }
    if (level === 'warning') {
      console.warn(output);
      return;
    }
    console.info(output);
  }

  private assignmentIsCurrent(assignment: any): boolean {
    const day = (value: any): number => {
      const date = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2]) : new Date(value);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    };
    const today = day(this.settingsService.businessDate);
    return (
      !!assignment.startDate &&
      day(assignment.startDate) <= today &&
      (!assignment.endDate || day(assignment.endDate) >= today)
    );
  }

  private memberContext(client: any): CashierMemberContext {
    return {
      id: Number(client.id),
      displayName: client.displayName,
      accountNo: client.accountNo,
      officeName: client.officeName
    };
  }

  private preflightTransaction(
    form: CashierTransactionDraft,
    operationType: TellerOperationType,
    paymentTypeId?: number
  ) {
    this.logTransactionEvent('preflight.started', {
      action: form.action,
      operationType,
      currencyCode: form.currencyCode,
      paymentTypeConfigured: paymentTypeId !== undefined
    });
    return this.tellerApi
      .preflight({
        idempotencyKey: form.idempotencyKey,
        operationType,
        accountId: Number(form.accountId),
        clientId: form.clientId,
        amount: Number(form.amount),
        currencyCode: form.currencyCode,
        paymentTypeId
      })
      .pipe(
        map((response: TellerPreflightResponse) => {
          const allowed = this.tellerApi.requireAllowed(response);
          form.serverReference = allowed.reference;
          this.transactionState.setServerReference(allowed.reference);
          this.logTransactionEvent('preflight.allowed', {
            action: form.action,
            operationType,
            reference: allowed.reference,
            decision: allowed.decision
          });
          return allowed;
        })
      );
  }

  private restoreTransactionState(): void {
    const state = this.transactionState.snapshot;
    if (!state.member || state.stage === 'member') return;
    this.transactionStage = state.stage;
    this.selectedAction = state.draft?.action || 'deposit';
    this.receipt = state.result || null;
    this.selectClient(state.member, state.stage === 'result', state);
  }

  private applyRestoredState(state: CashierTransactionState): void {
    if (state.draft) {
      this.transactionForm.patchValue({
        savingsAccountId: state.draft.savingsAccountId ? String(state.draft.savingsAccountId) : '',
        shareAccountId: state.draft.shareAccountId ? String(state.draft.shareAccountId) : '',
        loanAccountId: state.draft.loanAccountId ? String(state.draft.loanAccountId) : '',
        chargeId: state.draft.chargeId ? String(state.draft.chargeId) : '',
        amount: state.draft.amount,
        requestedShares: state.draft.requestedShares,
        note: state.draft.note || '',
        identityMethod: state.draft.identityMethod,
        slipReference: state.draft.slipReference || '',
        slipVerified: state.draft.slipVerified,
        amountVerified: state.draft.amountVerified,
        countedAmount: state.draft.countedAmount,
        cashAuthenticityVerified: state.draft.cashAuthenticityVerified,
        signatureVerified: state.draft.signatureVerified,
        disbursementMode: state.draft.disbursementMode || 'CASH',
        chequeNumber: state.draft.chequeNumber || '',
        bankName: state.draft.bankName || '',
        loanApprovalVerified: state.draft.loanApprovalVerified,
        collateralSecured: state.draft.collateralSecured,
        loanDocumentsVerified: state.draft.loanDocumentsVerified
      });
    }
    this.transactionStage = state.stage;
    this.pendingTransaction = state.stage === 'review' ? state.draft || null : null;
    this.receipt = state.stage === 'result' ? state.result || null : null;
  }

  private drawerTransactionType(transactionType: TellerDrawerTransaction['transactionType']): string {
    return typeof transactionType === 'string' ? transactionType : transactionType?.value || 'Drawer transaction';
  }
}
