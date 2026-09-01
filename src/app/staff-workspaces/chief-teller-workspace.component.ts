/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Dates } from 'app/core/utils/dates';
import { OrganizationService } from 'app/organization/organization.service';
import { SettingsService } from 'app/settings/settings.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

type DrawerAction = 'allocate' | 'settle';

@Component({
  selector: 'mifosx-chief-teller-workspace',
  standalone: true,
  imports: [...STANDALONE_SHARED_IMPORTS],
  templateUrl: './chief-teller-workspace.component.html',
  styleUrls: ['./staff-workspace.scss']
})
export class ChiefTellerWorkspaceComponent implements OnInit {
  private authenticationService = inject(AuthenticationService);
  private organizationService = inject(OrganizationService);
  private settingsService = inject(SettingsService);
  private dates = inject(Dates);
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  credentials = this.authenticationService.getCredentials();
  activeView: 'drawers' | 'movement' | 'records' = 'drawers';
  tellers: any[] = [];
  cashiers: any[] = [];
  selectedTeller: any = null;
  selectedCashier: any = null;
  cashierSummary: any = null;
  selectedAction: DrawerAction = 'allocate';
  pendingMovement: any = null;
  submitting = false;
  loading = false;
  message = '';
  messageType: 'error' | 'success' | '' = '';
  lastReference: any = null;

  movementForm = this.formBuilder.group({
    txnAmount: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    txnNote: [
      '',
      Validators.required
    ]
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const view = params.get('view');
      if (view === 'drawers' || view === 'movement' || view === 'records') this.setView(view);
    });
    this.loadTellers();
  }

  setView(view: 'drawers' | 'movement' | 'records'): void {
    this.activeView = view;
  }

  loadTellers(): void {
    this.loading = true;
    this.organizationService
      .getTellers()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          this.tellers = response?.pageItems || response || [];
          const officeTellers = this.tellers.filter(
            (teller: any) =>
              !this.credentials?.officeId || Number(teller.officeId) === Number(this.credentials.officeId)
          );
          this.tellers = officeTellers.length ? officeTellers : this.tellers;
          if (this.tellers.length) this.selectTeller(this.tellers[0]);
          else this.showMessage('No teller has been configured for this office.', 'error');
        },
        error: () =>
          this.showMessage(
            'Teller drawers could not be loaded. Ask an administrator to check the Chief Teller permissions.',
            'error'
          )
      });
  }

  selectTeller(teller: any): void {
    this.selectedTeller = teller;
    this.selectedCashier = null;
    this.cashierSummary = null;
    this.loading = true;
    this.organizationService
      .getCashiers(teller.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          this.cashiers = response?.pageItems || response || [];
          if (this.cashiers.length) this.selectCashier(this.cashiers[0]);
        },
        error: () => this.showMessage('Cashiers assigned to this teller could not be loaded.', 'error')
      });
  }

  selectCashier(cashier: any): void {
    this.selectedCashier = cashier;
    this.pendingMovement = null;
    this.refreshSummary();
  }

  chooseMovement(action: DrawerAction): void {
    this.selectedAction = action;
    this.activeView = 'movement';
    this.pendingMovement = null;
    this.lastReference = null;
    this.movementForm.reset();
  }

  prepareMovement(): void {
    if (!this.selectedTeller || !this.selectedCashier) {
      this.showMessage('Select a cashier first.', 'error');
      return;
    }
    if (this.movementForm.invalid) {
      this.showMessage('Enter the amount and a clear reason.', 'error');
      return;
    }
    const amount = Number(this.movementForm.value.txnAmount || 0);
    if (this.selectedAction === 'settle' && amount > Number(this.cashierSummary?.netCash || 0)) {
      this.showMessage('The settlement cannot be greater than the cashier’s expected cash.', 'error');
      return;
    }
    this.pendingMovement = {
      action: this.selectedAction,
      amount,
      cashier: this.selectedCashier.staffName || this.selectedCashier.cashierName,
      note: this.movementForm.value.txnNote
    };
    this.message = '';
  }

  confirmMovement(): void {
    if (!this.pendingMovement || this.submitting) return;
    this.submitting = true;
    const dateFormat = this.settingsService.dateFormat;
    const payload = {
      txnDate: this.dates.formatDate(this.settingsService.businessDate, dateFormat),
      txnAmount: Number(this.movementForm.value.txnAmount),
      txnNote: this.movementForm.value.txnNote,
      currencyCode: 'UGX',
      dateFormat,
      locale: this.settingsService.language.code
    };
    const request$ =
      this.selectedAction === 'allocate'
        ? this.organizationService.allocateCash(this.selectedTeller.id, this.selectedCashier.id, payload)
        : this.organizationService.settleCash(this.selectedTeller.id, this.selectedCashier.id, payload);

    request$.pipe(finalize(() => (this.submitting = false))).subscribe({
      next: (response: any) => {
        this.lastReference = response?.resourceId || response?.changes?.transactionId || 'Recorded';
        this.pendingMovement = null;
        this.movementForm.reset();
        this.showMessage(
          this.selectedAction === 'allocate'
            ? 'Cash was allocated to the cashier.'
            : 'Cash was recovered from the cashier.',
          'success'
        );
        this.refreshSummary();
      },
      error: () =>
        this.showMessage('The drawer movement was not recorded. Review the amount and try again once.', 'error')
    });
  }

  cancelMovement(): void {
    this.pendingMovement = null;
  }

  refreshSummary(): void {
    if (!this.selectedTeller || !this.selectedCashier) return;
    this.organizationService
      .getCashierSummaryAndTransactions(this.selectedTeller.id, this.selectedCashier.id, 'UGX')
      .subscribe({
        next: (response: any) => (this.cashierSummary = response),
        error: () => this.showMessage('The selected cashier’s drawer summary could not be loaded.', 'error')
      });
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    this.message = message;
    this.messageType = type;
  }
}
