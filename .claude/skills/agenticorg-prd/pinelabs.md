# Pine Labs: real API, platform connectors, and what to mock

Source: Pine Labs Online docs (`pinelabs.com/docs/online-payments`, index at `/llms.txt`, version 2.1.0, updated 2026-07-21), read 2026-10-04. Sandbox `https://pluraluat.v2.pinepg.in`, production `https://api.pluralpay.in`. Auth: `POST /api/auth/v1/token` with `client_id`, `client_secret`, `grant_type: client_credentials`, then a Bearer token. Every request carries `Request-ID` and `Request-Timestamp` headers. Amounts are in **paise** inside a `{value, currency}` object.

UAT keys are self-serve: sign up at the Pine Labs Online dashboard, then Settings > API Keys. [docs]

## The API surface

| Area | Endpoints | Household or SMB use |
| --- | --- | --- |
| Orders | Create, Get by ID, Get by merchant reference, Capture, Cancel | One-off payment with hosted checkout |
| Payments | UPI (collect, intent, QR), cards, netbanking, wallets, EMI, cardless EMI, BNPL, Pay by Points, Apple Pay | Mostly UPI |
| Payment links | Create, Get, Cancel, Resend notification | Send a pay link over WhatsApp |
| Customers | Create, Get, Update | Needed before subscriptions |
| Subscriptions | Plans (CRUD), Subscriptions (create, get, update, pause, resume, cancel), Presentations (create, get, delete, debit, merchant retry) | Recurring UPI AutoPay |
| **UPI Reserve Pay (SBMD)** | Create SBMD subscription, Get SBMD subscription, Create presentation | Block once, debit many times. Fits a household spend cap. |
| One-time mandate | Block funds, capture later | Pay after delivery |
| Payouts | `POST /payouts/v3/payments/banks` (to bank or UPI VPA), `GET /payouts/v3/payments`, `GET /payouts/v3/payments/funding-account` (balance), bulk file, update or cancel a scheduled payout | Pay the shop or the cook |
| Refunds | Create refund | |
| Settlements | All, by UTR, split settlement release and cancel | |
| Verify VPA | Check a UPI ID before paying | Catch a wrong shop VPA |
| Tokenisation, brand wallets, international, e-challans, convenience fee | | Not relevant here |
| Webhooks | Events below, with signature verification and retries | |
| AI tools | Pine Labs MCP server (30+ tools), Agent Toolkit, P3P payments protocol, CLI | Separate from AgenticOrg's connectors |

Webhook events: `ORDER_AUTHORIZED`, `ORDER_PROCESSED`, `ORDER_FAILED`, `ORDER_CANCELLED`, `ORDER_SETTLED`, `PAYMENT_FAILED`, `PAYMENT_DECLINED`, `PAYMENT_EXPIRED`, `REFUND_PROCESSED`, `REFUND_FAILED`, `SETTLEMENT_REJECTED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_CHARGED`, `SUBSCRIPTION_PENDING`, `SUBSCRIPTION_HALTED`, `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_RESUMED`, `SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_COMPLETED`, `SUBSCRIPTION_UPDATED` and their failure variants.

## UPI Reserve Pay in detail

Our Round 2 money design. The facts a PRD has to respect:

- The customer blocks an amount once in their UPI app. The merchant then debits it in parts, with no approval per debit and no pre-debit notice.
- **Cap ₹10,000** (NPCI). **Validity up to 90 days.** Approved amount = utilised + remaining.
- **One active SBMD mandate per customer** at most banks. A second create fails with `ACTIVE_SBMD_EXISTS`.
- **Only ICICI Bank and Axis Bank savings accounts** support it today. Most of your users can't use it yet. Say so in the PRD.
- Flow: generate token, create customer, create SBMD subscription (returns a challenge URL; status `CREATED`, then `processing`), customer approves in a UPI app (`ACTIVE`), create presentation for each debit (`PENDING`, then `SUCCESS` or `FAILED`), mandate ends when used up, expired or revoked.
- Paths: `POST /api/v1/customer`, `POST /ps/api/v1/public/subscriptions/sbmd`, `GET /ps/api/v1/public/subscriptions/sbmd/{id}`, `POST /ps/api/v1/public/presentations`.
- A debit above the remaining balance fails with `INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION`. Fix: fetch the live balance and debit less, or ask for a top-up.

## Error codes worth designing for

From the error code list (category in brackets):

| Code | Meaning |
| --- | --- |
| `INSUFFICIENT_FUNDS` [acquirer] | Payer's balance too low. The brief's "balance too low". |
| `INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION` | Reserve Pay block used up |
| `ACTIVE_SBMD_EXISTS` | Mandate already exists |
| `AMOUNT_LIMIT_EXCEEDED` | Over a limit |
| `PAYMENT_DECLINED`, `RISK_CHECK_FAILED`, `ISSUER_NOT_AVAILABLE` | Bank side refusals |
| `PAYMENT_EXPIRED`, `TXN_EXPIRED` | User didn't approve in time |
| `TIMED_OUT` | Pine Labs timed out. Check status before retrying. |
| `DUPLICATE_REQUEST` | Already processed. Safe idempotency signal. |
| `PAYMENT_RATE_LIMIT`, `API_RATE_LIMIT` | Too many attempts |
| `INVALID_REQUEST`, `EMPTY_AMOUNT`, `NEGATIVE_AMOUNT` | Bad payload |
| `UNAUTHORIZED`, `USER_AUTHENTICATION_FAILED` | Token or key problem |
| `ORDER_NOT_FOUND`, `ORDER_CANCELLED` | State problems |
| `INTERNAL_ERROR` | Retry with backoff |

## What AgenticOrg gives you natively

| Connector | Tools | Fits? |
| --- | --- | --- |
| `pinelabs_plural` (OAuth2, UAT base `pluraluat.v2.pinepg.in/api`) | `create_order` (returns `challenge_url`), `create_payment_link`, `get_order_status`, `initiate_refund`, `get_settlement_report`, `get_payout_analytics` | One-off payments and links. **No subscriptions, Reserve Pay or payout creation.** Needs real UAT keys. Ignores a custom Base URL. |
| `pinelabs_payment` (OAuth2, base `apigw-test.pinelabs.com`) | `create_qr_transaction`, `get_qr_transaction_status` (`status_category`: pending, succeeded, failed, cancelled, expired), `cancel_qr_transaction`, plus aliases | Dynamic UPI QR on Pine Labs billing. Built for merchant POS. Whether it accepts a custom Base URL is untested. |
| `food_service`, `merchant_support`, `merchant_ai`, `push_notification`, `whatsapp_notification`, `device_health` | Pine Labs merchant tools | Internal Pine Labs systems for merchants. Not for consumer flows. |

So the rule "real where the platform supports it" plays out as:

- Payment link or one-off UPI order: **real** through `pinelabs_plural` with UAT keys.
- Reserve Pay, subscriptions, payouts, VPA verification: **mock** at the documented paths, because no native tool covers them.

Our mock (`baari-mock/lib/pinelabs.js`) implements token, customer, SBMD create and fetch, presentations, a fake approval page at `/pinelabs/approve/{id}`, and one invention:

| Invented | Path | What it does |
| --- | --- | --- |
| C7 payee-routed debit | `POST /ps/api/v1/public/subscriptions/{id}/presentations/payee` | Debit the household's Reserve Pay block and settle straight to an allowed shop VPA (`allowed_payees`). Real Reserve Pay settles only to the merchant. |

Presentations stay `PENDING` for a few seconds, then settle. Scenarios cover timeout, malformed, server error, insufficient balance and active mandate. The mock MCP connector fails the validator, so Baari can't call it yet. Mapping it onto a native connector or getting real UAT keys for `pinelabs_plural` is still open.

## PRD checklist for the Pine Labs rail

- State the money model: who blocks what, the cap, who approves, which bank accounts work.
- The human approves in a real UPI app or by tapping a real payment link. The AgenticOrg Approvals screen is not the household's approval.
- Every debit checks remaining balance first and handles `INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION` and `INSUFFICIENT_FUNDS` with a message to the right person.
- Never report "paid" until status is `SUCCESS` (or the webhook says so). `PENDING` is not paid.
- After a timeout, check status by merchant reference before retrying.
