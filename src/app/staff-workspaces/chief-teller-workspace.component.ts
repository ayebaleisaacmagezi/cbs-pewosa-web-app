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
import { finalize, of, switchMap } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { ChiefTellerWorkspaceView, WorkspaceNavigationService } from 'app/core/shell/workspace-navigation.service';
import { Dates } from 'app/core/utils/dates';
import { OrganizationService } from 'app/organization/organization.service';
import { SettingsService } from 'app/settings/settings.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import {
  TellerApproval,
  TellerDrawerSummary,
  TellerReversal,
  TellerShift,
  extractTellerTransactionReference,
  resolveTellerCurrencyCode
} from './teller-api.models';
import { TellerApiService } from './teller-api.service';

type DrawerAction = 'allocate' | 'settle';

@Component({
  selector: 'mifosx-chief-teller-workspace',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon
  ],
  templateUrl: './chief-teller-workspace.component.html',
  styleUrls: [
    './staff-workspace.scss',
    './chief-teller-workspace.component.scss'
  ]
})
export class ChiefTellerWorkspaceComponent implements OnInit {
  private authenticationService = inject(AuthenticationService);
  private organizationService = inject(OrganizationService);
  private settingsService = inject(SettingsService);
  private dates = inject(Dates);
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private workspaceNavigation = inject(WorkspaceNavigationService);
  private tellerApi = inject(TellerApiService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  credentials = this.authenticationService.getCredentials();
  activeView: ChiefTellerWorkspaceView = 'drawers';
  tellers: any[] = [];
  cashiers: any[] = [];
  selectedTeller: any = null;
  selectedCashier: any = null;
  cashierSummary: TellerDrawerSummary | null = null;
  selectedAction: DrawerAction = 'allocate';
  pendingMovement: any = null;
  submitting = false;
  loading = false;
  message = '';
  messageType: 'error' | 'success' | '' = '';
  lastReference: string | null = null;
  approvals: TellerApproval[] = [];
  reversal: TellerReversal | null = null;
  selectedShift: TellerShift | null = null;
  shiftReports: Record<string, unknown> | null = null;
  approvalNoteControl = this.formBuilder.control('');
  reversalReferenceControl = this.formBuilder.control('', Validators.required);
  reversalDecisionNoteControl = this.formBuilder.control('');
  private cashiersRequestId = 0;
  private summaryRequestId = 0;

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
  tellerSearchControl = this.formBuilder.control('');
  cashierSearchControl = this.formBuilder.control('');

  get filteredTellers(): any[] {
    const query = (this.tellerSearchControl.value || '').trim().toLowerCase();
    if (!query) return this.tellers;
    return this.tellers.filter((teller: any) =>
      `${teller.name || ''} ${teller.officeName || ''}`.toLowerCase().includes(query)
    );
  }

  get filteredCashiers(): any[] {
    const query = (this.cashierSearchControl.value || '').trim().toLowerCase();
    if (!query) return this.cashiers;
    return this.cashiers.filter((cashier: any) =>
      `${cashier.staffName || ''} ${cashier.cashierName || ''}`.toLowerCase().includes(query)
    );
  }

  get currencyCode(): string {
    return resolveTellerCurrencyCode([
      this.cashierSummary,
      this.selectedCashier,
      this.selectedTeller
    ]);
  }

  currencyCodeFor(source: unknown): string {
    return resolveTellerCurrencyCode([
      source,
      this.cashierSummary,
      this.selectedCashier,
      this.selectedTeller
    ]);
  }

  ngOnInit(): void {
    this.movementForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pendingMovement = null;
    });
    this.route.queryParamMap.subscribe((params) => {
      const view = params.get('view');
      if (
        view === 'drawers' ||
        view === 'movement' ||
        view === 'approvals' ||
        view === 'reconciliation' ||
        view === 'records'
      ) {
        this.workspaceNavigation.setChiefTellerView(view);
      }
    });
    this.workspaceNavigation.chiefTellerView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
      this.setView(view);
      this.changeDetectorRef.markForCheck();
    });
    this.loadTellers();
  }

  setView(view: ChiefTellerWorkspaceView): void {
    this.workspaceNavigation.setChiefTellerView(view);
    this.activeView = view;
    if (view === 'approvals') this.loadApprovals();
    if (view === 'reconciliation') this.loadSelectedShift();
  }

  loadTellers(): void {
    this.loading = true;
    this.organizationService
      .getTellers()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (response: any) => {
          this.tellers = response?.pageItems || response || [];
          const officeTellers = this.tellers.filter(
            (teller: any) => this.credentials?.officeId && Number(teller.officeId) === Number(this.credentials.officeId)
          );
          this.tellers = officeTellers;
          if (this.tellers.length) this.selectTeller(this.tellers[0]);
          else this.showMessage('No teller has been configured for this office.', 'error');
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.showMessage(
            'Teller drawers could not be loaded. Ask an administrator to check the Chief Teller permissions.',
            'error'
          );
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  selectTeller(teller: any): void {
    if (this.submitting) return;
    const requestId = ++this.cashiersRequestId;
    this.summaryRequestId += 1;
    this.cashiers = [];
    this.pendingMovement = null;
    this.lastReference = null;
    this.selectedTeller = teller;
    this.selectedCashier = null;
    this.cashierSummary = null;
    this.selectedShift = null;
    this.shiftReports = null;
    this.cashierSearchControl.setValue('');
    this.loading = true;
    this.organizationService
      .getCashiers(teller.id)
      .pipe(
        finalize(() => {
          if (requestId === this.cashiersRequestId) this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (response: any) => {
          if (requestId !== this.cashiersRequestId) return;
          this.cashiers = Array.isArray(response) ? response : response?.cashiers || response?.pageItems || [];
          if (this.cashiers.length) this.selectCashier(this.cashiers[0]);
          else this.showMessage('No Cashier is assigned to the selected Teller.', 'error');
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          if (requestId === this.cashiersRequestId) {
            this.showMessage('Cashiers assigned to this teller could not be loaded.', 'error');
            this.changeDetectorRef.markForCheck();
          }
        }
      });
  }

  selectCashier(cashier: any): void {
    if (this.submitting) return;
    this.selectedCashier = cashier;
    this.cashierSummary = null;
    this.lastReference = null;
    this.pendingMovement = null;
    this.refreshSummary();
  }

  chooseMovement(action: DrawerAction): void {
    if (this.submitting) return;
    this.selectedAction = action;
    this.activeView = 'movement';
    this.pendingMovement = null;
    this.lastReference = null;
    this.movementForm.reset();
  }

  prepareMovement(): void {
    if (this.submitting) return;
    this.pendingMovement = null;
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
      tellerId: this.selectedTeller.id,
      cashierId: this.selectedCashier.id,
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
    const movement = this.pendingMovement;
    const dateFormat = this.settingsService.dateFormat;
    const payload = {
      txnDate: this.dates.formatDate(this.settingsService.businessDate, dateFormat),
      txnAmount: movement.amount,
      txnNote: movement.note,
      currencyCode: this.currencyCode,
      dateFormat,
      locale: this.settingsService.language.code
    };
    const request$ =
      movement.action === 'allocate'
        ? this.organizationService.allocateCash(movement.tellerId, movement.cashierId, payload)
        : this.organizationService.settleCash(movement.tellerId, movement.cashierId, payload);

    request$.pipe(finalize(() => (this.submitting = false))).subscribe({
      next: (response: any) => {
        const reference = extractTellerTransactionReference(response);
        if (!reference) {
          this.showMessage(
            'The server did not return a drawer-movement reference. Verify the movement before retrying.',
            'error'
          );
          return;
        }
        this.lastReference = reference;
        this.pendingMovement = null;
        this.movementForm.reset();
        this.showMessage(
          movement.action === 'allocate'
            ? 'Cash was allocated to the cashier.'
            : 'Cash was recovered from the cashier.',
          'success'
        );
        this.refreshSummary();
      },
      error: (error: unknown) =>
        this.showMessage(
          this.tellerApi?.mapError(error).message ||
            'The drawer movement was not recorded. Review the amount and try again once.',
          'error'
        )
    });
  }

  cancelMovement(): void {
    this.pendingMovement = null;
  }

  loadApprovals(): void {
    this.loading = true;
    this.tellerApi
      .getApprovals()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (approvals) => (this.approvals = approvals),
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  decideApproval(approval: TellerApproval, decision: 'APPROVE' | 'REJECT'): void {
    if (this.submitting) return;
    const note = this.approvalNoteControl.value?.trim() || undefined;
    if (decision === 'REJECT' && !note) {
      this.showMessage('Enter a reason before rejecting the request.', 'error');
      return;
    }
    this.submitting = true;
    this.tellerApi
      .decideApproval(approval.id, decision, note)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.approvalNoteControl.setValue('');
          this.showMessage(
            decision === 'APPROVE' ? 'The request was approved.' : 'The request was rejected.',
            'success'
          );
          this.loadApprovals();
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  findReversal(): void {
    const reference = this.reversalReferenceControl.value?.trim();
    if (!reference || this.submitting) return;
    this.submitting = true;
    this.tellerApi
      .getReversal(reference)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (reversal) => {
          this.reversal = reversal;
          this.changeDetectorRef.markForCheck();
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  decideReversal(decision: 'APPROVE' | 'REJECT'): void {
    if (!this.reversal || this.submitting) return;
    const note = this.reversalDecisionNoteControl.value?.trim() || undefined;
    if (decision === 'REJECT' && !note) {
      this.showMessage('Enter a reason before rejecting the reversal.', 'error');
      return;
    }

    this.submitting = true;
    const decisionRequest =
      this.reversal.status === 'APPROVED'
        ? this.tellerApi.updateReversal(this.reversal.reference, 'COMPLETE', { note })
        : this.tellerApi
            .updateReversal(this.reversal.reference, decision, { note })
            .pipe(
              switchMap((reversal) =>
                decision === 'APPROVE'
                  ? this.tellerApi.updateReversal(reversal.reference, 'COMPLETE', { note })
                  : of(reversal)
              )
            );
    decisionRequest.pipe(finalize(() => (this.submitting = false))).subscribe({
      next: (reversal) => {
        this.reversal = reversal;
        this.reversalDecisionNoteControl.setValue('');
        this.showMessage(
          decision === 'APPROVE' ? 'The reversal was approved and completed.' : 'The reversal was rejected.',
          'success'
        );
        this.refreshSummary();
      },
      error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
    });
  }

  loadSelectedShift(): void {
    if (!this.selectedCashier) {
      this.selectedShift = null;
      return;
    }
    this.loading = true;
    this.tellerApi
      .getActiveShift(Number(this.selectedCashier.id), this.currencyCode)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (shift) => {
          this.selectedShift = shift;
          if (shift?.reference) this.loadShiftReports(shift.reference);
        },
        error: (error: unknown) => {
          const mappedError = this.tellerApi.mapError(error);
          this.selectedShift = null;
          if (mappedError.status !== 404) this.showMessage(mappedError.message, 'error');
        }
      });
  }

  approveReconciliation(): void {
    if (!this.selectedShift?.reference || this.selectedShift.status !== 'PENDING_APPROVAL' || this.submitting) return;
    this.submitting = true;
    this.tellerApi
      .updateShift(this.selectedShift.reference, 'APPROVE')
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (shift) => {
          this.selectedShift = shift;
          this.showMessage('The cashier reconciliation was approved and the cash return was created.', 'success');
          this.loadShiftReports(shift.reference);
          this.refreshSummary();
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  private loadShiftReports(reference: string): void {
    this.tellerApi.getShiftReports(reference).subscribe({
      next: (reports) => {
        this.shiftReports = reports;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.shiftReports = null;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  refreshSummary(): void {
    const requestId = ++this.summaryRequestId;
    this.cashierSummary = null;
    if (!this.selectedTeller || !this.selectedCashier) return;
    this.organizationService
      .getCashierSummaryAndTransactions(this.selectedTeller.id, this.selectedCashier.id, this.currencyCode)
      .subscribe({
        next: (response: TellerDrawerSummary) => {
          if (requestId === this.summaryRequestId) {
            this.cashierSummary = response;
            if (this.activeView === 'reconciliation') this.loadSelectedShift();
            this.changeDetectorRef.markForCheck();
          }
        },
        error: () => {
          if (requestId === this.summaryRequestId) {
            this.showMessage('The selected cashier’s drawer summary could not be loaded.', 'error');
            this.changeDetectorRef.markForCheck();
          }
        }
      });
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    this.message = message;
    this.messageType = type;
  }
}
