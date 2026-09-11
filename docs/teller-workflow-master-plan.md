# Teller Workflow Master Plan and Delivery Tracker

> **Source of truth:*![alt text](image.png)* `C:\Users\HP\Desktop\mifos\Teller_Process_Flow.md`  
> **Frontend:** `C:\Users\HP\Desktop\mifos\cbs-pewosa-web-app`  
> **Backend:** `C:\Users\HP\Desktop\mifos\pewosa-fineract`  
> **Out of scope:** `cbspewosaV2` is the member portal and must not be modified for teller delivery.  
> **Last updated:\*\* 2026-09-10

## 1. Purpose

This file is the durable implementation plan, progress tracker, and cross-session handoff record for the CBS PEWOSA teller program. Every agent must read this file and `Teller_Process_Flow.md` before changing teller code.
![alt text](image.png)
The delivery is complete only when all eleven workflows in the source document operate end-to-end through the Angular Cashier or Chief Teller workspace with Fineract as the financial source of truth.

## 2. Non-Negotiable Architecture Decisions

1. All teller-facing UI belongs in the Angular web app.
2. Fineract owns balances, financial transactions, product rules, accounting, permissions, approval enforcement, reversals, drawer truth, and reconciliation state.
3. `cbspewosaV2` remains a separate member portal. Do not import, call, or modify its rejected PHP teller implementation.
4. Reuse existing Angular client, savings, loan, share, accounting, reports, teller, and maker-checker functionality before creating new screens.
5. Reuse existing Fineract product transaction commands. Do not reproduce loan allocation, balance calculations, schedules, or standard double-entry accounting in Angular or custom code.
6. Angular validation improves usability but is never authoritative for money, limits, approvals, AML, CTR, or reconciliation.
7. Every teller financial operation must have one server-issued reference and an idempotency key. A retry must return the original result rather than post again.
8. Cash product transactions and their cashier-drawer effects must be linked within the same Fineract transaction boundary. Reversals create linked opposite movements; original records are never deleted.
9. Mobile-money services remain in the member channel. The teller workflows initially use cash, cheque, or direct account credit as specified by each flow.
10. Amounts are UGX-first, while currency remains an explicit field rather than a hard-coded accounting assumption.

## 3. Current Baseline

The full Angular application already contains reusable client creation, images/documents, savings creation and transactions, loan disbursement and repayment, shares, reversals, reports, maker-checker, and teller administration.

The current Cashier and Chief Teller workspaces directly provide member search, cash savings deposit/withdrawal, generic client-fee payment, share application, drawer summaries, cash allocation/recovery, records, and receipts. These are simplified flows and do not yet satisfy the complete operational specification.

Known working-tree condition at the start of this plan:

- The repository is on `WEB-PEWOSA-loan-officer-workspace`, not a clean teller branch.
- Cashier loan-repayment changes in the workspace are uncommitted and must be reviewed before being adopted.
- `staff-workspace-transactions.spec.ts`, `DEPLOY_COMMAND.txt`, `.magezi/`, and `src/image.png` contain pre-existing changes or untracked content. Preserve them unless separately authorized.
- `docs/cashier-feature-comparison.md` is an uncommitted audit artifact.

## 4. Status Rules

Use only these tracker states:

| State              | Meaning                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `NOT_STARTED`      | No implementation work has begun.                                                        |
| `IN_PROGRESS`      | One agent owns the work item and is actively changing it.                                |
| `BLOCKED`          | Progress requires a named decision, dependency, credential, device, or external service. |
| `READY_FOR_REVIEW` | Implementation and the work item's lean verification are complete.                       |
| `DONE`             | Acceptance evidence is recorded and the phase gate has passed.                           |

An agent must update the tracker before and after working on an item. Never mark an item `DONE` based only on visible UI.

## 5. Target Data and API Contract

Use a PEWOSA teller extension within `pewosa-fineract`, following the repository's existing `custom` module and Liquibase patterns. Standard Fineract APIs continue posting clients, savings, loans, shares, and accounting transactions.

### Extension resources

| Resource                                     | Responsibility                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `/v1/pewosa/teller/preflight`                | Server-side account, balance, drawer, limit, approval, CTR, and AML decision before posting.                               |
| `/v1/pewosa/teller/transactions/{reference}` | Return the linked product transaction, drawer movement, approvals, compliance flags, notification state, and receipt data. |
| `/v1/pewosa/teller/shifts`                   | Open, stop, count, reconcile, approve, close, and retrieve a cashier shift.                                                |
| `/v1/pewosa/teller/cash-movements`           | Request, verify, approve, execute, and acknowledge vault/drawer movements.                                                 |
| `/v1/pewosa/teller/approvals`                | Retrieve and decide amount/context-based teller approvals.                                                                 |
| `/v1/pewosa/teller/reversals`                | Validate and coordinate cross-product teller reversal requests.                                                            |
| `/v1/pewosa/teller/compliance-cases`         | Retrieve and complete CTR/STR cases raised by transaction rules.                                                           |
| `/v1/pewosa/teller/onboarding`               | Persist onboarding progress and enforce beneficiary/completion requirements not represented by standard client APIs.       |

### Extension records

Use additive Liquibase migrations for:

- Teller shift/session and status
- Transaction-to-drawer link and idempotency reference
- Denomination count lines
- Cash-movement request and confirmation stages
- Approval request and decision history
- Reconciliation, variance, shortage, and overage cases
- Reversal request and parent transaction link
- Configurable teller/member/holding/approval/CTR rules
- CTR/STR compliance cases
- Onboarding progress, beneficiary allocation, and checklist state

Do not store derived Fineract balances or reproduce the Fineract general ledger in these tables.

## 6. Phased Implementation Plan

### Phase 0 — Establish a Safe Baseline

**Goal:** isolate teller work and prevent existing changes from being lost or misattributed.

| ID    | Repository | Work item                                                                                                                        | Acceptance condition                                                               |
| ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| P0-01 | Angular    | Review and classify every pre-existing dirty file; preserve unrelated work.                                                      | Handoff records which files belong to teller work and which must remain untouched. |
| P0-02 | Both       | Record the current local worktrees; create Jira-backed branches only if an upstream pull request is later requested.             | Local implementation is not blocked by upstream contribution metadata.             |
| P0-03 | Angular    | Decide whether to retain or replace the current uncommitted cashier loan-repayment implementation based on the shared loan form. | No duplicated repayment rules remain.                                              |
| P0-04 | Both       | Freeze API names, state values, permissions, and error-envelope format for Phase 1.                                              | Angular and Fineract use the same documented contract.                             |

**Gate:** clean ownership boundaries, approved branches, and stable initial API contract.

### Phase 1 — Teller Foundation and Drawer Correctness

**Goal:** make every later cash workflow safe, linked, permissioned, and observable.

| ID       | Repository | Work item                                                                                                                         | Acceptance condition                                                                                  |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| P1-BE-01 | Fineract   | Add explicit cash transaction-to-cashier linkage for savings deposit/withdrawal and loan cash repayment/disbursement.             | Cash transactions produce exactly one linked `INWARD` or `OUTWARD` cashier movement.                  |
| P1-BE-02 | Fineract   | Require explicit payment type/rail for teller transactions.                                                                       | Cashier journal excludes cheque, transfer, and mobile transactions unless explicitly defined as cash. |
| P1-BE-03 | Fineract   | Add idempotency/reference handling and transaction detail resource.                                                               | Repeating a request cannot duplicate financial or drawer entries.                                     |
| P1-BE-04 | Fineract   | Implement server-side preflight for account status, frozen state, balance, minimum balance, drawer availability, and base limits. | Posting cannot bypass failed preflight rules.                                                         |
| P1-BE-05 | Fineract   | Add teller permissions and audit metadata for new extension commands.                                                             | Every resource is tenant-scoped, authenticated, authorized, and audited.                              |
| P1-FE-01 | Angular    | Add typed teller API models/service and centralized error mapping.                                                                | Cashier components do not construct extension HTTP calls directly.                                    |
| P1-FE-02 | Angular    | Refactor the transaction flow into member, transaction, review, result states shared by cash operations.                          | Refresh/back navigation cannot silently repost or lose a confirmed reference.                         |
| P1-FE-03 | Angular    | Remove hard-coded UGX display where a response currency is available.                                                             | Currency is consistently taken from account/drawer/transaction data.                                  |

**Gate:** deposit, withdrawal, repayment, and disbursement can be posted once with a matching drawer movement and receipt reference.

### Phase 2 — Core Counter Transactions

**Goal:** complete workflows 2.2, 2.3, 2.5, and 2.6.

| ID       | Repository | Work item                                                                                                                                                                                                 | Acceptance condition                                                                                                                                         |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P2-FE-01 | Angular    | Complete cash deposit: identity evidence, slip details, amount-in-words confirmation, cash count, narration, charges/net preview, drawer delta, receipt, voucher acknowledgement, and notification state. | Every step and branch in workflow 2.2 is represented or recorded as an explicit manual confirmation.                                                         |
| P2-FE-02 | Angular    | Complete cash withdrawal: identity/signature evidence, available balance/charges, approval status, cash count-out, receipt signature acknowledgement, and notification state.                             | Every step and branch in workflow 2.3 is represented and posting remains blocked until required approval succeeds.                                           |
| P2-FE-03 | Angular    | Complete loan repayment using the existing generic repayment form and Fineract allocation result.                                                                                                         | UI shows penalty, interest, principal, installments, outstanding balance, payoff status, receipt, and drawer delta without recalculating allocation locally. |
| P2-BE-01 | Fineract   | Link cash share purchase to the cashier drawer while preserving share product limits and approval lifecycle.                                                                                              | Successful cash share posting creates the correct share state/accounting and one `INWARD` drawer movement.                                                   |
| P2-FE-04 | Angular    | Complete share purchase with unit price, quantity, total, min/max/current holding, cash receipt, updated holding, and certificate/receipt output.                                                         | Workflow 2.6 is complete and cash appears in drawer receipts.                                                                                                |
| P2-BE-02 | Fineract   | Trigger idempotent transaction notification events after committed counter transactions.                                                                                                                  | Notification status is queryable and failure never duplicates the financial transaction.                                                                     |

**Gate:** all four counter transaction workflows pass their happy path, rejection path, approval-required path, and duplicate-submit protection.

### Phase 3 — Member Onboarding

**Goal:** complete workflow 2.1 using existing Angular screens and standard Fineract client/account APIs.

| ID       | Repository | Work item                                                                                                                                                        | Acceptance condition                                                                                   |
| -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| P3-FE-01 | Angular    | Build a resumable Cashier onboarding wizard around existing client, identifier, image/document, charge, savings, and share services.                             | Teller can resume an incomplete onboarding record without duplicating the client.                      |
| P3-BE-01 | Fineract   | Enforce unique National ID/identifier and phone rules required by the SACCO.                                                                                     | Duplicate identifiers or phone numbers are rejected server-side with actionable errors.                |
| P3-BE-02 | Fineract   | Add beneficiary allocation and onboarding-completion enforcement.                                                                                                | At least one beneficiary exists and active allocation totals exactly 100% before completion.           |
| P3-FE-02 | Angular    | Add photo, signature, fingerprint-device reference, occupation/employer/income, beneficiary, card/passbook, digital-enrolment, document, and welcome-pack steps. | Each required item is captured or explicitly marked unavailable with an authorized reason.             |
| P3-FE-03 | Angular    | Coordinate membership fee, annual subscription, minimum shares, savings opening, and optional initial deposit.                                                   | Each successful financial step has its own receipt/reference and the final summary shows all outcomes. |

**Gate:** a new person can complete all twelve onboarding steps without leaving an ambiguous partial state.

### Phase 4 — Loan Disbursement

**Goal:** complete workflow 2.4 using existing loan actions and accounting.

| ID       | Repository | Work item                                                                                                     | Acceptance condition                                                                               |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P4-FE-01 | Angular    | Add an approved-loan queue and member loan selection to Cashier.                                              | Only approved, not-yet-disbursed loans are selectable.                                             |
| P4-FE-02 | Angular    | Reuse the existing disbursement form for cash, cheque, and direct-to-savings modes.                           | Deductions, net disbursement, account/payment details, and schedule are shown before confirmation. |
| P4-BE-01 | Fineract   | Enforce active cashier and drawer sufficiency for cash disbursement and record the linked `OUTWARD` movement. | Cash disbursement cannot post without sufficient assigned drawer cash.                             |
| P4-FE-03 | Angular    | Add identity/collateral/approval/document confirmations plus receipt and repayment-schedule printing.         | Workflow 2.4 completes with a traceable signed-document checklist and notification status.         |

**Gate:** each disbursement mode posts through the correct existing Fineract command; only cash changes the drawer.

### Phase 5 — Approval Matrix, Limits, and Dual-Control Cash Movement

**Goal:** complete workflows 2.9, 2.10, and the financial-limit portion of 2.11.

| ID       | Repository | Work item                                                                                                                                     | Acceptance condition                                                                                |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| P5-BE-01 | Fineract   | Add configurable rules by office, currency, transaction type, amount, role, and effective date.                                               | The documented UGX approval bands are configuration, not Angular constants.                         |
| P5-BE-02 | Fineract   | Implement teller single limit, member daily/monthly withdrawal limits, minimum balance, and drawer holding limit.                             | Concurrent requests cannot bypass aggregated limits.                                                |
| P5-FE-01 | Angular    | Add reusable preflight/approval presentation and the role-specific approval inbox.                                                            | Users see allowed, rejected, approval-required, cash-return-required, and report-required outcomes. |
| P5-BE-03 | Fineract   | Add cash-movement request states, denomination lines, two distinct vault approvals, final allocation/settlement, and cashier acknowledgement. | The same person cannot satisfy both vault approvals; money moves only after all required stages.    |
| P5-FE-02 | Angular    | Add Cashier request, Vault Officer verification, Chief Teller approval, voucher, and receipt-confirmation screens.                            | Workflow 2.9 is complete with actor and timestamp history.                                          |

**Gate:** approval bands and all limit rules are server-enforced; a full vault-to-teller request completes with two distinct officers and cashier confirmation.

### Phase 6 — End-of-Day Reconciliation

**Goal:** complete workflow 2.7.

| ID       | Repository | Work item                                                                                                      | Acceptance condition                                                                |
| -------- | ---------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| P6-BE-01 | Fineract   | Add shift states `OPEN`, `STOPPED`, `COUNTING`, `PENDING_APPROVAL`, `RECONCILED`, and `CLOSED`.                | Financial posting is rejected after the shift reaches `STOPPED`.                    |
| P6-FE-01 | Angular    | Add denomination entry and calculate physical cash from server-provided denomination definitions.              | Entered quantities and calculated total are displayed before submission.            |
| P6-BE-02 | Fineract   | Calculate expected cash and variance; create shortage/overage cases and approval requirements.                 | Client-submitted totals cannot override the authoritative server calculation.       |
| P6-BE-03 | Fineract   | Post approved shortage/overage accounting and settle the drawer return to vault.                               | Accounting is balanced and linked to the reconciliation reference.                  |
| P6-FE-02 | Angular    | Add explanation, cash-return voucher, supporting-voucher checklist, supervisor review, and close confirmation. | Drawer cannot close until required evidence, approval, and settlement are complete. |
| P6-BE-04 | Fineract   | Provide the teller journal, cash position, variance, daily activity, and GL posting report bundle.             | Reports reconcile to the closed shift and carry the same reference.                 |

**Gate:** zero, shortage, and overage scenarios all reach an approved closed state with balanced reports.

### Phase 7 — Unified Transaction Reversal

**Goal:** complete workflow 2.8 without duplicating existing product reversal logic.

| ID       | Repository | Work item                                                                                                         | Acceptance condition                                                                     |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| P7-BE-01 | Fineract   | Add a unified eligibility/read model for teller-posted savings, loan, share, client-fee, and drawer transactions. | Response states whether the transaction is posted, reversible, in-period, and permitted. |
| P7-BE-02 | Fineract   | Coordinate the correct existing product reversal plus a linked opposite drawer movement.                          | Original transaction remains immutable and references the reversal transaction.          |
| P7-FE-01 | Angular    | Add reversal search/detail, mandatory reason/evidence, approval state, result, and reversal receipt.              | Teller cannot directly bypass required supervisor/audit approval.                        |

**Gate:** each supported transaction type reverses balances/accounting and drawer effect exactly once.

### Phase 8 — CTR, AML, Reporting, and Operational Completion

**Goal:** complete the compliance portion of workflow 2.11 and close all operational gaps.

| ID        | Repository | Work item                                                                                                                                                | Acceptance condition                                                                                              |
| --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| P8-BE-01  | Fineract   | Add configurable CTR thresholds and rolling AML/structuring evaluation.                                                                                  | A transaction at the threshold creates CTR work; suspicious sub-threshold patterns create a reviewable STR alert. |
| P8-BE-02  | Fineract   | Add restricted CTR/STR case records, statuses, evidence, decisions, and report outputs.                                                                  | Case access is permissioned and history cannot be silently overwritten.                                           |
| P8-FE-01  | Angular    | Add teller CTR capture and compliance case screens.                                                                                                      | Required compliance work is visible and cannot be skipped when blocking policy applies.                           |
| P8-FE-02  | Angular    | Finish receipt formats, two-copy printing, notification visibility, device/manual checkpoints, and workflow help.                                        | Every source workflow has a final receipt/report and an auditable completion state.                               |
| P8-OPS-01 | Both       | Complete configuration documentation for roles, payment types, financial activity accounts, limits, approvals, denominations, SMS, reports, and devices. | A new office can be configured without source-code changes.                                                       |

**Gate:** all eleven workflows match the source document and the master tracker contains evidence for every item.

### 6.1 Exact-flow re-audit correction — 2026-09-10

The implementation tracker records delivery of individual code work items; it must not be read as acceptance of the complete business flow. The step-by-step re-audit in `docs/teller-process-flow-verification.md` supersedes earlier broad statements that every flow was implemented.

Current exact-flow result: **59 Full, 41 Partial, 0 Missing, 2 existing core/manual prerequisites, and 2 Not Applicable out of 104 checked rows**. Completed reversals are accepted as electronically filed without image upload; forex approval is Not Applicable; EOD database backup/archive is a deployment/operations responsibility outside the teller UI; and PEWOSA does not levy a cash-deposit fee, so deposit charge is zero and net credit equals cash received. Therefore the Phase 8 gate and overall program gate remain **OPEN** because Partial rows remain. The highest-priority gaps are withdrawal charge review, true two-person special approvals, cashier CTR capture, disbursement policy enforcement, vault-balance authority, required operational artifacts, complete EOD reporting, and missing cheque rails.

## 7. Master Tracker

Update `Status`, `Owner`, `Branch/PR`, `Evidence`, and `Updated` whenever ownership or state changes.

| ID        | Status           | Owner                           | Depends on         | Branch/PR               | Evidence                                                                                                                  | Updated    |
| --------- | ---------------- | ------------------------------- | ------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| P0-01     | COMPLETE         | `/root`                         | —                  | Current worktrees       | Existing dirty files classified and preserved                                                                             | 2026-09-10 |
| P0-02     | NOT_APPLICABLE   | `/root`                         | P0-01              | Current local worktrees | Local product implementation; an upstream Jira branch is needed only if a PR is requested                                 | 2026-09-10 |
| P0-03     | READY_FOR_REVIEW | `/root`                         | P0-01              | Current Angular branch  | Existing repayment/disbursement commands and server allocation/result detail mapped                                       | 2026-09-10 |
| P0-04     | READY_FOR_REVIEW | `/root` + backend agent         | P0-02              | Current worktrees       | Typed Angular/Fineract contract and additive workflow routes statically reconciled                                        | 2026-09-10 |
| P1-BE-01  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P0-04              | Current backend branch  | Savings/loan post-events create one linked drawer movement; static audit passed                                           | 2026-09-10 |
| P1-BE-02  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P0-04              | Current backend branch  | Explicit CASH/NON_CASH rail and payment-type enforcement verified                                                         | 2026-09-10 |
| P1-BE-03  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P0-04              | Current backend branch  | Idempotency, immutable references, transaction detail and duplicate-link rejection implemented                            | 2026-09-10 |
| P1-BE-04  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P0-04              | Current backend branch  | Locked rules/account/drawer checks and authoritative net-disbursement sufficiency implemented                             | 2026-09-10 |
| P1-BE-05  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P0-04              | Current backend branch  | Dedicated permissions, immutable office snapshots and self/reviewer access audit passed                                   | 2026-09-10 |
| P1-FE-01  | COMPLETE         | `/root`                         | P0-04              | Current Angular branch  | Typed API service; lint/build passed                                                                                      | 2026-09-10 |
| P1-FE-02  | COMPLETE         | `/root`                         | P1-FE-01           | Current Angular branch  | Persistent review/recovery state; build passed                                                                            | 2026-09-10 |
| P1-FE-03  | COMPLETE         | `/root`                         | P1-FE-01           | Current Angular branch  | Dynamic currency rendering; build passed                                                                                  | 2026-09-10 |
| P2-FE-01  | PARTIAL          | `/root`                         | P1 gate            | Current Angular branch  | Core deposit path and zero-fee net treatment exist; per-transaction voucher filing, teller CTR form, and delivered SMS remain | 2026-09-10 |
| P2-FE-02  | PARTIAL          | `/root`                         | P1 gate            | Current Angular branch  | Core withdrawal path exists; charge/total-deduction preview, charge-aware affordability, teller CTR form, and SMS remain  | 2026-09-10 |
| P2-FE-03  | PARTIAL          | `/root`                         | P1 gate, P0-03     | Current Angular branch  | Cash repayment/allocation receipt exists; teller cheque rail, collateral-release evidence, and delivered SMS remain      | 2026-09-10 |
| P2-BE-01  | READY_FOR_REVIEW | `/root/fineract_backend_finish` | P1 gate            | Current backend branch  | Idempotent share purchase, role-gated approval/rejection, core share posting and single drawer posting implemented        | 2026-09-10 |
| P2-FE-04  | PARTIAL          | `/root`                         | P2-BE-01           | Current Angular branch  | Purchase works; the printed output is a generic certificate/receipt view, not a dedicated certificate artifact           | 2026-09-10 |
| P2-BE-02  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P1 gate            | Current backend branch  | Notification queue/state, transaction visibility and dedicated update permission implemented                              | 2026-09-10 |
| P3-FE-01  | PARTIAL          | `/root`                         | P1-FE-01           | Current Angular branch  | Resumable wizard exists; existing-member inquiry routing and exact member-number workflow remain                          | 2026-09-10 |
| P3-BE-01  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P0-04              | Current backend branch  | Unique National ID/mobile validation and immutable office-scoped onboarding implemented                                   | 2026-09-10 |
| P3-BE-02  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P0-04              | Current backend branch  | Beneficiary allocation and append-only onboarding financial history implemented                                           | 2026-09-10 |
| P3-FE-02  | PARTIAL          | `/root`                         | P3-FE-01, P3-BE-02 | Current Angular branch  | Beneficiaries work; biometrics, card/passbook, welcome pack, and digital enrollment are acknowledgements only            | 2026-09-10 |
| P3-FE-03  | PARTIAL          | `/root`                         | P3-FE-01, P2 gate  | Current Angular branch  | Financial history exists; steps are manually referenced and missing required cheque/action integration                   | 2026-09-10 |
| P4-FE-01  | READY_FOR_REVIEW | `/root`                         | P1 gate            | Current Angular branch  | Server-status-filtered approved-loan queue opens the member and approved loan in Cashier                                  | 2026-09-10 |
| P4-FE-02  | PARTIAL          | `/root`                         | P4-FE-01           | Current Angular branch  | Three modes and net preview work; processing, insurance, and form-fee deductions are not itemized                         | 2026-09-10 |
| P4-BE-01  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P1 gate            | Current backend branch  | Gross loan control plus authoritative net drawer sufficiency/posting verified                                             | 2026-09-10 |
| P4-FE-03  | PARTIAL          | `/root`                         | P4-FE-02, P4-BE-01 | Current Angular branch  | UI confirmations exist; collateral/documents and active-member/active-loan policies are not server-verified              | 2026-09-10 |
| P5-BE-01  | PARTIAL          | `/root/backend_final_audit`     | P1 gate            | Current backend branch  | Configurable role rules exist; exact matrix defaults and independent multi-role special approvals remain                 | 2026-09-10 |
| P5-BE-02  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P5-BE-01           | Current backend branch  | Locked aggregated limits implemented; concurrency runtime verification deferred                                           | 2026-09-10 |
| P5-FE-01  | READY_FOR_REVIEW | `/root`                         | P5-BE-01           | Current Angular branch  | Preflight outcomes and role-aware Chief Teller approval inbox implemented                                                 | 2026-09-10 |
| P5-BE-03  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P5-BE-01           | Current backend branch  | Two distinct VERIFY stages, execution, office scoping and teller acknowledgement implemented                              | 2026-09-10 |
| P5-FE-02  | PARTIAL          | `/root`                         | P5-BE-03           | Current Angular branch  | Dual verification/ACK works; signed transfer voucher and explicit vault-balance authority remain                         | 2026-09-10 |
| P6-BE-01  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P5 gate            | Current backend branch  | Shift state machine, posting stops and permission-separated owner/reviewer transitions implemented                        | 2026-09-10 |
| P6-FE-01  | READY_FOR_REVIEW | `/root`                         | P6-BE-01           | Current Angular branch  | Denomination entry and physical total UI implemented; runtime verification deferred                                       | 2026-09-10 |
| P6-BE-02  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P6-BE-01           | Current backend branch  | Expected cash, variance, same-office approval and Angular response aliases implemented                                    | 2026-09-10 |
| P6-BE-03  | PARTIAL          | `/root/fineract_backend_finish` | P6-BE-02           | Current backend branch  | Cash return and variance GL posting work; six-month unclaimed-overage transfer remains                                    | 2026-09-10 |
| P6-FE-02  | PARTIAL          | `/root`                         | P6-FE-01, P6-BE-02 | Current Angular branch  | Reconciliation works; cheque-deposit evidence, supervisor sign-off, and document attachment remain                       | 2026-09-10 |
| P6-BE-04  | PARTIAL          | `/root/backend_final_audit`     | P6-BE-03           | Current backend branch  | Summary/raw data endpoint exists; five named printable reports and explicit EOD balance result remain                     | 2026-09-10 |
| P7-BE-01  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P1 gate            | Current backend branch  | Office-scoped reversal read model and reversal-specific permissions implemented                                           | 2026-09-10 |
| P7-BE-02  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P7-BE-01, P5 gate  | Current backend branch  | Savings, loan, share and client-charge reversal plus opposite net drawer movement implemented                             | 2026-09-10 |
| P7-FE-01  | PARTIAL          | `/root`                         | P7-BE-02           | Current Angular branch  | Reversal request, electronic filing record, and receipt work; independent Audit co-approval remains                       | 2026-09-10 |
| P8-BE-01  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P5-BE-01           | Current backend branch  | Configurable CTR threshold and rolling structuring evaluation statically audited                                          | 2026-09-10 |
| P8-BE-02  | READY_FOR_REVIEW | `/root/backend_final_audit`     | P8-BE-01           | Current backend branch  | Immutable-office case/history/decision model and restricted endpoints implemented                                         | 2026-09-10 |
| P8-FE-01  | PARTIAL          | `/root`                         | P8-BE-02           | Current Angular branch  | Compliance review works; the cashier-facing CTR form required by the source flow remains                                 | 2026-09-10 |
| P8-FE-02  | PARTIAL          | `/root`                         | P2-P7 gates        | Current Angular branch  | Receipts/checkpoints/queue status exist; actual artifacts, attachments, and notification delivery remain                 | 2026-09-10 |
| P8-OPS-01 | PARTIAL          | `/root` + backend agent         | All implementation | Current worktrees       | Configuration guide exists; exact-flow gaps and runtime acceptance remain                                                 | 2026-09-10 |

## 8. Lean Verification Policy

Testing must protect financial correctness without repeatedly running expensive suites.

### Per work item

- Format only changed files.
- Run the narrowest applicable lint or compile check.
- Add or run focused tests only for changed financial rules, authorization, idempotency, reversal, or reconciliation behavior.
- Do not run coverage unless explicitly requested.
- Do not rerun unrelated tests.

### Phase gate

- Run targeted Angular tests for the phase's components and services.
- Run targeted Fineract module tests for changed services/resources.
- Run one end-to-end happy path and the critical failure paths named in the phase gate.
- Run the full repository suites only before final release or when a cross-cutting change justifies them.

### Mandatory critical scenarios

The following cannot be accepted by visual inspection alone:

- Duplicate submission does not double-post.
- Insufficient balance or drawer cash cannot post.
- An unauthorized or wrong-role user cannot approve.
- The same vault officer cannot satisfy both controls.
- Concurrent daily-limit requests cannot exceed the limit.
- Reversal changes product accounting and drawer movement exactly once.
- Reconciliation cannot close with unresolved required approval.
- A CTR/AML flag cannot be silently skipped when policy blocks posting.

## 9. Agent Handoff Protocol

Every agent starting a new session must:

1. Read `Teller_Process_Flow.md`, this master plan, the repository `AGENTS.md`, and relevant security/contribution instructions.
2. Inspect `git status` in both repositories before touching files.
3. Select one unblocked tracker item and change it to `IN_PROGRESS` with agent name, branch, and date.
4. Confirm its dependencies are `DONE`; otherwise choose another item.
5. Restrict edits to the selected work item and preserve unrelated dirty changes.
6. Record API/schema decisions in the Decision Log before depending on them elsewhere.
7. Apply the lean verification policy.
8. Update the tracker to `READY_FOR_REVIEW` or `BLOCKED`, including exact evidence and the next action.
9. Add a Session Log entry summarizing files changed, commands run, results, risks, and continuation point.
10. Never mark a phase complete until every phase item is `DONE` and its gate evidence is recorded.

Parallel agents must own different work items and must not edit the same files. Backend contract work precedes dependent Angular integration.

## 10. Decision Log

| Date       | Decision                                                                     | Reason                                                                    | Impact                                                                                            |
| ---------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 2026-09-10 | `Teller_Process_Flow.md` is the acceptance source of truth.                  | It contains the exact requested operational process.                      | UI labels alone do not qualify a workflow as complete.                                            |
| 2026-09-10 | `cbspewosaV2` is excluded.                                                   | It is strictly the member portal; its teller implementation was rejected. | Teller agents must not modify or integrate with it.                                               |
| 2026-09-10 | Angular is the only teller UI.                                               | Product direction.                                                        | Cashier, Chief Teller, Vault Officer, supervisor, and compliance experiences live in the web app. |
| 2026-09-10 | Fineract remains the transaction/accounting authority.                       | Prevent duplicated banking logic and insecure frontend enforcement.       | Standard APIs and product accounting must be reused.                                              |
| 2026-09-10 | Verification is targeted per work item and broader only at phase gates.      | Reduce time and output while preserving financial correctness.            | Agents must not repeatedly run full suites or coverage.                                           |
| 2026-09-10 | Upstream Jira/branch metadata is not required for this local implementation. | The work is being completed directly in the user's repositories.          | Jira naming becomes applicable only if the user later requests an upstream pull request.          |
| 2026-09-10 | A completed reversal record satisfies reversal-document filing.             | The stored record contains the original link, reason, approvals, timestamps, reversing IDs, and printable evidence; image upload is not required. | Reversal filing is Full; only the separate Audit co-approval gap remains. |
| 2026-09-10 | Forex approval is Not Applicable.                                           | PEWOSA tellers do not process forex transactions.                          | The USD 10,000 Operations Manager rule is excluded from implementation scope.                       |
| 2026-09-10 | EOD database backup/archive is outside teller UI scope.                      | Fineract retains electronic records; infrastructure owns scheduled database backup and recovery. | The item is Not Applicable to teller implementation and is removed from pending work.               |
| 2026-09-10 | PEWOSA does not charge a cash-deposit fee.                                  | The source flow makes the fee conditional, and current Fineract has no dedicated deposit-transaction fee type. | Deposit charge is zero, net credit equals cash received, and no custom deposit-fee implementation is pending. |

## 11. Session Log

Append new entries; do not rewrite prior entries.

### 2026-09-10 — Discovery and planning

- Read and accepted `Teller_Process_Flow.md` as the exact workflow specification.
- Audited the complete Angular application and local `pewosa-fineract` fork.
- Corrected the architecture to exclude `cbspewosaV2`.
- Confirmed substantial reusable Angular/Fineract functionality, with missing teller orchestration and controls documented in phases above.
- Created this master plan and tracker.
- No implementation phase has been accepted as complete.

### 2026-09-10 — Angular teller workflow implementation

- Implemented role-routed Cashier, Chief Teller, Vault Officer, Compliance Officer, and Loan Officer workspaces.
- Added typed teller API integration, transaction recovery, cash/payment-rail preflight, approvals, drawer movements, shifts, reversals, compliance cases, notifications, and onboarding state.
- Completed the approved-loan instruction queue, server-derived loan deduction preview, loan-schedule action, share certificate/receipt, and supervisor reversal authorization UI.
- Added the multi-SACCO configuration and rollout guide and updated frontend tracker items to `READY_FOR_REVIEW`.
- Formatted only changed implementation and documentation files; `git diff --check` passed.
- Per user instruction, did not run Angular/Fineract builds or test suites. Runtime and financial-control verification remain a final phase-gate activity.

### 2026-09-10 — Fineract final static audit

- Verified same-office access snapshots and separated cashier self-service from permission-gated Chief Teller shift review.
- Verified explicit cash/non-cash rails, idempotent core event linkage, share and client-fee wrappers, reversal dispatch, notification permissions, compliance decisions, and onboarding history.
- Corrected loan reversal command identifiers and aligned loan drawer checks/posting with authoritative net disbursement while retaining gross principal for loan rules and idempotency.
- Parsed changelogs `0243`–`0245`, confirmed their inclusion, and passed backend whitespace/static contract checks.
- Per user instruction, did not run Gradle, builds, tests, dependency downloads, or network operations.

## 12. Completion Checklist

The program is complete only when:

- All tracker items are `DONE`.
- All nine phase gates have recorded evidence.
- Every step and decision branch in workflows 2.1 through 2.11 is mapped to implemented UI, backend enforcement, or an explicitly recorded physical/manual confirmation.
- Cash movements reconcile with Fineract product transactions and accounting.
- Approval, limit, reversal, EOD, CTR, and AML rules cannot be bypassed from the client.
- Required roles, payment types, accounts, thresholds, denominations, reports, and notifications are configurable for a new office.
- Before and after screenshots have been captured manually for UI pull-request approval.
