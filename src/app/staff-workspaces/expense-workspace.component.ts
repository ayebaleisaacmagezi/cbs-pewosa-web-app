/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, finalize, forkJoin, of } from 'rxjs';

import { AccountingService } from 'app/accounting/accounting.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { CreatePewosaExpenseRequest, PewosaExpense, PewosaExpenseApproval, TellerApiError } from './teller-api.models';
import { TellerApiService } from './teller-api.service';

interface GlAccountOption {
  id: number;
  name: string;
  glCode: string;
  type?: { id?: number; value?: string };
}

interface PaymentTypeOption {
  id: number;
  name: string;
  description?: string;
  isCashPayment?: boolean;
}

@Component({
  selector: 'mifosx-expense-workspace',
  standalone: true,
  imports: [...STANDALONE_SHARED_IMPORTS],
  templateUrl: './expense-workspace.component.html',
  styleUrls: ['./expense-workspace.component.scss']
})
export class ExpenseWorkspaceComponent implements OnInit {
  private readonly tellerApi = inject(TellerApiService);
  private readonly accountingService = inject(AccountingService);
  private readonly authenticationService = inject(AuthenticationService);

  @Input() paymentOnly = false;
  @Input() initialSection: 'request' | 'requests' | 'approvals' | 'payments' = 'request';

  activeSection: 'request' | 'requests' | 'approvals' | 'payments' = 'request';
  expenses: PewosaExpense[] = [];
  approvals: PewosaExpenseApproval[] = [];
  glAccounts: GlAccountOption[] = [];
  paymentTypes: PaymentTypeOption[] = [];
  selectedExpense: PewosaExpense | null = null;
  loading = false;
  submitting = false;
  message = '';
  messageType: 'success' | 'error' | '' = '';

  readonly expenseForm: FormGroup;
  readonly approvalForm: FormGroup;
  readonly paymentForm: FormGroup;

  // FormBuilder constructor injection is required by the repository UI skill.
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private readonly formBuilder: FormBuilder) {
    this.expenseForm = this.formBuilder.group({
      department: [
        '',
        [
          Validators.required,
          Validators.maxLength(100)
        ]
      ],
      description: [
        '',
        [
          Validators.required,
          Validators.maxLength(500)
        ]
      ],
      vendorName: [
        '',
        [
          Validators.required,
          Validators.maxLength(200)
        ]
      ],
      invoiceNumber: [
        '',
        Validators.maxLength(100)
      ],
      budgetLine: [
        '',
        [
          Validators.required,
          Validators.maxLength(100)
        ]
      ],
      currencyCode: [
        'UGX',
        [
          Validators.required,
          Validators.maxLength(3)
        ]
      ],
      expenseGlAccountId: [
        null as number | null,
        Validators.required
      ],
      vatGlAccountId: [null as number | null],
      withholdingGlAccountId: [null as number | null],
      paymentGlAccountId: [
        null as number | null,
        Validators.required
      ],
      netAmount: [
        null as number | null,
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ],
      vatAmount: [
        0,
        Validators.min(0)
      ],
      withholdingAmount: [
        0,
        Validators.min(0)
      ],
      supportingDocumentsConfirmed: [
        false,
        Validators.requiredTrue
      ],
      budgetConfirmed: [
        false,
        Validators.requiredTrue
      ]
    });
    this.approvalForm = this.formBuilder.group({ note: [
        '',
        Validators.maxLength(500)
      ] });
    this.paymentForm = this.formBuilder.group({
      paymentTypeId: [
        null as number | null,
        Validators.required
      ],
      countedAmount: [
        null as number | null,
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ],
      payeeAcknowledged: [
        false,
        Validators.requiredTrue
      ]
    });
  }

  ngOnInit(): void {
    if (this.paymentOnly) {
      this.activeSection = 'payments';
    } else if (this.initialSection !== 'request') {
      this.activeSection = this.initialSection;
    } else if (!this.canCreate) {
      this.activeSection = 'requests';
    } else {
      this.activeSection = this.initialSection;
    }
    this.loadReferenceData();
    this.refresh();
  }

  get canCreate(): boolean {
    return this.hasPermission('CREATE_PEWOSAEXPENSE');
  }

  get canApprove(): boolean {
    return this.hasPermission('APPROVE_PEWOSAEXPENSE');
  }

  get canPay(): boolean {
    return this.hasPermission('PAY_PEWOSAEXPENSE');
  }

  get payableAmount(): number {
    const value = this.expenseForm.getRawValue();
    return Number(value.netAmount || 0) + Number(value.vatAmount || 0) - Number(value.withholdingAmount || 0);
  }

  get expenseAccounts(): GlAccountOption[] {
    return this.glAccounts.filter((account) => account.type?.id === 5);
  }

  get assetAccounts(): GlAccountOption[] {
    return this.glAccounts.filter((account) => account.type?.id === 1);
  }

  get liabilityAccounts(): GlAccountOption[] {
    return this.glAccounts.filter((account) => account.type?.id === 2);
  }

  setSection(section: 'request' | 'requests' | 'approvals' | 'payments'): void {
    this.activeSection = section;
    this.clearMessage();
  }

  createExpense(): void {
    if (this.expenseForm.invalid || this.payableAmount <= 0) {
      this.expenseForm.markAllAsTouched();
      this.showError('Please complete the required expense fields and confirm the controls.');
      return;
    }
    const raw = this.expenseForm.getRawValue();
    const request: CreatePewosaExpenseRequest = {
      department: raw.department!,
      description: raw.description!,
      vendorName: raw.vendorName!,
      invoiceNumber: raw.invoiceNumber || undefined,
      budgetLine: raw.budgetLine!,
      currencyCode: raw.currencyCode!.toUpperCase(),
      expenseGlAccountId: Number(raw.expenseGlAccountId),
      vatGlAccountId: raw.vatGlAccountId ? Number(raw.vatGlAccountId) : undefined,
      withholdingGlAccountId: raw.withholdingGlAccountId ? Number(raw.withholdingGlAccountId) : undefined,
      paymentGlAccountId: Number(raw.paymentGlAccountId),
      netAmount: Number(raw.netAmount),
      vatAmount: Number(raw.vatAmount || 0),
      withholdingAmount: Number(raw.withholdingAmount || 0),
      supportingDocumentsConfirmed: Boolean(raw.supportingDocumentsConfirmed),
      budgetConfirmed: Boolean(raw.budgetConfirmed)
    };
    this.submitting = true;
    this.tellerApi
      .createExpense(request)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (expense) => {
          this.expenseForm.reset({ currencyCode: 'UGX', vatAmount: 0, withholdingAmount: 0 });
          this.showSuccess(`Expense ${expense.reference} was saved as a draft.`);
          this.activeSection = 'requests';
          this.refresh();
        },
        error: (error: TellerApiError) => this.showError(error.message)
      });
  }

  submitExpense(expense: PewosaExpense): void {
    this.runAction(this.tellerApi.submitExpense(expense.reference), `Expense ${expense.reference} was submitted.`);
  }

  decide(approval: PewosaExpenseApproval, decision: 'APPROVE' | 'REJECT'): void {
    const note = this.approvalForm.controls['note'].value || undefined;
    this.runAction(
      this.tellerApi.decideExpenseApproval(approval.id, decision, note),
      `Expense ${approval.expenseReference || ''} was ${decision.toLowerCase()}d.`
    );
  }

  selectForPayment(expense: PewosaExpense): void {
    this.selectedExpense = expense;
    this.paymentForm.reset({ countedAmount: expense.payableAmount, payeeAcknowledged: false });
    this.clearMessage();
  }

  payExpense(): void {
    if (!this.selectedExpense || this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.showError('Select an authorized expense and complete the cash controls.');
      return;
    }
    const expense = this.selectedExpense;
    const raw = this.paymentForm.getRawValue();
    const paymentTypeId = Number(raw.paymentTypeId);
    this.submitting = true;
    this.tellerApi
      .preflight({
        idempotencyKey: this.idempotencyKey(),
        operationType: 'EXPENSE_PAYMENT',
        accountId: expense.id,
        amount: expense.payableAmount,
        currencyCode: expense.currencyCode,
        paymentTypeId
      })
      .subscribe({
        next: (preflight) => {
          if (preflight.decision !== 'ALLOWED' || !preflight.cashierId) {
            this.submitting = false;
            this.showError(preflight.violations[0]?.message || 'Expense payment was not allowed.');
            return;
          }
          this.tellerApi
            .payExpense(expense.reference, {
              cashierId: preflight.cashierId,
              paymentTypeId,
              tellerReference: preflight.reference,
              countedAmount: Number(raw.countedAmount),
              payeeAcknowledged: Boolean(raw.payeeAcknowledged)
            })
            .pipe(finalize(() => (this.submitting = false)))
            .subscribe({
              next: () => {
                this.selectedExpense = null;
                this.showSuccess(`Expense ${expense.reference} was paid and posted.`);
                this.refresh();
              },
              error: (error: TellerApiError) => this.showError(error.message)
            });
        },
        error: (error: TellerApiError) => {
          this.submitting = false;
          this.showError(error.message);
        }
      });
  }

  refresh(): void {
    this.loading = true;
    const requests = this.paymentOnly
      ? this.tellerApi.getExpenses({ status: 'AUTHORIZED' })
      : this.tellerApi.getExpenses({});
    const approvals =
      !this.paymentOnly && this.canApprove ? this.tellerApi.getExpenseApprovals() : of<PewosaExpenseApproval[]>([]);
    forkJoin({ expenses: requests, approvals })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.expenses = result.expenses;
          this.approvals = result.approvals;
        },
        error: (error: TellerApiError) => this.showError(error.message)
      });
  }

  private loadReferenceData(): void {
    if (this.paymentOnly) {
      this.accountingService.getPaymentTypes().subscribe({
        next: (paymentTypes) => this.setPaymentTypes(paymentTypes),
        error: () => this.showError('Cash payment types could not be loaded.')
      });
      return;
    }
    forkJoin({
      glAccounts: this.accountingService.getGlAccounts(),
      paymentTypes: this.accountingService.getPaymentTypes()
    }).subscribe({
      next: ({ glAccounts, paymentTypes }) => {
        this.glAccounts = glAccounts || [];
        this.setPaymentTypes(paymentTypes);
      },
      error: () => this.showError('GL accounts and payment types could not be loaded.')
    });
  }

  private setPaymentTypes(paymentTypes: PaymentTypeOption[]): void {
    this.paymentTypes = (paymentTypes || []).filter((type: PaymentTypeOption) => {
      const label = `${type.name || ''} ${type.description || ''}`.toLowerCase();
      return type.isCashPayment || label.includes('cash');
    });
  }

  private runAction(request: Observable<unknown>, successMessage: string): void {
    this.submitting = true;
    request.pipe(finalize(() => (this.submitting = false))).subscribe({
      next: () => {
        this.approvalForm.reset();
        this.showSuccess(successMessage);
        this.refresh();
      },
      error: (error: TellerApiError) => this.showError(error.message)
    });
  }

  private hasPermission(permission: string): boolean {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    return permissions.includes('ALL_FUNCTIONS') || permissions.includes(permission);
  }

  private idempotencyKey(): string {
    return globalThis.crypto?.randomUUID?.() || `expense-${Date.now()}`;
  }

  private showSuccess(message: string): void {
    this.message = message;
    this.messageType = 'success';
  }

  private showError(message: string): void {
    this.message = message;
    this.messageType = 'error';
  }

  private clearMessage(): void {
    this.message = '';
    this.messageType = '';
  }
}
