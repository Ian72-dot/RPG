/* ==========================================================================
   Embervow — authoritative game server
   --------------------------------------------------------------------------
   The server owns every game object. Clients send intents; the server decides
   what actually happened. It imports the exact same engine module the browser
   renders with, so there is one rule set and no way to disagree with it.
   ========================================================================== */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { newGame, processAction, tick, makeCode } from "../shared/engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 8080);

const TICK_MS = 100;          // engine steps per second: 10
const SEND_MS = 200;          // state broadcasts per second: 5
const EMPTY_ROOM_MS = 15 * 60 * 1000;
const MAX_ROOMS = Number(process.env.MAX_ROOMS || 400);

/* ---------- static files ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
function serveStatic(req, res) {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  const file = path.join(PUBLIC, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403).end("forbidden"); return; }
  fs.readFile(file, (err, buf) => {
    if (err) {
      // Only extensionless routes fall back to the app shell. A missing .js or
      // .css must 404 loudly rather than quietly serving HTML in its place.
      if (path.extname(file)) { res.writeHead(404, { "content-type": "text/plain" }).end("not found"); return; }
      fs.readFile(path.join(PUBLIC, "index.html"), (e2, shell) => {
        if (e2) { res.writeHead(404).end("not found"); return; }
        res.writeHead(200, { "content-type": MIME[".html"] }).end(shell);
      });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const headers = { "content-type": MIME[ext] || "application/octet-stream" };
    if (ext === ".js" || ext === ".css") headers["cache-control"] = "public, max-age=3600";
    res.writeHead(200, headers).end(buf);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") { res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, rooms: rooms.size, players: countPlayers() })); return; }
  serveStatic(req, res);
});

/* ---------- rooms ---------- */
/** code -> { g, clients: Map<pid, ws>, lastSent: string, lastSentAt: number, emptyAt: number } */
const rooms = new Map();
function countPlayers() { let n = 0; for (const r of rooms.values()) n += r.clients.size; return n; }

function freshCode() {
  for (let i = 0; i < 200; i++) { const c = makeCode(); if (!rooms.has(c)) return c; }
  return makeCode() + String(Math.floor(Math.random() * 9));
}

function send(ws, obj) {
  if (!ws || ws.readyState !== 1) return;
  try { ws.send(JSON.stringify(obj)); } catch (e) { /* client is gone; the close handler cleans up */ }
}
function err(ws, m) { send(ws, { k: "err", m }); }

function broadcast(code, room, force) {
  const payload = JSON.stringify({ k: "state", code, t: Date.now(), g: room.g });
  const t = Date.now();
  // Skip identical frames unless a second has passed (clients use these for clock sync).
  if (!force && payload === room.lastSent && t - room.lastSentAt < 1000) return;
  room.lastSent = payload; room.lastSentAt = t;
  for (const ws of room.clients.values()) { if (ws.readyState === 1) { try { ws.send(payload); } catch (e) {} } }
}

function act(room, pid, a) {
  if (!a || typeof a.t !== "string") return;
  const action = { p: pid, s: Number(a.s) || 0, t: a.t, d: a.d && typeof a.d === "object" ? a.d : {} };
  try { processAction(room.g, action); } catch (e) { console.error("action", a.t, e.message); }
}

/* ---------- websocket ---------- */
const wss = new WebSocketServer({ server, path: "/ws", perMessageDeflate: true, maxPayload: 64 * 1024 });

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch (e) { return; }
    const pid = typeof m.pid === "string" ? m.pid.slice(0, 40) : null;
    if (m.k === "ping") { send(ws, { k: "pong", c: m.c }); return; }
    if (!pid) return;

    if (m.k === "create") {
      if (rooms.size >= MAX_ROOMS) { err(ws, "The server is at capacity — try again shortly."); return; }
      const code = freshCode();
      const g = newGame(code, pid, (Math.random() * 1e9) | 0);
      const room = { g, clients: new Map(), lastSent: "", lastSentAt: 0, emptyAt: 0 };
      rooms.set(code, room);
      act(room, pid, { s: 1, t: "JOIN", d: { name: m.name } });
      if (m.settings && typeof m.settings === "object") act(room, pid, { s: 2, t: "RSET", d: m.settings });
      bind(ws, code, pid);
      console.log("room created", code);
      return;
    }

    if (m.k === "join") {
      const code = String(m.code || "").toUpperCase().slice(0, 8);
      const room = rooms.get(code);
      if (!room) { err(ws, "No game with that code."); return; }
      const known = !!room.g.players[pid];
      if (!known) {
        // Rejoining players always get back in. New arrivals mid-adventure are
        // the host's call, via the joinAfterStart setting.
        if (room.g.phase !== "lobby" && room.g.settings.joinAfterStart === false) {
          err(ws, "That game has already started."); return;
        }
        const cap = (room.g.settings && room.g.settings.maxPlayers) || 15;
        if (room.g.order.length >= cap) { err(ws, "That game is full."); return; }
      }
      act(room, pid, { s: 1, t: "JOIN", d: { name: m.name } });
      if (known && m.name) act(room, pid, { s: 2, t: "NAME", d: { name: m.name } });
      bind(ws, code, pid);
      return;
    }

    if (m.k === "act") {
      const room = rooms.get(ws.code || String(m.code || "").toUpperCase());
      if (!room || !room.g.players[pid]) return;
      room.g.players[pid].seen = Date.now();
      room.g.players[pid].conn = true;
      act(room, pid, m.a);
      if (m.a && m.a.t !== "HB") broadcast(ws.code, room, true);
      return;
    }

    if (m.k === "leave") {
      const room = rooms.get(ws.code);
      if (!room) return;
      act(room, pid, { s: 0, t: "LEAVE", d: {} });
      room.clients.delete(pid);
      ws.code = null; ws.pid = null;
      send(ws, { k: "bye" });
      broadcast(room.g.code, room, true);
      return;
    }
  });

  ws.on("close", () => {
    const room = rooms.get(ws.code);
    if (!room || !ws.pid) return;
    if (room.clients.get(ws.pid) === ws) room.clients.delete(ws.pid);
    const p = room.g.players[ws.pid];
    if (p) { p.conn = false; p.seen = 0; }   // engine shows them as offline; they can rejoin
    if (!room.clients.size) room.emptyAt = Date.now();
    broadcast(room.g.code, room, true);
  });

  function bind(sock, code, pid) {
    const room = rooms.get(code);
    if (!room) return;
    const prev = room.clients.get(pid);
    if (prev && prev !== sock) { try { prev.close(); } catch (e) {} }
    sock.code = code; sock.pid = pid;
    room.clients.set(pid, sock);
    room.emptyAt = 0;
    const p = room.g.players[pid];
    if (p) { p.conn = true; p.seen = Date.now(); }
    broadcast(code, room, true);
  }
});

/* ---------- loops ---------- */
let n = 0;
setInterval(() => {
  n++;
  const doSend = n % Math.round(SEND_MS / TICK_MS) === 0;
  for (const [code, room] of rooms) {
    try { tick(room.g); } catch (e) { console.error("tick", code, e.message); }
    if (doSend) broadcast(code, room, false);
    if (!room.clients.size && room.emptyAt && Date.now() - room.emptyAt > EMPTY_ROOM_MS) {
      rooms.delete(code); console.log("room closed", code);
    }
  }
}, TICK_MS);

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) { try { ws.terminate(); } catch (e) {} return; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  });
}, 20000);

if (!fs.existsSync(path.join(PUBLIC, "bundle.js"))) {
  console.warn("\n  !  public/bundle.js is missing — the page will load but stay blank.");
  console.warn("     Run `npm run build` (or start with `npm start`, which builds first).\n");
}

server.listen(PORT, () => {
  console.log("Embervow listening on http://localhost:" + PORT);
});
