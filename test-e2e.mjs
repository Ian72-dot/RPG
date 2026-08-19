import { WebSocket } from "ws";
const URL = process.env.EV_URL || "ws://127.0.0.1:8080/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client(pid) {
  const c = { pid, ws: null, g: null, code: "", errs: [], frames: 0, seq: 1 };
  c.open = () => new Promise((res) => {
    const ws = new WebSocket(URL);
    c.ws = ws;
    ws.on("open", () => res(true));
    ws.on("message", (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.k === "state") { c.frames++; c.g = m.g; c.code = m.code; }
      else if (m.k === "err") c.errs.push(m.m);
    });
    ws.on("error", () => res(false));
  });
  c.sendRaw = (o) => c.ws.send(JSON.stringify(o));
  c.act = (t, d) => c.sendRaw({ k: "act", pid, code: c.code, a: { p: pid, s: c.seq++, t, d: d || {} } });
  return c;
}

const A = client("aaa-host"), B = client("bbb-guest"), C = client("ccc-late");
let fails = 0;
const ok = (label, cond, extra) => { console.log((cond ? "  PASS  " : "  FAIL  ") + label + (extra ? "  " + extra : "")); if (!cond) fails++; };

await A.open(); await B.open();

A.sendRaw({ k: "create", pid: A.pid, name: "Alex", settings: { biomes: 2, minAreas: 2, maxAreas: 3, minPlayers: 1, joinAfterStart: false } });
await wait(400);
ok("host creates a room and gets a code", /^[A-Z0-9]{4,6}$/.test(A.code), A.code);
ok("room state carries the host", A.g && A.g.hostId === A.pid);
ok("host settings applied", A.g && A.g.settings.biomes === 2, "biomes=" + (A.g && A.g.settings.biomes));

B.code = A.code;
B.sendRaw({ k: "join", pid: B.pid, code: A.code, name: "Sarah" });
await wait(400);
ok("second player joins the same room", B.g && Object.keys(B.g.players).length === 2, "players=" + (B.g && Object.keys(B.g.players).length));
ok("host sees the new player too", A.g && !!A.g.players[B.pid]);
ok("names came through", B.g && B.g.players[B.pid].name === "Sarah");

A.act("CLASS", { cls: "sword" });
B.act("CLASS", { cls: "mage" });
await wait(400);
ok("classes are recorded server-side", A.g.players[A.pid].cls === "sword" && A.g.players[B.pid].cls === "mage");

// a non-host must not be able to start or change settings
B.act("START", {});
B.act("RSET", { biomes: 9 });
await wait(400);
ok("non-host cannot start the game", A.g.phase === "lobby", "phase=" + A.g.phase);
ok("non-host cannot change settings", A.g.settings.biomes === 2);

A.act("START", {});
await wait(500);
ok("host starts the adventure", A.g.phase === "play", "phase=" + A.g.phase);
ok("an area was generated", !!A.g.area, A.g.area && A.g.area.name);

// late joiner is refused once underway
await C.open();
C.sendRaw({ k: "join", pid: C.pid, code: A.code, name: "Mike" });
await wait(400);
ok("late joiner is turned away when the host closed the game", C.errs.length > 0, C.errs[0]);

// combat: attack respects the weapon cooldown
const en = (A.g.enemies || []).filter((e) => e.hp > 0)[0];
if (en) {
  const hp0 = en.hp;
  A.act("ATK", { tid: en.uid });
  await wait(300);
  const now1 = (A.g.enemies.find((e) => e.uid === en.uid) || {}).hp;
  ok("attack reduces enemy hp", now1 < hp0, hp0 + " -> " + now1);
  A.act("ATK", { tid: en.uid });
  await wait(250);
  const now2 = (A.g.enemies.find((e) => e.uid === en.uid) || {}).hp;
  ok("second attack inside the cooldown is rejected", now2 === now1, "hp still " + now2);
} else { ok("combat area has an enemy", false); }

// both clients are seeing the same authoritative state
ok("both clients share one game state", A.g.areaNo === B.g.areaNo && A.g.phase === B.g.phase);
ok("clients are receiving frames", A.frames > 3 && B.frames > 3, "A=" + A.frames + " B=" + B.frames);

// drop and rejoin
B.ws.close();
await wait(700);
ok("dropped player is marked offline", A.g.players[B.pid].conn === false);
const B2 = client(B.pid); await B2.open();
B2.code = A.code;
B2.sendRaw({ k: "join", pid: B.pid, code: A.code, name: "Sarah" });
await wait(500);
ok("player can rejoin and keeps their character", B2.g && B2.g.players[B.pid].cls === "mage" && B2.g.players[B.pid].conn === true);

// garbage input must not take the server down
A.ws.send("not json at all");
A.sendRaw({ k: "act", pid: A.pid, code: A.code, a: { t: "ATK", d: { tid: "nope" } } });
A.sendRaw({ k: "act", pid: A.pid, code: A.code, a: { t: "NOT_A_REAL_ACTION", d: {} } });
A.sendRaw({ k: "join", pid: A.pid, code: "ZZZZZ", name: "x" });
await wait(500);
ok("server survives malformed input", A.frames > 0 && A.g.phase === "play");

console.log(fails === 0 ? "\nALL CHECKS PASSED" : "\n" + fails + " CHECK(S) FAILED");
process.exit(fails === 0 ? 0 : 1);
