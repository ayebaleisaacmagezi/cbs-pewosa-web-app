# Production Diagnostics Logging Plan

## Implementation Status

Implemented locally on 2026-09-11. Deployment is still required for both repositories.

| Area                      | Status             | Implementation                                                                        |
| ------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Correlation IDs           | Implemented        | Angular adds `X-Correlation-ID` to API requests.                                      |
| Angular HTTP errors       | Implemented        | Failed requests are sanitized and submitted through a write-only endpoint.            |
| Unexpected browser errors | Implemented        | The global Angular error handler submits a sanitized event.                           |
| Fineract teller errors    | Implemented        | Failed `/pewosa/teller` responses are recorded as `FINERACT` events.                  |
| Password access           | Implemented        | A deployment-supplied password hash issues a short-lived in-memory token.             |
| Diagnostics UI            | Implemented        | The private view is available at `/#/diagnostics`.                                    |
| Filtering and pagination  | Implemented        | Source, status, endpoint, reference, correlation, and UTC date filters are supported. |
| Retention                 | Implemented        | Expired database events are removed by throttled cleanup during diagnostics use.      |
| Office IP restriction     | Deployment control | Configure this at the reverse proxy or WAF.                                           |

## Purpose

The CBS Pewosa teller system needs a safe way to diagnose failures after deployment. The diagnostics facility will collect errors from both the Angular web application and the Apache Fineract backend and present them in one private support screen.

This facility is intended for temporary production troubleshooting and ongoing operational support. It must not expose member information, credentials, authentication tokens, or unrestricted server log files.

## Key Decision

Use one diagnostics service with two log sources:

- `ANGULAR`: browser errors and failed API requests reported by the web application.
- `FINERACT`: backend exceptions and failed teller operations recorded by the server.

Angular is a browser application and cannot securely expose its own log-reading endpoint. It sends structured error reports to Fineract. Fineract stores both sources and provides the password-protected log-reading endpoints.

## User Flow

1. A teller operation fails in the browser or backend.
2. A correlation ID connects the Angular request to the corresponding Fineract request.
3. Angular reports a sanitized client error to the write-only ingestion endpoint.
4. Fineract records backend failures automatically.
5. The system owner opens the private `/diagnostics` page.
6. The owner enters the dedicated diagnostics password.
7. The backend returns a short-lived diagnostics access token.
8. The owner filters logs by date, source, status, endpoint, cashier, or transaction reference.
9. The access token expires automatically after a short period.

## Proposed API

All paths below are relative to the Fineract API base path.

### Submit an Angular error

```http
POST /api/v1/pewosa/diagnostics/client-errors
```

This is a write-only endpoint. It must never return stored logs. Because a secret embedded in Angular can be extracted from the browser bundle, this endpoint should use strict CORS rules, rate limiting, request-size limits, schema validation, and server-side sanitization instead of a hard-coded frontend secret.

### Start a diagnostics session

```http
POST /api/v1/pewosa/diagnostics/login
Content-Type: application/json

{
  "password": "owner-supplied-password"
}
```

If the password is correct, the backend returns a short-lived diagnostics token. Failed attempts must be rate-limited and recorded without saving the submitted password.

### List diagnostic events

```http
GET /api/v1/pewosa/diagnostics/logs?source=ANGULAR&severity=ERROR&from=2026-09-11T00:00:00Z
X-Diagnostics-Token: <diagnostics-token>
```

Supported filters should include:

- Date and time range
- Source: `ANGULAR` or `FINERACT`
- Severity
- HTTP status
- Endpoint
- Cashier ID
- Transaction reference
- Correlation ID

Results must be paginated and ordered newest first.

### View one diagnostic event

```http
GET /api/v1/pewosa/diagnostics/logs/{eventId}
X-Diagnostics-Token: <diagnostics-token>
```

The response contains only sanitized structured data. It must not provide arbitrary access to files on the server.

## Diagnostic Event Structure

```json
{
  "id": "01J7EXAMPLE",
  "source": "ANGULAR",
  "timestamp": "2026-09-11T10:30:00Z",
  "severity": "ERROR",
  "message": "Transaction verification failed",
  "endpoint": "/pewosa/teller/transactions/TXN-123",
  "httpMethod": "GET",
  "httpStatus": 404,
  "cashierId": 1,
  "transactionReference": "TXN-123",
  "correlationId": "b6d2a2e6-2cb2-42d6-a457-example",
  "applicationVersion": "2026.09.11",
  "details": {
    "errorCode": "TRANSACTION_NOT_FOUND"
  }
}
```

Only fields on an explicit allow-list should be accepted or stored.

## Angular Work

1. Add a global Angular error reporter for unexpected browser failures.
2. Extend the HTTP interceptor to report failed API requests after sanitization.
3. Generate or forward an `X-Correlation-ID` header on API requests.
4. Prevent reporting loops if the diagnostics ingestion request itself fails.
5. Add a private `/diagnostics` route containing:
   - Password form
   - Log filters
   - Paginated log table
   - Sanitized event details
   - Logout button
6. Keep the diagnostics token in memory or a secure, short-lived cookie rather than permanent browser storage.
7. Show a small reference code to the teller when an error is reported so support can search by correlation ID.

## Fineract Work

1. Add the diagnostics login, ingestion, list, and detail endpoints.
2. Verify the password against a strong password hash supplied through the deployment environment.
3. Issue a narrowly scoped, short-lived diagnostics token in the `X-Diagnostics-Token` header that cannot access normal banking APIs.
4. Add a request filter that creates or accepts a valid correlation ID and includes it in responses.
5. Record structured errors from the teller endpoints through the global exception-handling layer.
6. Sanitize every event before persistence.
7. Apply rate limits to login and client-error ingestion.
8. Add pagination, filtering, retention cleanup, and an audit record for diagnostics access.

## Configuration

Secrets must be supplied by the deployment environment and must never be committed to either repository.

```text
PEWOSA_DIAGNOSTICS_ENABLED=true
PEWOSA_DIAGNOSTICS_PASSWORD_HASH=<strong-password-hash>
PEWOSA_DIAGNOSTICS_TOKEN_EXPIRY_MINUTES=15
PEWOSA_DIAGNOSTICS_RETENTION_DAYS=14
PEWOSA_DIAGNOSTICS_ALLOWED_ORIGINS=https://portal.cbspewosa.com
PEWOSA_DIAGNOSTICS_ALLOWED_IPS=<optional-office-or-vpn-addresses>
```

Angular error submission is independently controlled with:

```text
MIFOS_PRODUCTION_DIAGNOSTICS_ENABLED=true
```

`PEWOSA_DIAGNOSTICS_PASSWORD_HASH` must contain a Spring Security delegating password hash such as
`{bcrypt}<bcrypt-hash>`. Never provide or commit the plaintext password. The diagnostics backend remains disabled when
`PEWOSA_DIAGNOSTICS_ENABLED` is not `true`, and login remains unavailable when the hash is blank.

`PEWOSA_DIAGNOSTICS_ALLOWED_IPS` is enforced at the reverse proxy or WAF so an untrusted forwarded-address header cannot
weaken the restriction. `PEWOSA_DIAGNOSTICS_ALLOWED_ORIGINS` is also checked by the ingestion endpoint.

Production should fail safely: if the password hash is absent or invalid, log viewing is disabled.

## Mandatory Security Rules

Never store or display:

- Passwords, PINs, one-time codes, or security answers
- Authorization headers, cookies, session IDs, or access tokens
- Full account numbers or identity-document numbers
- Unfiltered request or response bodies
- Database connection strings or server environment variables
- Stack traces containing secrets or member data

Additional safeguards:

- Hash the diagnostics password with an approved adaptive password hashing algorithm.
- Use HTTPS only.
- Lock or delay login attempts after repeated failures.
- Expire diagnostics sessions automatically.
- Allow password rotation without rebuilding Angular.
- Record who accessed diagnostics, when, and from which IP address.
- Restrict access by office IP or VPN when possible.
- Delete expired events automatically.
- Disable Angular production source maps unless they are stored privately.

## Storage and Retention

For the first release, store sanitized structured diagnostic events in a dedicated database table. Do not store complete raw application log files in the database.

Recommended initial retention is 14 days, configurable by environment. A scheduled cleanup must permanently remove expired events. If traffic grows, the storage implementation can later move to a dedicated logging platform without changing the Angular reporting contract.

## Implementation Phases

| Phase | Deliverable                                   | Local status | Completion condition                                                                     |
| ----- | --------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| 1     | Correlation IDs and backend structured events | Implemented  | A failed teller request can be found by its correlation ID.                              |
| 2     | Angular error ingestion                       | Implemented  | Sanitized browser and HTTP failures appear with source `ANGULAR`.                        |
| 3     | Password authentication                       | Implemented  | Only the owner password can obtain a short-lived diagnostics token.                      |
| 4     | Diagnostics UI                                | Implemented  | The owner can filter and inspect both log sources from `/#/diagnostics`.                 |
| 5     | Production hardening                          | Partial      | Application rate limits, redaction, retention, and deployment configuration are enabled. |

## Deployment Checklist

1. Generate a strong bcrypt password hash outside both repositories.
2. Set the Fineract diagnostics environment variables, including the allowed portal origin.
3. Run the Fineract Liquibase migration and deploy the current `pewosa-fineract` application.
4. Enable `MIFOS_PRODUCTION_DIAGNOSTICS_ENABLED` and deploy Angular.
5. Open `/#/diagnostics`, log in with the owner password, and confirm a deliberately failed non-financial request appears.
6. Confirm the page never displays account numbers, request bodies, credentials, tokens, cookies, or stack traces.

## Acceptance Criteria

- Angular and Fineract failures can be matched using one correlation ID.
- The diagnostics screen works without a normal Mifos user login.
- Reading logs requires the dedicated owner password.
- The client-error endpoint is write-only and cannot reveal stored data.
- Passwords and tokens are absent from source code and diagnostic records.
- Sensitive member and account fields are redacted before storage.
- Login and ingestion endpoints are rate-limited.
- Diagnostics sessions expire automatically.
- Log results are paginated and retained only for the configured period.
- Diagnostics can be disabled immediately through deployment configuration.

## Operational Use for Transaction Failures

For a failure such as **Verify transaction not working**:

1. Copy the reference code displayed to the teller.
2. Open `/diagnostics` and sign in with the owner password.
3. Search using the correlation ID or transaction reference.
4. Compare the `ANGULAR` event with its matching `FINERACT` event.
5. Check the failing endpoint, HTTP status, backend error code, and timestamp.
6. Correct the underlying fault; do not use the diagnostics screen to alter or repost financial transactions.

The diagnostics feature is observability tooling only. It must never bypass teller authorization, approve transactions, modify balances, or expose raw financial data.
