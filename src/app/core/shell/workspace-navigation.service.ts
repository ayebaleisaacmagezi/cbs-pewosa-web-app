/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type CashierWorkspaceView = 'home' | 'transactions' | 'drawer' | 'records' | 'receipts';
export type LoanOfficerWorkspaceView = 'home' | 'members' | 'create-member' | 'groups' | 'applications';

@Injectable({ providedIn: 'root' })
export class WorkspaceNavigationService {
  private cashierViewSubject = new BehaviorSubject<CashierWorkspaceView>('transactions');
  private loanOfficerViewSubject = new BehaviorSubject<LoanOfficerWorkspaceView>('home');

  readonly cashierView$ = this.cashierViewSubject.asObservable();
  readonly loanOfficerView$ = this.loanOfficerViewSubject.asObservable();

  setCashierView(view: CashierWorkspaceView): void {
    if (this.cashierViewSubject.value !== view) this.cashierViewSubject.next(view);
  }

  setLoanOfficerView(view: LoanOfficerWorkspaceView): void {
    if (this.loanOfficerViewSubject.value !== view) this.loanOfficerViewSubject.next(view);
  }
}
