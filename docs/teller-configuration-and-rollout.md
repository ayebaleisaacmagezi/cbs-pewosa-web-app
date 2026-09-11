# Teller Configuration and Rollout Guide

## Purpose

This guide configures the teller workflows for a new SACCO or office without changing source code. Apache Fineract remains the authority for members, accounts, transactions, accounting, offices, staff, roles, currencies, payment types, business dates, and audit history. The Angular staff workspaces provide the operational experience.

Do not reuse member-portal mobile-money configuration for teller cash. Mobile money is a non-cash rail and must not change a cashier drawer.

## 1. Tenant and Office Preparation

1. Create or confirm the tenant and its data source.
2. Configure the tenant currency or currencies in Fineract.
3. Create the office hierarchy and staff records.
4. Set the business date and working days.
5. Configure savings, loan, share, and charge products with their accounting mappings.
6. Confirm that each financial product is available in the intended offices.

No currency code, SACCO name, monetary threshold, or office identifier should be hard-coded in Angular.

## 2. Staff Roles

Create these operational roles as needed:

| Role               | Workspace                              | Main responsibility                                                                                   |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Cashier            | `/staff-workspaces/cashier`            | Member onboarding, counter transactions, drawer requests, reconciliation, reversal requests, receipts |
| Chief Teller       | `/staff-workspaces/chief-teller`       | Drawer allocation/recovery, transaction approvals, reconciliation approval                            |
| Vault Officer      | `/staff-workspaces/vault-officer`      | Independent denomination verification of vault cash movements                                         |
| Compliance Officer | `/staff-workspaces/compliance-officer` | CTR/STR review, filing, dismissal, and escalation                                                     |
| Loan Officer       | `/staff-workspaces/loan-officer`       | Loan applications and member credit work                                                              |

Use separate named users for dual control. Never share accounts or assign both required vault verification actions to the same person.

### Extension permissions

Assign the minimum permissions appropriate to each role:

- `CREATE_PEWOSATELLERTRANSACTION`, `READ_PEWOSATELLERTRANSACTION`
- `APPROVE_PEWOSATELLERTRANSACTION`
- `CREATE_PEWOSATELLERSHIFT`, `UPDATE_PEWOSATELLERSHIFT`, `READ_PEWOSATELLERSHIFT`
- `CREATE_PEWOSACASHMOVEMENT`, `APPROVE_PEWOSACASHMOVEMENT`, `UPDATE_PEWOSACASHMOVEMENT`, `READ_PEWOSACASHMOVEMENT`
- `CREATE_PEWOSATELLERREVERSAL`, `APPROVE_PEWOSATELLERREVERSAL`
- `READ_PEWOSACOMPLIANCECASE`, `UPDATE_PEWOSACOMPLIANCECASE`
- `CREATE_PEWOSAONBOARDING`, `UPDATE_PEWOSAONBOARDING`, `READ_PEWOSAONBOARDING`

Also assign the existing Fineract permissions required for clients, identifiers, documents, images, savings transactions, loan transactions, share transactions, client charges, tellers, cashiers, and reports. Confirm permissions with a non-administrator user for every role.

## 3. Teller and Cashier Assignment

1. Create an active teller for the office.
2. Assign each cashier staff record to that teller with valid start and end dates.
3. Confirm the cashier assignment is active on the business date.
4. Allocate opening cash through the controlled cash-movement workflow.
5. Require the cashier to acknowledge the physically received denominations.

The staff user, cashier assignment, office, teller, shift, and currency must agree. Do not bypass a missing assignment by granting administrator access.

## 4. Payment Types and Rails

Configure payment types centrally in Fineract:

| Example type      | `isCashPayment` | Drawer effect                                   |
| ----------------- | --------------- | ----------------------------------------------- |
| Physical cash     | Yes             | Inward or outward, depending on the transaction |
| Cheque            | No              | None                                            |
| Bank transfer     | No              | None                                            |
| Mobile money      | No              | None                                            |
| Direct to savings | No              | None                                            |

Only an explicitly configured cash payment type may affect the drawer. Ensure a cash payment type exists before enabling teller deposits, withdrawals, repayments, cash disbursements, share purchases, or fee payments.

## 5. Configurable Rules and Approval Matrix

Create teller rules per office, currency, operation type, amount band, role, and effective period. Configure rather than code:

- Teller single-transaction limit
- Member daily and monthly withdrawal limits
- Required minimum savings balance
- Maximum drawer holding
- Approval thresholds and approver roles
- Share holding and purchase limits
- Reversal eligibility period
- CTR threshold
- Structuring/AML rolling window and threshold

Review overlapping rules carefully. The most restrictive applicable rule must not be weakened by another active rule. Changes require an effective date and an audit trail.

Supported preflight outcomes are `ALLOWED`, `REJECTED`, `APPROVAL_REQUIRED`, `CASH_RETURN_REQUIRED`, and `REPORT_REQUIRED`.

## 6. Denominations and Vault Controls

Configure valid denominations for each currency. Operational staff must count physical cash by denomination for:

- Vault-to-teller allocation
- Teller-to-vault return
- Teller receipt acknowledgement
- End-of-day reconciliation

A vault movement requires two different authorized verifiers. The cashier acknowledges only after physically recounting the cash. Retain the movement reference on the printed voucher.

## 7. Accounting Configuration

Complete and validate the normal Fineract product accounting before teller rollout. Additionally configure financial activity accounts for:

- Teller cash or cash-on-hand
- Vault cash
- Cash shortage
- Cash overage
- Applicable fee income and receivables
- Share capital

Use the tenant chart of accounts. Never put GL account IDs in Angular. Test balanced, shortage, and overage reconciliation in a non-production tenant before go-live.

## 8. Compliance

Assign compliance permissions only to authorized staff. Configure tenant-specific CTR and structuring rules. Compliance cases use these states:

- `OPEN`
- `IN_REVIEW`
- `FILED` with `CTR_FILED` or `STR_FILED`
- `DISMISSED` with `FALSE_POSITIVE` or `NO_REPORT_REQUIRED`
- `ESCALATED` with `ESCALATED`

A `REPORT_REQUIRED` transaction remains blocked until linked cases are filed or dismissed and required approvals are complete. Protect case evidence and history from general cashier access.

## 9. Notifications

Configure the tenant SMS provider and member mobile numbers using existing deployment facilities. Financial posting must not be rolled back or duplicated because notification delivery fails. The transaction detail response exposes notification state separately as `PENDING`, `SENT`, or `FAILED`.

Monitor failed notifications and retry them through an authorized integration process using the original teller transaction reference.

## 10. Onboarding

Configure required client identifiers, address fields, documents, images, charges, share products, and savings products before enabling cashier onboarding. National ID and mobile uniqueness are enforced server-side. Beneficiaries are append/deactivate records; do not delete their audit history. Active beneficiary allocations must total exactly 100% before completion.

Member mobile-money enrolment remains in the member platform and is not reimplemented by the teller portal.

## 11. Deployment Configuration

- Angular connects to Fineract through the existing API interceptor and `/pewosa/teller` application path, which resolves to `/v1/pewosa/teller` on the server.
- Use the existing proxy configuration for local development.
- Keep tenant branding and supported currencies in the existing environment/customization configuration.
- Apply the additive Fineract Liquibase migrations before enabling the workspaces.
- Back up the tenant database before production migration.
- Do not expose the teller extension endpoints without authentication and role permissions.

## 12. Go-Live Checklist

- [ ] Tenant, offices, currencies, business date, and working days verified
- [ ] Products and GL mappings verified
- [ ] Cash, cheque, transfer, and mobile-money payment rails classified correctly
- [ ] Named staff users and least-privilege roles assigned
- [ ] Teller/cashier assignments active for the business date
- [ ] Approval and limit rules approved by management
- [ ] CTR/AML rules approved by compliance
- [ ] Denominations configured for every enabled currency
- [ ] Two different vault officers available for dual control
- [ ] Opening cash allocation and cashier acknowledgement rehearsed
- [ ] Deposit, withdrawal, repayment, disbursement, shares, and fee flows reconciled
- [ ] Zero, shortage, and overage EOD cases rehearsed
- [ ] Reversal approval and receipt rehearsed
- [ ] SMS success and failure states observed
- [ ] Before and after UI screenshots captured for the pull request
- [ ] Final Angular and Fineract verification completed once, at the release gate

## 13. Release Evidence

Record the tenant, office, rule IDs, enabled currencies, payment-type IDs, role-permission export, test transaction references, reconciliation reference, reversal reference, compliance case reference, migration version, Angular commit, and Fineract commit in the release handoff. Do not include member secrets or identity documents.
