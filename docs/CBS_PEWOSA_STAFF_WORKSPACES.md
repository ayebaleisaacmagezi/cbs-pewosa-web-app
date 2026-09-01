# CBS PEWOSA staff workspaces

This release adds focused production workspaces to the Angular Mifos staff portal. Fineract remains the source of truth for members, groups, accounts, financial transactions and teller records.

## Roles

Create or update these roles under **System > Roles and Permissions**. Role names must match exactly:

- `Cashier`
- `Chief Teller`
- `Loan Officer`

Then create a staff-linked application user and assign the appropriate role. A Cashier must also be assigned to an active teller/cashier period before transacting.

### Cashier permissions

Grant the permissions available in the deployed Fineract version that correspond to:

- `READ_CLIENT`, `READ_SAVINGSACCOUNT`, `READ_SHAREACCOUNT`, `READ_CLIENTCHARGE`
- `DEPOSIT_SAVINGSACCOUNT`, `WITHDRAWAL_SAVINGSACCOUNT`
- `APPLYADDITIONAL_SHAREACCOUNT`, `PAY_CLIENTCHARGE`
- `READ_TELLER`, `READ_CASHIER`, `READ_CASHIERS_FOR_TELLER`

The workspace does not use `READ_OFFICE` for member search. It uses the authenticated user's `officeId`.

### Chief Teller permissions

Grant:

- `READ_TELLER`, `READ_CASHIER`, `READ_CASHIERS_FOR_TELLER`
- `ALLOCATECASHIER_TELLER`
- `SETTLECASHFROMCASHIER_TELLER`
- the transaction-summary read permission exposed for tellers/cashiers by the deployed Fineract version

The administrator still creates tellers, cashier assignments and application users.

### Loan Officer permissions

Grant:

- `READ_CLIENT`, `CREATE_CLIENT`
- `READ_GROUP`, `CREATE_GROUP`
- `READ_SAVINGSACCOUNT`, `READ_SHAREACCOUNT`, `READ_CLIENTCHARGE`
- `READ_LOAN`, `CREATE_LOAN`

Do not grant approval or disbursement permissions unless the same employee is formally authorized to perform those duties.

## Accounting behavior

- Savings deposits and withdrawals post through Fineract savings transaction endpoints.
- Member fees post through the client-charge payment endpoint.
- Cash allocations and recoveries post through Fineract teller/cashier endpoints.
- Additional share requests post through the Fineract share-account command.
- Product accounting mappings configured in Fineract create the journal entries; the Angular portal does not manually create debit/credit journal entries.
- Savings-funded share purchases are deliberately not simulated with two frontend requests. Keep that option unavailable until the backend provides one atomic supported operation.

## Controlled acceptance test

Use dedicated test users and approved test accounts.

1. Log in as each role and confirm it is redirected to its own workspace.
2. Confirm member searches work without a `READ offices` error.
3. As Loan Officer, create a test member, create a group with that member, inspect attached products and start a loan application.
4. As Chief Teller, allocate a controlled amount to a test Cashier and confirm the drawer balance changes.
5. As Cashier, post a controlled deposit, withdrawal and fee payment, then verify their Fineract transaction references.
6. Recover the remaining test cash and verify the drawer summary and records.
7. Confirm administrators and managers still receive the full standard Mifos home screen.

Do not retry a financial POST merely because the browser appears slow. First verify whether Fineract already returned or recorded a transaction reference.

## Deployment

Build and deploy the same way as the existing Angular Docker image. On the server, use a versioned image before retagging `custom`:

```bash
cd /root/cbs-pewosa-web-app
git pull --ff-only
docker build -t cbs-pewosa-web-app:staff-workspaces-<commit> .
docker image tag cbs-pewosa-web-app:custom cbs-pewosa-web-app:backup-before-staff-workspaces
docker image tag cbs-pewosa-web-app:staff-workspaces-<commit> cbs-pewosa-web-app:custom
cd /root/mifosx
docker compose up -d --no-deps --force-recreate web-app
docker compose ps web-app
curl -I http://127.0.0.1:8080
```

Rollback only the frontend image if necessary; this does not reverse Fineract transactions already posted.
