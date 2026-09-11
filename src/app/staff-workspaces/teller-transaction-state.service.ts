/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  CashierMemberContext,
  CashierTransactionDraft,
  CashierTransactionResult,
  CashierTransactionState
} from './teller-api.models';

const INITIAL_STATE: CashierTransactionState = {
  stage: 'member',
  submissionStatus: 'idle'
};

@Injectable({ providedIn: 'root' })
export class TellerTransactionStateService {
  private readonly storageKey = 'mifosx.cashier.transaction';
  private readonly stateSubject = new BehaviorSubject<CashierTransactionState>(this.load());

  readonly state$ = this.stateSubject.asObservable();

  get snapshot(): CashierTransactionState {
    return this.stateSubject.value;
  }

  selectMember(member: CashierMemberContext): void {
    this.setState({ stage: 'transaction', submissionStatus: 'idle', member });
  }

  review(member: CashierMemberContext, draft: CashierTransactionDraft): void {
    this.setState({ stage: 'review', submissionStatus: 'ready', member, draft });
  }

  beginSubmission(): void {
    if (!this.snapshot.draft || this.snapshot.submissionStatus !== 'ready') return;
    this.setState({ ...this.snapshot, submissionStatus: 'submitting' });
  }

  setServerReference(reference: string): void {
    if (!this.snapshot.draft) return;
    this.setState({
      ...this.snapshot,
      draft: { ...this.snapshot.draft, serverReference: reference }
    });
  }

  allowRetry(): void {
    if (!this.snapshot.draft) return;
    this.setState({ ...this.snapshot, stage: 'review', submissionStatus: 'ready' });
  }

  requireRecovery(): void {
    if (!this.snapshot.draft) return;
    this.setState({ ...this.snapshot, stage: 'review', submissionStatus: 'recovery-required' });
  }

  complete(result: CashierTransactionResult): void {
    this.setState({ ...this.snapshot, stage: 'result', submissionStatus: 'submitted', result });
  }

  reset(): void {
    this.setState(INITIAL_STATE);
  }

  createIdempotencyKey(): string {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private load(): CashierTransactionState {
    try {
      const stored = globalThis.sessionStorage?.getItem(this.storageKey);
      if (!stored) return INITIAL_STATE;
      const state = JSON.parse(stored) as CashierTransactionState;
      return state.submissionStatus === 'submitting'
        ? { ...state, stage: 'review', submissionStatus: 'recovery-required' }
        : state;
    } catch {
      return INITIAL_STATE;
    }
  }

  private setState(state: CashierTransactionState): void {
    this.stateSubject.next(state);
    try {
      if (state === INITIAL_STATE) globalThis.sessionStorage?.removeItem(this.storageKey);
      else globalThis.sessionStorage?.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // Transaction state remains available in memory when browser storage is unavailable.
    }
  }
}
