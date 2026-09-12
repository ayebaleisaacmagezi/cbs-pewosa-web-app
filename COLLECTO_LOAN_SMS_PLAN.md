# Collecto Loan Payments and SMS Plan
## Status

This document records the agreed design for later implementation. No implementation is included here.

## Existing Components to Reuse

- Collecto API base URL: `https://collecto.cissytech.com/api`
- Existing server-side `CollectoGateway`
- Existing payment queue and payment processor
- Existing Cloudflare payment scheduler
- Existing Fineract integration
- Existing notification history service

Collecto credentials must remain in server environment variables:

- `COLLECTO_BASE_URL`
- `COLLECTO_USERNAME`
- `COLLECTO_API_KEY`

The Angular application and browser must never receive these credentials or call Collecto directly.

## Scheduler Design

Reuse the existing Cloudflare scheduler. On each interval it should independently call:

1. The existing protected payment-processing endpoint.
2. A protected notification-processing endpoint.

The endpoints must run independently so a notification failure cannot stop payment processing. Cloudflare only triggers the work; the PHP server performs all sensitive processing and Collecto calls.

## Loan Repayment Through Collecto

1. The member starts a loan repayment.
2. The server creates a unique, persistent transaction reference.
3. The server calls Collecto `requestToPay`.
4. The payment worker polls `requestToPayStatus` using the original reference.
5. Only after Collecto reports `SUCCESSFUL` does the server post the repayment to Fineract.
6. The server records the Fineract transaction identifier and reconciles the two systems.
7. Temporary or unknown results remain pending; they must not be treated as failed or successful prematurely.

## Loan Disbursement Through Collecto

1. An approved loan is queued for mobile-money payout.
2. The server creates a unique, persistent payout reference.
3. The server calls Collecto `initiatePayout` with `gateway: mobilemoney`.
4. The payment worker polls `payoutStatus` using the same reference.
5. Only `data[0].status = SUCCESSFUL` confirms that money reached the payout process successfully.
6. The server completes or reconciles the corresponding Fineract loan disbursement.
7. If Collecto succeeds but the Fineract update temporarily fails, the worker must retry the Fineract update without repeating the payout.

Loan transactions should reuse the existing payment infrastructure but use explicit loan transaction types. They must not be disguised as ordinary savings withdrawals or deposits.

## SMS Notifications Through Collecto

The server sends SMS using:

`POST {baseUrl}/{username}/sendSingleSMS`

Required body fields:

- `phone`
- `message`
- `reference`

Planned SMS events include:

- Loan application submitted
- Loan approved or rejected
- Loan disbursed
- Repayment received
- Repayment due reminder
- Repayment overdue reminder
- Loan fully repaid or closed

The server should queue messages first. The notification processor then sends them through Collecto and records the result.

Collecto's `data.sms = true` means Collecto accepted the SMS request. It does not prove delivery to the handset because the documented API has no SMS delivery-status endpoint. Store the outcome as `accepted` or `failed`, not `delivered`.

## Notification Record

Each queued notification should retain:

- A unique reference/idempotency key
- Event type
- Related loan and client identifiers
- Masked recipient phone number
- Message content or template identifier
- Queue time and attempt count
- Next retry time
- Collecto transaction identifier, when returned
- Status such as `pending`, `accepted`, or `failed`
- Sanitized error information

The unique reference must prevent the same event or reminder from producing duplicate SMS messages.

## Safety Rules

- Never expose Collecto credentials to the frontend.
- Never treat HTTP 200 alone as a completed financial transaction.
- Never repeat a payout after Collecto has completed it.
- Retry transient network, HTTP 429, and HTTP 5xx failures with bounded backoff.
- Do not retry invalid requests until their data is corrected.
- Keep unknown financial outcomes pending for reconciliation.
- Messaging failures must never roll back or corrupt a completed loan transaction.
- Log masked phone numbers rather than full phone numbers.

## Remaining Implementation Work

- Add explicit loan-repayment and loan-disbursement transaction types to the payment workflow.
- Add the required Fineract posting and reconciliation steps.
- Add the notification queue and protected notification processor.
- Add due-date and overdue reminder selection with duplicate prevention.
- Add loan-event SMS templates.
- Update the Cloudflare scheduler to call the notification processor independently.
- Configure production server secrets and feature switches.
- Compile and test on the server, including failure and reconciliation scenarios.
