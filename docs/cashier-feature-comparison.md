# Cashier Portal Feature Comparison

## Purpose

This report compares the cashier requirements listed in
`C:\Users\HP\Desktop\mifos\cashier` with the cashier-related functionality implemented in the Mifos X Web App.

The review covers both staff workspaces that participate in cashier operations:

- Cashier workspace: `src/app/staff-workspaces/cashier-workspace.component.*`
- Chief Teller workspace: `src/app/staff-workspaces/chief-teller-workspace.component.*`

Supporting functionality elsewhere in the application was also inspected to distinguish a completely missing feature from a feature that exists in a back-office module but has not been integrated into the cashier portal.

## Rating Definitions

| Rating      | Meaning                                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Full**    | The feature is directly available as an operational Cashier or Chief Teller workflow, including the relevant API operation.                         |
| **Partial** | Some supporting or generic functionality exists, but the end-to-end cashier workflow is incomplete or only available in another application module. |
| **None**    | No relevant cashier workflow or supporting implementation was found.                                                                                |

## Executive Summary

| Status    | Features | Percentage |
| --------- | -------: | ---------: |
| Full      |        4 |       9.3% |
| Partial   |       21 |      48.8% |
| None      |       18 |      41.9% |
| **Total** |   **43** |   **100%** |

The current cashier portal is strongest in basic cash operations. It directly supports cash deposits, cash withdrawals, share purchases, transaction confirmation, receipt printing, drawer monitoring, and Chief Teller cash recovery.

The largest gaps are cheque services, digital banking services, bill payments, cashier-side loan processing, physical cash counting, shortage/overage processing, and formal end-of-day reconciliation.

## One-to-One Feature Comparison

### 1. Member Onboarding

|   # | Reference feature       | Status   | Implementation evidence and gap                                                                                                                                                                                                |
| --: | ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | Open Member Account     | Partial  | Client creation is implemented in `src/app/clients/create-client/` and exposed through the Clients routing module. The cashier workspace only searches and selects existing members; it cannot create a member.                |
|   2 | Pay Membership Fees     | Partial  | The cashier workspace can retrieve outstanding client charges and pay a selected charge through `ClientsService.payClientCharge()`. It does not identify, restrict, or report membership fees as a dedicated transaction type. |
|   3 | Pay Annual Subscription | Partial  | An annual subscription can potentially be configured as a client charge and paid through the generic fee action. There is no dedicated subscription workflow, subscription-period validation, or renewal status display.       |
|   4 | Purchase Shares         | **Full** | The cashier selects an existing share account, enters the requested number of shares, reviews the transaction, and posts the `applyadditionalshares` command through `SharesService`.                                          |
|   5 | Open Savings Account    | Partial  | Savings-account creation exists in `src/app/savings/create-savings-account/`, but it is not available from the cashier workspace.                                                                                              |
|   6 | Issue Cards & Passbooks | None     | No card issuance, card association, passbook generation, or passbook issuance workflow was found.                                                                                                                              |

### 2. Deposits

|   # | Reference feature      | Status   | Implementation evidence and gap                                                                                                                                                                                                                          |
| --: | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   7 | Cash Deposit           | **Full** | The cashier can search for a member, select an active savings account, enter an amount and note, review the transaction, and post a savings `deposit` command. A transaction receipt is generated after posting.                                         |
|   8 | Cheque Deposit         | Partial  | Standard savings transaction forms elsewhere in the application support payment details such as cheque number and bank information. The cashier workspace explicitly selects a cash payment type and provides no cheque fields or cheque-clearing state. |
|   9 | Mobile Money Deposit   | None     | No mobile-money provider selection, transaction reference, callback handling, reconciliation, or dedicated mobile-money deposit command was found.                                                                                                       |
|  10 | Standing Order Deposit | Partial  | Standing instructions are implemented in the Account Transfers module. They are not exposed as cashier deposits and there is no cashier-facing standing-order collection workflow.                                                                       |

### 3. Withdrawals

|   # | Reference feature       | Status   | Implementation evidence and gap                                                                                                                                                                                     |
| --: | ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  11 | Cash Withdrawal         | **Full** | The cashier can post a savings `withdrawal` command. The workspace requires an active drawer and prevents a withdrawal when the requested amount exceeds available drawer cash.                                     |
|  12 | Cheque Withdrawal       | Partial  | Generic savings withdrawal functionality exists outside the cashier portal and can carry payment details. The cashier workflow always selects a cash payment type and has no cheque issuance or authorization flow. |
|  13 | Mobile Money Withdrawal | None     | No mobile-money payout, provider integration, destination-number confirmation, or asynchronous transaction state was found.                                                                                         |
|  14 | ATM Withdrawal          | None     | No ATM transaction initiation or ATM transaction-management workflow was found.                                                                                                                                     |

### 4. Loans

|   # | Reference feature | Status  | Implementation evidence and gap                                                                                                                                              |
| --: | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  15 | Loan Disbursement | Partial | Loan disbursement and disbursement-to-savings operations exist in the Loans module. The cashier workspace does not display eligible loans or initiate disbursement.          |
|  16 | Loan Repayment    | Partial | Loan repayment forms and API commands exist in the Loans module, but repayment is not one of the cashier transaction actions.                                                |
|  17 | Penalty Payment   | Partial | Loan charges and penalty-management functionality exist in the Loans module. The cashier fee action only loads client-level charges and does not load or pay loan penalties. |
|  18 | Early Settlement  | Partial | Loan prepayment and foreclosure workflows exist in the Loans module. They are not integrated into the cashier workspace and cannot be processed as cashier transactions.     |

### 5. Payments and Transfers

|   # | Reference feature | Status  | Implementation evidence and gap                                                                                                                                                |
| --: | ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|  19 | Utility Payments  | None    | No biller catalogue, utility account validation, bill inquiry, or utility-payment posting workflow was found.                                                                  |
|  20 | School Fees       | None    | No school selection, student-account validation, school-fee collection, or school settlement workflow was found.                                                               |
|  21 | Internal Transfer | Partial | Account-to-account transfer functionality is implemented in the Account Transfers module and posts to `/accounttransfers`. It is not exposed in the cashier workspace.         |
|  22 | External Transfer | Partial | The Account Transfers module contains interbank-transfer form support, but there is no dedicated cashier workflow or independently verified external payment-rail integration. |
|  23 | Forex Buy/Sell    | None    | No foreign-exchange quotation, currency conversion, rate approval, cash exchange, or buy/sell workflow was found.                                                              |

### 6. Cheque Services

|   # | Reference feature   | Status  | Implementation evidence and gap                                                                                                                                                                                             |
| --: | ------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  24 | Cheque Deposit      | Partial | Payment-detail fields exist in general savings transaction flows, but the cashier portal has no cheque deposit form, clearing status, or cheque-specific receipt. This duplicate requirement has the same status as item 8. |
|  25 | Cheque Encashment   | None    | No cheque verification, encashment authorization, cheque status, or encashment posting workflow was found.                                                                                                                  |
|  26 | Stop Payment        | None    | No stop-payment instruction workflow was found.                                                                                                                                                                             |
|  27 | Cheque Book Request | None    | No cheque-book request, approval, issuance, or collection workflow was found.                                                                                                                                               |

### 7. Digital Services

|   # | Reference feature | Status | Implementation evidence and gap                                                                           |
| --: | ----------------- | ------ | --------------------------------------------------------------------------------------------------------- |
|  28 | Mobile Banking    | None   | No mobile-banking enrolment, activation, suspension, or profile-maintenance workflow was found.           |
|  29 | Internet Banking  | None   | No internet-banking enrolment, credential issuance, activation, or reset workflow was found.              |
|  30 | ATM Services      | None   | No ATM card issuance, PIN service, card linking, activation, blocking, or replacement workflow was found. |
|  31 | Agency Banking    | None   | No agent onboarding, agent transaction, float, commission, or agency-banking workflow was found.          |

### 8. Account Maintenance

|   # | Reference feature | Status  | Implementation evidence and gap                                                                                                                                               |
| --: | ----------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  32 | Update Details    | Partial | Client editing exists in the Clients module. The cashier workspace does not provide an update-details action or route the selected member into that workflow.                 |
|  33 | Freeze/Unfreeze   | Partial | Savings account hold, block account, block credit, block debit, and corresponding unblock actions exist in the Savings module. They are not exposed in the cashier workspace. |
|  34 | Replace Cards     | None    | No card-replacement or lost/stolen-card workflow was found.                                                                                                                   |
|  35 | Close Account     | Partial | Client closure and savings-account closure are implemented in their respective back-office modules. Neither operation is available from the cashier workspace.                |

### 9. Cash Management (Internal)

|   # | Reference feature | Status   | Implementation evidence and gap                                                                                                                                                                                   |
| --: | ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  36 | Cash Request      | None     | A Chief Teller can allocate cash directly, but there is no cashier-originated request, approval queue, requested amount, request status, or rejection workflow.                                                   |
|  37 | Cash Return       | **Full** | The Chief Teller workspace provides a Recover Cash action. It validates the amount against expected cashier cash and posts a teller cash settlement through `OrganizationService.settleCash()`.                   |
|  38 | Cash Count        | Partial  | The Cashier and Chief Teller workspaces display allocated cash, cash received, cash paid out, settled cash, and expected/net cash. There is no physical denomination-entry or counted-versus-expected comparison. |
|  39 | Vault Transfer    | Partial  | Cash allocation and recovery move value into and out of cashier drawers. There is no explicit vault entity, vault balance, vault-to-drawer transfer record, or vault-to-vault workflow.                           |

### 10. Reconciliation (End of Day)

|   # | Reference feature    | Status  | Implementation evidence and gap                                                                                                                                                                       |
| --: | -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  40 | Cash Reconciliation  | Partial | Drawer summaries and transaction records provide the data needed for basic review. There is no formal reconciliation session, declared cash amount, discrepancy calculation, submission, or approval. |
|  41 | Shortage/Overage     | None    | No shortage/overage capture, reason codes, approval, accounting treatment, or posting workflow was found.                                                                                             |
|  42 | GL Posting           | Partial | Manual journal-entry and accounting-closing functionality exists in the Accounting module. No cashier reconciliation workflow automatically prepares or posts a GL entry.                             |
|  43 | End-of-Day Balancing | None    | No shift-close process, final cash declaration, balancing confirmation, supervisor sign-off, drawer lock, or business-day completion workflow was found.                                              |

## Current Cashier Portal Capabilities

The cashier workspace currently provides the following operational sequence:

1. Identify the signed-in cashier and locate a current teller/cashier assignment.
2. Load drawer totals and transaction records from Fineract.
3. Search for a member by identifying information.
4. Load the member's savings accounts, share accounts, and outstanding client charges.
5. Select one of four transaction actions:
   - Cash deposit
   - Cash withdrawal
   - Share purchase
   - Generic fee payment
6. Validate the selected account or charge and the entered amount.
7. Present a transaction-review step.
8. Post the transaction through the appropriate Fineract service.
9. Display and print a transaction receipt.

The Chief Teller workspace currently provides:

1. Office-specific teller selection.
2. Cashier selection within a teller.
3. Drawer summary and transaction-history display.
4. Cash allocation to a cashier.
5. Cash recovery/settlement from a cashier.
6. Validation that a recovery does not exceed expected cashier cash.

## Important Implementation Evidence

| Capability                    | Primary evidence                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Cashier action definitions    | `src/app/staff-workspaces/cashier-workspace.component.ts` — `CashierAction` contains `deposit`, `withdrawal`, `shares`, and `fee`.  |
| Cash deposits and withdrawals | `CashierWorkspaceComponent.confirmTransaction()` calls `SavingsService.executeSavingsAccountTransactionsCommand()`.                 |
| Share purchases               | `CashierWorkspaceComponent.confirmTransaction()` posts `applyadditionalshares`.                                                     |
| Fee payment                   | `CashierWorkspaceComponent.confirmTransaction()` calls `ClientsService.payClientCharge()`.                                          |
| Receipt printing              | `CashierWorkspaceComponent.printReceipt()` renders the selected transaction and invokes browser printing.                           |
| Drawer discovery              | `CashierWorkspaceComponent.loadDrawer()` loads tellers and cashiers and selects the signed-in staff member's current assignment.    |
| Cash allocation and recovery  | `ChiefTellerWorkspaceComponent.confirmMovement()` calls `OrganizationService.allocateCash()` or `OrganizationService.settleCash()`. |
| Internal transfers            | `src/app/account-transfers/account-transfers.service.ts` posts to `/accounttransfers`.                                              |
| Standing instructions         | `AccountTransfersService.createStandingInstructions()` posts to `/standinginstructions`.                                            |
| Loan operations               | `src/app/loans/loans-view/loan-account-actions/` contains disbursement, repayment, prepayment, and foreclosure flows.               |
| Savings freeze/block          | `src/app/savings/saving-account-actions/manage-savings-account/` implements account, credit, debit, and amount blocks.              |
| Account closure               | Client and savings closure components exist under their respective action directories.                                              |
| Accounting support            | `src/app/accounting/` contains journal-entry and closing-entry workflows.                                                           |

## Recommended Delivery Priorities

### Priority 1: Complete Core Counter Transactions

1. Add loan repayment to the cashier transaction selector.
2. Add loan penalty payment using loan charges rather than client charges.
3. Add loan disbursement with cashier drawer-impact handling.
4. Add internal account transfer from the selected member context.
5. Add explicit membership-fee and annual-subscription transaction types.

### Priority 2: Complete Cash Control and Reconciliation

1. Implement cashier-originated cash requests with Chief Teller approval.
2. Add denomination-based cash counting.
3. Calculate counted cash versus expected drawer cash.
4. Add shortage and overage recording with reason codes and authorization.
5. Implement shift close and Chief Teller sign-off.
6. Define and implement reconciliation-related GL posting.

### Priority 3: Extend Account Services

1. Add member creation and savings-account opening from the cashier workspace.
2. Add member-detail update and account freeze/unfreeze shortcuts.
3. Add account closure with appropriate cashier permissions and authorization.
4. Add card and passbook issuance when the necessary backend capabilities are available.

### Priority 4: Add Payment Channels

1. Implement cheque deposit and cheque withdrawal with cheque-specific data and clearing states.
2. Integrate mobile-money collection and payout providers.
3. Add utility and school-fee biller integrations.
4. Add supported external transfers and foreign-exchange operations.

## Validation Performed

The focused Jest suite was executed with:

```text
npm run test -- --runInBand src/app/staff-workspaces/staff-workspace-transactions.spec.ts
```

Result:

```text
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

The tests cover regression cases for client-fee posting, drawer allocation, stale cashier responses, office-specific teller selection, teller-assignment dates, and receipt printing. They do not provide complete transaction coverage for every feature rated **Full**.

## Review Limitations

- This is a source-code and targeted unit-test review.
- No live Apache Fineract server was used to execute transactions.
- Permissions were inferred from routing, workspace guards, and available service calls; role-specific production configuration was not tested.
- A feature available in a back-office module was rated **Partial** when it was not integrated into the cashier portal.
- Provider-dependent features such as mobile money, ATM, card management, bill payment, and external transfers require corresponding backend or third-party capabilities before the UI can be considered complete.
- Before a pull request containing cashier UI changes is submitted, manually capture both **Before** and **After** screenshots as required by the project contribution guidelines.
