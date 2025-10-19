DOPE Wallet (PWA)
================================

DOPE Wallet is a PWA wallet for the Fairbrix network. It supports:

- Passcode + optional biometric (FaceID/TouchID/Windows Hello) gating
- Wallet home: balance, send, receive, buy, stake, mine
- Automatic swap (via external swap API)
- Create tokens (Runes) and NFTs (Ordinals) via external APIs
- Trending tokens/NFTs from an indexer

Quickstart
----------

1) Copy environment config:

   - Duplicate `.env.example` to `.env` and fill values:

     - `VITE_FAIRBRIX_RPC_URL` e.g. `http://127.0.0.1:8332`
     - `VITE_FAIRBRIX_RPC_USER` and `VITE_FAIRBRIX_RPC_PASS` if required
     - Optional: `VITE_SWAP_API_URL`, `VITE_ORDINALS_API_URL`, `VITE_RUNES_API_URL`, `VITE_INDEXER_API_URL`, `VITE_BUY_URL`

2) Install deps and run dev server:

   - `npm install`
   - `npm run dev`

   The app opens at `http://localhost:5173`.

Notes
-----

- RPC operations assume a Bitcoin-like JSON-RPC node with wallet enabled. Methods used: `getbalance`, `getnewaddress`, `sendtoaddress`, plus optional `stake` and `setgenerate` if supported.
- Biometric unlock uses WebAuthn locally and is a convenience gate for the UI. For production-grade auth, integrate a server-side WebAuthn verifier.
- Swap, Ordinals, Runes, and Trending rely on external APIs you provide via `.env`.

AI Builder – Step-by-Step Prompt
--------------------------------

Use the following prompt in your AI builder to complete all integrations correctly:

"""
You are building a Phantom-style PWA wallet for the Fairbrix blockchain. Use the provided codebase and ensure the following configurations are set:

- Configure `.env`:
  - VITE_NETWORK_NAME=fairbrix
  - VITE_FAIRBRIX_RPC_URL=http://<user>:<pass>@<host>:<port>
  - VITE_FAIRBRIX_RPC_USER=<rpc_user>
  - VITE_FAIRBRIX_RPC_PASS=<rpc_pass>
  - Optional endpoints:
    - VITE_SWAP_API_URL=https://<swap-service>
    - VITE_ORDINALS_API_URL=https://<ordinals-service>
    - VITE_RUNES_API_URL=https://<runes-service>
    - VITE_INDEXER_API_URL=https://<indexer-service>
    - VITE_BUY_URL=https://<onramp>

- Verify RPC methods work against the Fairbrix node: getbalance, getnewaddress, sendtoaddress. If different method names are required for Fairbrix, patch `src/services/fairbrix.js` accordingly.

- Ensure the biometric unlock flow works on supported platforms (WebAuthn). Keep it as a local UI gate.

- For Ordinals minting and Runes token creation:
  - Expose POST endpoints `/inscribe` and `/create` respectively. Inputs match the shapes used in `src/services/fairbrix.js`.
  - Return a JSON object: `{ ok: true, message: "…", txid: "…" }`.

- For Trending:
  - Expose GET `/trending` returning a JSON array of items with keys: `name|ticker`, `type`, `volume24h`.

- For Swap:
  - Expose GET `/quote?from=FBX&to=USD&amount=…` returning `{ rate, receive }`.
  - Expose POST `/swap` accepting `{ from, to, amount }` returning `{ ok: true, txid, message }`.

- Styling:
  - Maintain the Phantom UI theme in `src/styles.css`.
  - Bottom navigation must remain: Wallet, Swap, Create, Trending.

- Test:
  - Start dev server and verify send/receive flows using a test Fairbrix node.
  - Validate env-based endpoints by mocking responses if needed.
"""

Folder Overview
---------------

- `public/manifest.json`, `public/sw.js`, `public/icons/logo.svg` – PWA bits
- `src/services/fairbrix.js` – RPC + external API adapters (swap, ordinals, runes, trending)
- `src/services/auth.js` – Passcode/biometric gating (local)
- `src/pages/*` – Wallet, Swap, Create, Trending, Login
- `src/components/BottomNav.jsx` – Phantom-style bottom nav
- `vite.config.js` – Dev server config



