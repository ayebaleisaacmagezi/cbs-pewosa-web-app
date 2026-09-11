/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormBuilder } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { CashierWorkspaceComponent } from './cashier-workspace.component';
import { ChiefTellerWorkspaceComponent } from './chief-teller-workspace.component';
import { LoanOfficerWorkspaceComponent } from './loan-officer-workspace.component';

// Exercise the transaction handlers with controlled services, without mounting the app shell.
const instance = (component: any, state: any): any => Object.assign(Object.create(component.prototype), state);
const settings = { businessDate: new Date(2026, 8, 6), dateFormat: 'dd MMMM yyyy', language: { code: 'en' } };
const dates = { formatDate: () => '06 September 2026' };

describe('Staff workspace transaction regressions', () => {
  it('posts the reviewed fee and preserves its receipt after refreshing the member', () => {
    const payClientCharge = jest.fn(() => of({ resourceId: 44 }));
    const cashier = instance(CashierWorkspaceComponent, {
      pendingTransaction: { action: 'fee', amount: 100, clientId: 1, member: 'Alice', chargeId: 5 },
      selectedClient: { id: 1, displayName: 'Alice' },
      selectedAction: 'fee',
      transactionForm: new FormBuilder().group({ amount: 900, chargeId: 6 }),
      settingsService: settings,
      dates,
      memberDetailsRequestId: 0,
      clientsService: {
        payClientCharge,
        getClientAccountData: () => of({}),
        getClientChargesData: () => of([])
      }
    });
    cashier.confirmTransaction();
    expect(payClientCharge).toHaveBeenCalledWith(1, 5, expect.objectContaining({ amount: 100 }));
    expect(cashier.receipt).toEqual(expect.objectContaining({ reference: 44, member: 'Alice', amount: 100 }));
  });

  it('posts the reviewed drawer movement rather than subsequent form edits', () => {
    const allocateCash = jest.fn(() => of({ resourceId: 55 }));
    const chief = instance(ChiefTellerWorkspaceComponent, {
      pendingMovement: { action: 'allocate', amount: 100, note: 'Float', tellerId: 1, cashierId: 2 },
      movementForm: new FormBuilder().group({ txnAmount: 900, txnNote: 'Changed' }),
      settingsService: settings,
      dates,
      summaryRequestId: 0,
      organizationService: { allocateCash }
    });
    chief.confirmMovement();
    expect(allocateCash).toHaveBeenCalledWith(1, 2, expect.objectContaining({ txnAmount: 100, txnNote: 'Float' }));
  });

  it('clears the previous cashier balance and ignores a late summary', () => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    const chief = instance(ChiefTellerWorkspaceComponent, {
      selectedTeller: { id: 1 },
      summaryRequestId: 0,
      cashierSummary: { netCash: 500 },
      organizationService: {
        getCashierSummaryAndTransactions: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
      }
    });
    chief.selectCashier({ id: 2 });
    expect(chief.cashierSummary).toBeNull();
    chief.selectCashier({ id: 3 });
    second.next({ netCash: 20 });
    first.next({ netCash: 500 });
    expect(chief.cashierSummary.netCash).toBe(20);
  });

  it('ignores cashiers returned for a previously selected teller', () => {
    const first = new Subject<any>();
    const chief = instance(ChiefTellerWorkspaceComponent, {
      cashiersRequestId: 0,
      summaryRequestId: 0,
      cashierSearchControl: new FormBuilder().control(''),
      organizationService: { getCashiers: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(of([])) }
    });
    chief.selectTeller({ id: 1 });
    chief.selectTeller({ id: 2 });
    first.next([{ id: 7 }]);
    expect(chief.selectedTeller.id).toBe(2);
    expect(chief.cashiers).toEqual([]);
    expect(chief.selectedCashier).toBeNull();
  });

  it('does not fall back to tellers from other offices', () => {
    const chief = instance(ChiefTellerWorkspaceComponent, {
      credentials: { officeId: 1 },
      organizationService: { getTellers: () => of([{ id: 3, officeId: 2 }]) }
    });
    chief.loadTellers();
    expect(chief.tellers).toEqual([]);
  });

  it('clears member products and ignores a previous member response', () => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    const officer = instance(LoanOfficerWorkspaceComponent, {
      memberRequestId: 0,
      accounts: { owner: 0 },
      clientsService: {
        getClientData: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second),
        getClientAccountData: (id: number) => of({ owner: id }),
        getClientChargesData: () => of([])
      }
    });
    officer.openMember({ id: 1 });
    expect(officer.accounts).toBeNull();
    officer.openMember({ id: 2 });
    second.next({ id: 2 });
    second.complete();
    first.next({ id: 1 });
    first.complete();
    expect(officer.selectedClient.id).toBe(2);
    expect(officer.accounts.owner).toBe(2);
  });

  it('routes group loans through their group and individual loans through their client', () => {
    const navigate = jest.fn();
    const officer = instance(LoanOfficerWorkspaceComponent, { router: { navigate } });
    officer.openApplication({ id: 4, groupId: 7 });
    expect(navigate).toHaveBeenLastCalledWith([
      '/groups',
      7,
      'loans-accounts',
      4,
      'general'
    ]);
    officer.openApplication({ id: 5, clientId: 8, groupId: 7 });
    expect(navigate).toHaveBeenLastCalledWith([
      '/clients',
      8,
      'loans-accounts',
      5,
      'general'
    ]);
  });

  it('starts a loan application for the borrower selected in the guided flow', () => {
    const navigate = jest.fn();
    const officer = instance(LoanOfficerWorkspaceComponent, {
      router: { navigate },
      selectedLoanApplicant: null,
      message: 'Previous message'
    });
    officer.selectLoanApplicant({ id: 12, displayName: 'Amina' });
    officer.startLoan(officer.selectedLoanApplicant.id);
    expect(officer.message).toBe('');
    expect(navigate).toHaveBeenCalledWith(
      [
        '/clients',
        12,
        'loans-accounts',
        'create'
      ],
      { queryParams: { workspace: 'loan-officer' } }
    );
  });

  it('rejects expired and future assignments, including date boundaries', () => {
    const cashier = instance(CashierWorkspaceComponent, { settingsService: settings });
    expect(
      cashier.assignmentIsCurrent({ startDate: [
          2026,
          9,
          6
        ], endDate: [
          2026,
          9,
          6
        ] })
    ).toBe(true);
    expect(
      cashier.assignmentIsCurrent({ startDate: [
          2026,
          9,
          7
        ] })
    ).toBe(false);
    expect(
      cashier.assignmentIsCurrent({ startDate: [
          2026,
          9,
          1
        ], endDate: [
          2026,
          9,
          5
        ] })
    ).toBe(false);
  });

  it('prints the selected record after rendering its receipt', () => {
    const print = jest.spyOn(window, 'print').mockImplementation(() => {});
    const detectChanges = jest.fn();
    const cashier = instance(CashierWorkspaceComponent, { changeDetectorRef: { detectChanges } });
    cashier.printReceipt({ id: 9, clientName: 'Bob', amount: 0, txnAmount: 100, txnDate: '2026-09-06' });
    expect(cashier.receipt).toEqual(expect.objectContaining({ reference: 9, member: 'Bob', amount: 0 }));
    expect(detectChanges).toHaveBeenCalled();
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
