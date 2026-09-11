# Teller Process Flow — Step-by-Step Verification

Date: 2026-09-10  
Acceptance source: `C:\Users\HP\Desktop\mifos\Teller_Process_Flow.md`  
Teller UI: `cbs-pewosa-web-app`  
Transaction authority: `pewosa-fineract`  
Excluded member portal: `cbspewosaV2`

## Verdict

No — the complete document is **not yet implemented exactly as written**.

The transaction foundation is substantial and the principal cash operations exist, but the static re-audit found several workflow outcomes represented only by a manual checkbox, an existing core screen, a configuration requirement, or a queued notification. Those are correctly classified as **Partial**, not Full.

| Classification | Steps | Meaning |
| --- | ---: | --- |
| Full | 59 | UI and server/core behavior needed by the step are present. Physical counter actions may be recorded as explicit teller confirmations. |
| Partial | 41 | Some of the step exists, but at least one required outcome, enforcement, payment rail, artifact, or integration is absent. |
| Missing | 0 | No completely unimplemented applicable requirement remains. |
| Existing core/manual prerequisite | 2 | The event happens outside the new teller workflow and is consumed by it. |
| Not Applicable | 2 | The business owner confirmed that the requirement is outside the PEWOSA teller application scope. |
| **Total checked** | **104** | Every numbered workflow step plus every approval-matrix row was checked. |

This is a static source audit. In accordance with the user's instruction, no Angular build, Gradle build, automated test suite, or runtime transaction was run.

## Classification rules

- **Full**: the workflow can perform the stated outcome, with server-side enforcement where money, authorization, limits, or accounting are involved.
- **Partial**: a checkbox does not prove that a device action, document generation, external delivery, or accounting action occurred.
- **Missing**: no matching path was found in either teller UI or the PEWOSA Fineract extensions.
- **Existing core/manual prerequisite**: a valid precondition supplied by the standard Fineract modules or an external committee/process; it is not newly implemented in the teller workspace.
- **Not Applicable**: explicitly excluded by the business owner and therefore not an implementation gap.
- Existing mobile-money processing is accepted as already available in the member channel, as directed. It is not counted as a teller cash/cheque/mobile selector where the source document explicitly requires one.

## 2.1 Member Onboarding

| Step | Status | Verification |
| --- | --- | --- |
| 1. Member inquiry | Partial | The onboarding screen accepts National ID and mobile. The backend rejects an existing client or draft as a duplicate, but the UI does not search and route an existing member directly to transactions. |
| 2. Capture bio-data | Partial | The wizard opens the standard Fineract client-creation flow and links the created active client back. Standard name, DOB, gender, contact, identifiers, and address fields exist; dedicated occupation, employer, and income fields were not found in this path. |
| 3. Biometrics and photo | Partial | Onboarding has photo, signature, and fingerprint checkboxes. Standard client photo/signature facilities exist elsewhere, but the wizard does not capture/upload evidence and no fingerprint-device integration was found. |
| 4. Beneficiaries | Full | UI requires active beneficiaries and exactly 100% allocation; backend also enforces at least one record and a 100% active total before completion. |
| 5. Create member record | Partial | A same-office active Fineract client must be linked and changes are audited. The required `SACCO/YYYY/NNNN` member-number generator was not found. |
| 6. Membership fee | Partial | Cash collection can use the teller client-charge wrapper, core accounting, drawer posting, approval, and receipt. The onboarding step itself is manually linked, and teller cheque/mobile collection plus a dedicated membership-fee configuration contract are absent. |
| 7. Annual subscription | Partial | It can be represented by a Fineract charge and recorded in onboarding history. Exact annual-subscription calculation and teller cheque/mobile rails are not implemented in the onboarding workflow. |
| 8. Purchase shares | Full | Cash share purchase uses the core share account, validates the core amount, requires configured approval, posts one drawer receipt, updates the share account, and prints a two-copy certificate/receipt view. |
| 9. Open savings account | Partial | Standard Fineract savings-account creation and deposit functions exist. Onboarding only records status/reference/entity ID; it does not create the account, enforce `010-YYYY-NNNN`, or automatically post an optional initial deposit. |
| 10. Member card and passbook | Partial | Completion checkboxes exist, but no member-card or passbook generation/printing implementation was found. |
| 11. Digital enrollment | Partial | Mobile-banking and SMS checkboxes exist and the separate member mobile-money channel is already available. No teller-side enrollment call or mobile-PIN operation was found. |
| 12. Complete onboarding | Partial | The backend requires a linked client, 100% beneficiaries, and all submitted checklist flags, then records completion/audit metadata. Welcome-pack printing and document filing are acknowledgements only, not generated or stored artifacts. |

Evidence: `cashier-onboarding.component.ts/.html`, `clients/create-client/create-client.component.ts`, `clients/client-stepper/`, and `PewosaTellerWorkflowServiceImpl.createOnboarding/updateOnboarding/completeOnboarding`.

## 2.2 Cash Deposit

| Step | Status | Verification |
| --- | --- | --- |
| 1. Present slip and cash | Full | Cashier deposit entry requires a slip/voucher reference and physical cash count. |
| 2. Verify member, account, slip, and words/figures | Full | Identity method, slip-complete, and amount-match confirmations exist; server preflight locks and validates the savings account and client/office relationship. |
| 3. Count and authenticate cash | Full | Counted amount must match and the teller must confirm member-present counting/authenticity before review. A mismatch prevents preparation. |
| 4. Enter and validate transaction | Full | Account, amount, narration, cash payment type, active/frozen state, precision, shift, and configured limit rules are checked before posting. |
| 5. Calculate deposit charges and net | Full | The source requirement applies only “if applicable.” The business owner confirmed that PEWOSA does not charge a cash-deposit fee; therefore charge is zero and the full received amount is the net credit. No custom deposit-fee engine is required. |
| 6. Double-entry posting | Full | Standard Fineract savings deposit remains the accounting authority; the posted product event creates one linked inward drawer movement. |
| 7. Update balances and drawer | Full | Fineract updates savings/running balances and the linked drawer movement updates teller cash. |
| 8. Print two-copy signed receipt | Full | Member and office copies are rendered and the office copy contains a member-signature line. |
| 9. Stamp and file voucher | Partial | The slip reference is retained and EOD has a deposit-slip checklist, but there is no per-transaction stamped/filed acknowledgement or document attachment. |
| 10. Send notification | Partial | A notification queue and status lifecycle exist. No actual SMS transport/provider sender was found in this implementation, so “sent” cannot be verified from source. |
| 11. CTR check and teller prompt | Partial | Configurable CTR thresholds create a blocking compliance case. A compliance-officer review screen exists, but the cashier has no CTR form to complete. |

## 2.3 Cash Withdrawal

| Step | Status | Verification |
| --- | --- | --- |
| 1. Present slip and ID | Full | Withdrawal requires identity evidence and a slip/voucher reference. |
| 2. Verify identity, signature, status, freeze | Full | Identity and signature confirmations exist; backend checks active status and debit-freeze states. |
| 3. Enter and validate | Partial | Amount, daily/monthly rules, teller approvals, minimum balance, and drawer sufficiency exist. Available balance is checked against requested cash, not explicitly against `amount + previewed charges`. |
| 4. Calculate charge and total deduction | Partial | No withdrawal-fee/total-deduction preview is shown in the cashier transaction review. |
| 5. Obtain approval | Full | Configured role approvals are server-created, role-gated, audited, and surfaced in the Chief Teller inbox; the cashier can recover/retry the same controlled transaction. |
| 6. Double-entry posting | Full | Fineract posts the savings withdrawal and product accounting; the product event posts one outward drawer movement. |
| 7. Update balances and drawer | Full | Savings balances are updated by Fineract and cash-out is linked to the drawer record. |
| 8. Count cash out | Full | Cash count must match and drawer availability is checked. |
| 9. Hand cash to member | Full | This physical handover is represented by the teller's confirmed count and final post action. |
| 10. Print signed receipt | Full | Two copies and the member-signature line are present. |
| 11. Send notification | Partial | Queue/status exists; actual SMS delivery is not implemented here. |
| 12. CTR threshold | Partial | Threshold/case enforcement exists, but no cashier CTR capture form exists. |

## 2.4 Loan Disbursement

| Step | Status | Verification |
| --- | --- | --- |
| 1. Committee approval | Existing core/manual prerequisite | Standard Fineract loan approval is outside the teller workflow. Cashier consumes only loans with approved status. |
| 2. Receive and verify instruction | Full | Server-filtered approved-loan queue, identity evidence, approval confirmation, status check, and already-disbursed amount control exist. |
| 3. Select cash, cheque, or account credit | Full | Cash, cheque, and direct-to-savings modes are present, with cheque number/bank fields and explicit payment types. |
| 4. Validate policy conditions | Partial | Approved status/remaining approved principal are server-enforced. Client-active state, “no active loan” policy, and actual collateral records are not server-validated by this teller preflight; collateral is a teller checkbox. |
| 5. Itemize deductions and net | Partial | Approved principal, aggregate configured deductions, and authoritative net disbursement are displayed. Processing, insurance, and form fees are not itemized. |
| 6. Double-entry posting | Full | Core Fineract disbursement/accounting is used for cash, cheque, and savings-credit modes. |
| 7. Update loan, schedule, and drawer | Full | Core disbursement activates the loan and schedule; cash mode uses authoritative `net_disbursal_amount` for drawer sufficiency/posting. |
| 8. Count cash or prepare cheque | Full | Cash count is enforced for cash; cheque details are enforced for cheque mode. |
| 9. Sign agreement and voucher | Partial | Required document/agreement confirmation is a checkbox, with no attached document or captured signature. |
| 10. Print receipt and schedule | Full | Two-copy receipt and a direct repayment-schedule print/open action exist. |
| 11. Send notification | Partial | Queue/status exists; transport delivery is not implemented here. |

## 2.5 Loan Repayment

| Step | Status | Verification |
| --- | --- | --- |
| 1. Receive cash/cheque/mobile | Partial | Cash repayment is implemented in the cashier portal. Mobile money is handled by the existing member channel as directed; teller cheque repayment is not present. |
| 2. Verify member and loan | Full | Member selection, identity evidence, account ownership, active loan status, currency, and outstanding balance are validated. |
| 3. Enter repayment amount | Full | Positive amount, precision, outstanding limit, cash count, and narration are enforced. |
| 4. Determine allocation order | Full | Fineract loan-product configuration remains authoritative for allocation order. |
| 5. Allocate payment | Full | Core repayment result is fetched and exposes principal, interest, fees, penalties, and remaining balance. |
| 6. Update schedule | Full | Standard Fineract repayment updates installments and loan totals. |
| 7. Double-entry posting | Full | Fineract handles loan accounting; cash repayment creates one linked inward drawer movement. |
| 8. Handle fully paid loan | Partial | Fineract closes a fully repaid loan. No explicit teller confirmation of collateral release was found, and notification is only queued. |
| 9. Print receipt | Full | Two-copy receipt includes the returned allocation details. |
| 10. Send notification | Partial | Queue/status is implemented; actual SMS transport is not. |

## 2.6 Purchase of Shares

| Step | Status | Verification |
| --- | --- | --- |
| 1. Member request | Full | Share purchase is a cashier action. |
| 2. Verify identity | Full | Identity evidence is required. |
| 3. Enter amount | Full | Share account, whole-number quantity, live price, and cash amount are captured. |
| 4. Validate limits and status | Full | Core share account/product validation is used and teller preflight verifies account ownership/status/office. |
| 5. Double-entry posting | Full | Core share approval posts product accounting; cash is posted once to the drawer. |
| 6. Update shares and drawer | Full | Core share balance and approved holdings update, linked to the teller cash movement. |
| 7. Print certificate/receipt | Partial | A printable two-copy “Share certificate / receipt” exists, but it is a generic transaction receipt rather than a dedicated certificate artifact/template. |
| 8. Send notification | Partial | Queue/status exists; actual SMS transport is not present here. |

## 2.7 End-of-Day Reconciliation

| Step | Status | Verification |
| --- | --- | --- |
| 1. Stop transactions | Full | `STOP` changes the shift state and cash preflight requires an open shift. |
| 2. Count denominations | Full | Denomination rows and calculated physical total exist in UI and backend. |
| 3. Retrieve system cash position | Full | Server calculates drawer availability from opening allocations, receipts, payments, and settlements. |
| 4. Compare and handle variance | Partial | Variance type/explanation, supervisor separation, shortage/overage drawer transaction, and balanced GL journal are implemented. Disciplinary handling is external policy, and automatic transfer of unclaimed overage to income after six months is missing. |
| 5. Prepare return voucher | Full | Reconciliation creates a teller-to-vault movement carrying the physical amount and denomination breakdown; dual authenticated verification is required. |
| 6. Return cash to vault | Partial | Two distinct vault officers verify and the teller acknowledges; core settlement updates the drawer. Officer identities/timestamps substitute for credentials, but no signed voucher artifact or separate vault-balance ledger was found. |
| 7. Submit vouchers | Partial | Deposit slips, withdrawal slips, loan documents, and expense vouchers are required checkboxes. The required cheque-deposit item is absent and no documents are attached. |
| 8. Supervisor review | Partial | A different authorized user approves and can view report data. There are no explicit “all transactions posted/supporting documents verified” confirmations or reconciliation-report signature. |
| 9. Close drawer | Full | Close is blocked until reconciliation and linked cash-return acknowledgement; status becomes `CLOSED`. |
| 10. Generate five reports | Partial | One report endpoint returns shift summary, teller transactions, drawer movements, variance, and journal IDs. It is not five separately structured/printable reports. |
| 11. Batch GL and verify balance | Partial | Product transactions post through Fineract and the variance journal contains equal debit/credit lines. No EOD batch-post command or explicit debit-equals-credit verification/report exists. |
| 12. Backup and archive | Not Applicable | The business owner confirmed that database backup is a deployment/operations responsibility, not a teller-portal action. Fineract retains the transaction, accounting, reversal, audit, shift, and reconciliation records used as the electronic archive. |

## 2.8 Transaction Reversal

| Step | Status | Verification |
| --- | --- | --- |
| 1. Discover error | Existing core/manual prerequisite | Error discovery is an operational event; transaction records/search support the next action. |
| 2. Initiate reversal | Full | Cashier searches by immutable teller reference, reviews original evidence, and supplies a required reason. |
| 3. Validate eligibility | Full | Server requires posted state, supported reversible core transaction, same business day, same office, and dedicated permissions. |
| 4. Create reversing entries | Full | Savings, repayment, disbursement, share, and client-charge reversals call core services and create the opposite drawer movement with linked references. |
| 5. Update statuses and balances | Full | Core balances are reversed, the original teller control becomes `REVERSED`, and reversal IDs are retained. |
| 6. Supervisor and Audit approval | Partial | Separate requester/approver and supervisor permission are implemented. A second Audit approval required by the special matrix is not. |
| 7. Print reversal receipt | Full | A printable reversal record is available. |
| 8. File documentation | Full | A completed reversal is retained as the electronic filing record: it links the original and reversal references, reason, requester, approver, timestamps, product reversal, opposite drawer movement, status, and printable record. The business owner confirmed that slip-image upload is not required. |

## 2.9 Dual-Control Cash Movement

| Step | Status | Verification |
| --- | --- | --- |
| 1. Teller requests cash | Full | Amount, denomination breakdown, currency, and note are captured and totals must match. |
| 2. Create pending vault-to-teller request | Full | Server stores `PENDING`, movement type, cashier, requester, amount, denominations, and audit timestamps. |
| 3. Officer 1 verifies | Full | Authenticated non-requester verification records the first officer and timestamp. |
| 4. Different officer 2 verifies | Full | Backend rejects reuse of officer 1 and records officer 2 independently. |
| 5. Complete balances and audit | Partial | Core teller allocation/settlement updates the drawer and all actors/timestamps are stored. No separate PEWOSA vault-balance ledger update was found. |
| 6. Both sign voucher | Partial | Authenticated officer identity/timestamps exist, but no printable signed transfer voucher or signature capture exists. |
| 7. Teller confirms receipt | Full | The owning cashier independently acknowledges only after completion and sees the denomination breakdown. |

## 2.10 Approval Matrix

| Rule | Status | Verification |
| --- | --- | --- |
| Amount bands: teller / Head Teller / Branch Manager / Operations Manager / CEO-Board | Partial | The engine supports configurable amount ranges and required roles, including multiple matching rules. The exact UGX bands are not seeded by code and must be configured per SACCO before they operate. |
| Transaction reversal → Supervisor + Audit | Partial | Supervisor separation exists; independent Audit co-approval does not. |
| Account freeze → Branch Manager | Partial | Standard savings block/unblock actions exist outside Cashier. This teller approval engine does not enforce the stated Branch Manager approval for them. |
| Loan write-off → Board Committee | Partial | Standard Fineract loan write-off/maker-checker capability exists outside this workflow. The stated Board Committee rule is not wired into the PEWOSA teller matrix. |
| Shortage over 500,000 → Branch Manager + Audit | Partial | Configurable cash-variance roles exist, but the current implementation requires the approving user to hold every matched role; it does not record two independent Branch Manager and Audit decisions. |
| Forex over USD 10,000 → Operations Manager | Not Applicable | The business owner confirmed that PEWOSA tellers do not process forex transactions, so this approval rule is excluded. |

## 2.11 Daily Limit Enforcement

| Step | Status | Verification |
| --- | --- | --- |
| 1. Teller single-transaction limit | Full | Configurable threshold can hard-block or create a role approval. |
| 2. Member daily withdrawal limit | Full | Posted same-day member cash-out is aggregated and a breach is rejected. |
| 3. Member monthly limit | Full | Posted monthly member cash-out is aggregated and can hard-block or create configured manager approval. |
| 4. Minimum balance | Full | Locked savings snapshot subtracts held funds and rejects a withdrawal below required minimum balance. |
| 5. Teller cash-holding limit | Full | A deposit/cash-in that exceeds the configured holding threshold returns `CASH_RETURN_REQUIRED`. |
| 6. CTR threshold | Partial | Threshold enforcement and a compliance case exist, but the required teller CTR form/prompt is absent. |
| 7. AML structuring | Full | Posted same-day member totals are accumulated for sub-threshold transactions and create a blocking AML/STR case when the configured threshold is crossed. |

## Remaining implementation work, in priority order

### P0 — Financial and approval correctness

1. Add the withdrawal charge/total-deduction preview and validate withdrawal affordability against cash plus charges.
2. Implement two-person approvals where the document uses `Role A + Role B`, especially reversal and large shortage.
3. Add teller CTR capture and link it to the compliance case before release.
4. Decide and implement vault-balance authority, rather than updating only the teller allocation side.
5. Add server validation for member-active, active-loan policy, and actual collateral/document readiness before disbursement.

### P1 — Exact operational artifacts

1. Generate/attach transfer vouchers, member cards, passbooks, welcome packs, and a real share certificate.
2. Add the missing cheque-deposit EOD checklist item and supervisor evidence/sign-off fields.
3. Produce the five named EOD report views/exports and explicit balancing result.
4. Implement the six-month unclaimed-overage transfer process.

### P2 — Onboarding and payment-mode completeness

1. Route existing-member inquiry to member transactions instead of returning only a duplicate error.
2. Add occupation, employer, and income data using configured datatables or supported client fields.
3. Implement actual photo/signature/fingerprint evidence capture or explicitly remove unsupported biometric requirements from acceptance.
4. Implement required member/savings number formats.
5. Turn onboarding financial steps into actions or verified links instead of manually entered status.
6. Add missing teller cheque rails; retain existing member mobile-money processing without duplicating it.
7. Integrate an actual notification sender and delivery result, not only a queue record.

## Evidence map

| Area | Main evidence |
| --- | --- |
| Cashier transactions, receipts, EOD, reversal UI | `src/app/staff-workspaces/cashier-workspace.component.ts` and `.html` |
| Onboarding UI | `src/app/staff-workspaces/cashier-onboarding.component.ts` and `.html` |
| Chief Teller approvals/reports | `src/app/staff-workspaces/chief-teller-workspace.component.ts` and `.html` |
| Vault dual control | `src/app/staff-workspaces/vault-officer-workspace.component.ts` and `.html` |
| CTR/AML review | `src/app/staff-workspaces/compliance-workspace.component.ts` and `.html` |
| Angular API/state contracts | `src/app/staff-workspaces/teller-api.service.ts`, `teller-api.models.ts`, and `teller-transaction-state.service.ts` |
| Core client/savings/loan/share screens | `src/app/clients/`, `src/app/savings/`, `src/app/loans/`, and `src/app/shares/` |
| Server limits/account checks | `fineract-provider/src/main/java/org/apache/fineract/pewosa/service/PewosaTellerControlServiceImpl.java` |
| Server shifts, movement, reversal, onboarding, compliance | `fineract-provider/src/main/java/org/apache/fineract/pewosa/service/PewosaTellerWorkflowServiceImpl.java` |
| Product-to-drawer linkage | `fineract-provider/src/main/java/org/apache/fineract/organisation/teller/service/CashierProductTransactionEventService.java` |
| Schema/audit records | `fineract-provider/src/main/resources/db/changelog/tenant/parts/0243_pewosa_teller_controls.xml` through `0245_pewosa_teller_workflows.xml` |

## Final acceptance statement

The current implementation is a strong functional foundation, but it is **not accurate to say that every applicable requirement in `Teller_Process_Flow.md` is fully implemented** because Partial rows remain. There are now no completely Missing rows: completed reversal records satisfy electronic filing, forex is excluded, and EOD database backup/archive is an operations responsibility outside the teller UI. Acceptance should remain open until the Partial rows are resolved or explicitly accepted by the business owner.
