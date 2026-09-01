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

@Injectable({ providedIn: 'root' })
export class WorkspaceNavigationService {
  private cashierViewSubject = new BehaviorSubject<CashierWorkspaceView>('transactions');

  readonly cashierView$ = this.cashierViewSubject.asObservable();

  setCashierView(view: CashierWorkspaceView): void {
    if (this.cashierViewSubject.value !== view) this.cashierViewSubject.next(view);
  }
}
