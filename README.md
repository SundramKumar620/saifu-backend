# Saifu Backend — Solana Wallet Service (Devnet)

Saifu Backend is an **optional service layer** used by the Saifu wallet ecosystem.
Its role is to support the frontend and extension **without ever touching user secrets**.

> ⚠️ **Network:** This backend runs on **Solana Devnet only**.
> It is intended for development and testing purposes.

---

## Why this backend exists

This backend exists for **infrastructure and security reasons**, not custody.

It is used to:

* Protect **private API keys** (RPC providers, third-party services)
* Avoid exposing secrets in frontend or browser extensions
* Provide controlled RPC access
* Enable future features like rate limiting, monitoring, and indexing

### API key protection (important)

Some Solana RPC providers require **secret API keys**.

❌ These keys must **never** be shipped to:

* frontend code
* browser extensions
* client-side environment variables

✅ Instead:

* API keys are stored in backend environment variables
* Frontend calls the backend
* Backend forwards requests using protected credentials

This prevents:

* API key leakage
* abuse and quota exhaustion
* malicious reuse by third parties

---

## Network configuration

* **Solana network:** Devnet
* Used for:

  * RPC forwarding
  * Transaction simulation
  * Development testing
* **Mainnet is not enabled**

Do not use this backend with real funds.

---

## High-level architecture

```
Frontend / Extension
        |
        |  public keys, signed transactions
        v
Saifu Backend
        |
        |  protected RPC + API keys
        v
Solana Devnet
```

Clear separation:

* User secrets → frontend only
* Infrastructure secrets → backend only

---

## What the backend does **NOT** do

For security and trust reasons, the backend is **explicitly designed to avoid all wallet-critical operations**.

The backend **never**:

* Accesses or stores mnemonics / seed phrases
* Handles private keys in any form
* Receives or processes user passwords
* Performs wallet encryption or decryption
* Signs transactions on behalf of users
* Derives keys or manages wallet accounts

All cryptographic wallet logic — including key generation, encryption, decryption, and transaction signing — **runs entirely in the frontend or browser extension**.

This design guarantees:

* Full user custody of funds
* Backend compromise cannot leak keys
* Backend cannot move or steal assets

---

## Project structure (high level)

```
saifu-backend/
├── server.js        # application entry point
├── routes/          # API routes
├── controllers/     # request handlers
├── services/        # RPC + helper logic
├── utils/
├── .env.example     # environment variable template
└── README.md
```

---

## Environment variables

Create a `.env` file using `.env.example`.

Example:

```
PORT=3000
RPC_URL=https://api.devnet.solana.com
RPC_API_KEY=your_secret_api_key
```

⚠️ Never commit real secrets to the repository.

---

## API overview (example)

> Adjust based on actual implementation

* `GET /health`
  Backend health check

* `POST /rpc/proxy`
  Forwards RPC requests using protected API keys

* `GET /price/:token`
  Token price helper (optional)

---

## Usage with Saifu frontend

* Frontend may:

  * Use backend for protected RPC access
  * Bypass backend and call Solana RPC directly
* Wallet security does **not** depend on backend availability

Even if this backend is fully compromised:

* User mnemonics remain safe
* Private keys are not exposed
* Funds cannot be moved

---

## Known limitations & TODOs

* Devnet only
* No WebSocket subscriptions
* No caching layer
* No rate limiting (planned)
* No indexing service yet

---

## Disclaimer

This project is under active development.
It is **not audited**.
Use **Devnet only** and do not store real funds.
