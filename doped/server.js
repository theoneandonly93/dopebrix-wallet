import express from "express";
import { WebSocketServer } from "ws";
import redis from "./cache.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const RPC_URL = process.env.VITE_FAIRBRIX_RPC_URL || `http://${process.env.RPC_USER}:${process.env.RPC_PASS}@127.0.0.1:${process.env.RPC_PORT || 9332}`;

async function rpc(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "1.0", id: "api", method, params })
  });
  const { result, error } = await res.json();
  if (error) throw new Error(error.message);
  return result;
}

// --- REST API ---
app.get("/balances/:address", async (req, res) => {
  const addr = req.params.address;
  const cacheKey = `balance:${addr}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  // fallback: hit the chain
  const balanceFBX = await rpc("getreceivedbyaddress", [addr, 0]);
  // USDC logic: check Redis for USDC, fallback to 0
  let balanceUSDC = 0;
  if (cached) {
    const parsed = JSON.parse(cached);
    if (typeof parsed.USDC === "number") balanceUSDC = parsed.USDC;
  }
  const result = { FBX: balanceFBX, USDC: balanceUSDC };
  await redis.set(cacheKey, JSON.stringify(result), { EX: 60 });
  res.json(result);
});

app.post("/reward", async (req, res) => {
  // ...existing reward logic...
  res.json({ ok: true });
});

// --- WebSocket Server ---
const wss = new WebSocketServer({ port: 9501 });
wss.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    let { address } = JSON.parse(msg);
    ws.address = address;
    const cached = await redis.get(`balance:${address}`);
    ws.send(JSON.stringify({ type: "balance", data: JSON.parse(cached || "{}") }));
  });
});

// --- Redis keyspace notifications ---
redis.pSubscribe("__keyevent@0__:set", async (message, key) => {
  if (key.startsWith("balance:")) {
    const address = key.split(":")[1];
    const data = await redis.get(key);
    wss.clients.forEach((client) => {
      if (client.address === address && client.readyState === 1) {
        client.send(JSON.stringify({ type: "balance", data: JSON.parse(data) }));
      }
    });
  }
});

// --- Start Express ---
const PORT = Number(process.env.DOPE_REWARD_PORT || 9500);
app.listen(PORT, () => console.log(`API listening on ${PORT}`));

