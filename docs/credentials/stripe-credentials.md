# Stripe Credentials & Account Information

> ⚠️ **CONFIDENTIAL** — Do NOT share this file publicly or commit to a public repository.
> These are TEST MODE keys — no real money will be charged.

## Account Login

| Field | Value |
|-------|-------|
| **Stripe Dashboard** | [dashboard.stripe.com](https://dashboard.stripe.com) |
| **Login Email** | `kaleemcmh@gmail.com` |
| **Account Mode** | TEST (Sandbox) |

## Webhook Endpoint

| Field | Value |
|-------|-------|
| **Webhook URL** | `https://ali-n8n.mywire.org/webhook/stripe/payment` |
| **Event** | `checkout.session.completed` |
| **Status** | Active ✅ |

## Test API Keys

| Field | Value |
|-------|-------|
| **Publishable Key** | pk_test_51Svl1cK1vJUX5SJUjrwUaQtrZqku0vybqMxqeNbFpdQje7MIXT2ITSWo4BY9gPxzKJhjyYU4bpkRPnaFOoSQ213N008mURWaru |
| **Secret Key** | sk_test_51Svl1cK1vJUX5SJUYEP2mm8sOSSz7R0oOmcRohJu54OUBGoIU8tfMUr4IFamNeFsQ6B6UNT9uuGLEL70Q0LJXi8U00AEUGiNzk |

## Test Cards (for testing payments)

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Declined |
| `4000 0025 0000 3155` | 🔐 Requires 3D Secure |

- **Expiry:** Any future date (e.g., 12/30)
- **CVC:** Any 3 digits (e.g., 123)

## Usage

- Used in: `n8n-workflows/tools_create_payment_link.json`
- Used in: `n8n-workflows/stripe_payment_webhook.json`
- Stripe API Endpoint: `https://api.stripe.com/v1/`
