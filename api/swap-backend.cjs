// Simple backend API for swap quotes and execution
const express = require('express');
const app = express();
app.use(express.json());

// Example asset list including USD and USDC
const runes = [
  { ticker: 'FBX', name: 'Fairbrix', mints: 100000 },
  { ticker: 'DOPE', name: 'DopeBrix', mints: 50000 },
  { ticker: 'USD', name: 'US Dollar', mints: 1000000 },
  { ticker: 'USDC', name: 'USD Coin', mints: 1000000 }
];

// GET /api/runes - list available assets
app.get('/api/runes', (req, res) => {
  res.json(runes);
});

// GET /api/swap/quote?from=...&to=...&amount=...
app.get('/api/swap/quote', (req, res) => {
  const { from, to, amount } = req.query;
  // Dummy quote logic
  if (!from || !to || !amount || isNaN(Number(amount))) {
    return res.status(400).json({ error: 'Invalid parameters.' });
  }
  // Example: 1:1 rate for USD/USDC, 10:1 for FBX/DOPE
  let rate = 1, fee = 0.01 * amount;
  if ((from === 'FBX' && to === 'DOPE') || (from === 'DOPE' && to === 'FBX')) rate = 0.1;
  res.json({ rate, fee });
});

// POST /api/swap/execute
app.post('/api/swap/execute', (req, res) => {
  const { from, to, amount } = req.body;
  // Dummy swap logic
  if (!from || !to || !amount || isNaN(Number(amount))) {
    return res.status(400).json({ error: 'Invalid parameters.' });
  }
  // Simulate a transaction
  const txid = 'tx_' + Math.random().toString(36).slice(2);
  res.json({ txid });
});

app.listen(3001, () => console.log('Swap backend running on port 3001'));
