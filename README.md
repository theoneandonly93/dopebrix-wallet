DopeBrix Wallet
===============

All-in-one wallet + launchpad for Fairbrix chain inspired by Pump.Fun and Magic Eden.

What’s here
- Fully client-side SPA (no build step) in `web/` with responsive black theme and lime-green buttons.
- Onboarding: Get Started -> create wallet -> protect with Face ID (WebAuthn) or Passcode (required). Face ID still requires setting a passcode.
- Bottom nav: Portfolio, Discover, Swap, Browser, Create.
- Adapters scaffold for Ordinals + Runes SDK, UniSat API, and Fairbrix RPC (raw tx broadcast).
- Lightweight proxy server in `server/` to forward requests to Fairbrix RPC and external APIs with CORS headers.

Important
- This folder is self-contained and does not modify the Fairbrix Core code.
- Network calls require running the local proxy server to avoid browser CORS issues.

Quick Start
1) Configure RPC and APIs: edit `web/config.example.json` and save as `web/config.json`.
   - `FAIRBRIX_RPC_URL`: e.g. http://127.0.0.1:9332/
   - `FAIRBRIX_RPC_AUTH`: base64 of `rpcuser:rpcpassword` or leave empty for cookie-proxy
   - `UNISAT_API_BASE`: base URL for UniSat-like indexer
   - `ORDINALS_API_BASE` / `RUNES_API_BASE`: indexer/sdks endpoints if available

2) Start proxy server (Node >= 18 recommended):
   - Windows PowerShell:
     setx DOPEBRIX_PROXY_PORT 8089
     setx DOPEBRIX_FAIRBRIX_RPC "http://127.0.0.1:9332/"
     setx DOPEBRIX_RPC_AUTH "<base64 rpcuser:rpcpassword>"
     node server/index.js

   - Linux/macOS:
     DOPEBRIX_PROXY_PORT=8089 \
     DOPEBRIX_FAIRBRIX_RPC=http://127.0.0.1:9332/ \
     DOPEBRIX_RPC_AUTH="<base64 rpcuser:rpcpassword>" \
     node server/index.js

3) Open `web/index.html` in a browser (or serve via any static server). In-app Settings -> set Proxy URL to `http://127.0.0.1:8089`.

Mobile/PWA
- Add to Home Screen on iOS/Android for a native-like experience.
- Face ID/biometrics uses WebAuthn platform authenticator on supported mobile browsers. It still requires a passcode for extra protection.
- Layout is mobile-first with safe-area insets for notches/home indicators.

Security Notes
- Passcode is required. The wallet seed is generated client-side and encrypted with a key derived via PBKDF2.
- WebAuthn Face ID/biometrics can be enabled; it still requires the passcode as an additional factor.
- Back up the recovery words (displayed after creation) and store offline. This demo uses a 24-word mnemonic compatible mode; if the BIP39 wordlist is not desired, switch to raw 32-byte hex.

Feature Overview
- Portfolio: balance, token/NFT holdings, staking & mining placeholders with hooks to implement chain-specific logic.
- Discover: trending tokens/NFTs via indexer (UniSat-like).
- Swap: simple UI for bonding-curve pricing and swaps; hooks to generate/broadcast raw transactions.
- Browser: minimal in-app dApp browser via iframe with allowlist.
- Create: token or NFT launch, with bonding curve config, using Ordinals/Runes adapters and raw tx broadcast through Fairbrix RPC.

Development
- No build tools required. Plain HTML/CSS/JS.
- Code is organized under `web/` and `web/js/*` modules.

Caveats & TODOs
- Real Ordinals/Runes/UniSat integration requires their SDKs/APIs; adapters here provide method shapes and stubs.
- Broadcasting from the browser directly to Fairbrix RPC will usually be blocked by CORS. Use the included proxy.
- UTXO selection/signing requires a robust library; the demo routes through node RPC where possible (createrawtransaction/fundraw/signraw/sendraw).
