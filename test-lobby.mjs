import { WebSocket } from "ws";
const URL = process.env.EV_URL || "ws://127.0.0.1:8080/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client(pid) {
  const c = { pid, ws: null, g: null, code: "", errs: [], seq: 1 };
  c.open = () => new Promise((res) => {
    const ws = new WebSocket(URL); c.ws = ws;
    ws.on("open", () => res(true));
    ws.on("message", (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.k === "state") { c.g = m.g; c.code = m.code; }
      else if (m.k === "err") c.errs.push(m.m);
    });
    ws.on("error", () => res(false));
  });
  c.raw = (o) => c.ws.send(JSON.stringify(o));
  c.act = (t, d) => c.raw({ k: "act", pid, code: c.code, a: { p: pid, s: c.seq++, t, d: d || {} } });
  return c;
}

let fails = 0;
const ok = (l, cond, extra) => { console.log((cond ? "  PASS  " : "  FAIL  ") + l + (extra ? "  " + extra : "")); if (!cond) fails++; };
const names = (g) => g.order.map((i) => g.players[i].name + (g.players[i].cls ? ":" + g.players[i].cls : ":—")).join(" ");

const H = client("host"), B = client("bee"), C = client("cee"), D = client("dee");
await H.open(); await B.open(); await C.open();

H.raw({ k: "create", pid: H.pid, name: "Host" });
await wait(400);
for (const [c, n] of [[B, "Bee"], [C, "Cee"]]) { c.code = H.code; c.raw({ k: "join", pid: c.pid, code: H.code, name: n }); }
await wait(500);

console.log("\n1. Everyone in the lobby sees everyone");
ok("host sees all three", H.g.order.length === 3, names(H.g));
ok("guest B sees all three", B.g.order.length === 3, names(B.g));
ok("guest C sees all three", C.g.order.length === 3, names(C.g));

console.log("\n2. Everyone can pick a class — including the host");
H.act("CLASS", { cls: "sword" });
B.act("CLASS", { cls: "archer" });
C.act("CLASS", { cls: "mage" });
await wait(500);
ok("host picked a class", H.g.players[H.pid].cls === "sword");
ok("guests picked classes", H.g.players[B.pid].cls === "archer" && H.g.players[C.pid].cls === "mage");
ok("everyone sees everyone's class", B.g.players[H.pid].cls === "sword" && C.g.players[B.pid].cls === "archer", names(B.g));

console.log("\n3. Classes can be changed while still in the lobby");
C.act("CLASS", { cls: "sword" });
await wait(400);
ok("guest swapped mage -> sword", H.g.players[C.pid].cls === "sword");
C.act("CLASS", { cls: "mage" });
await wait(400);
ok("and swapped back", H.g.players[C.pid].cls === "mage");

console.log("\n4. The host can start whenever they like");
ok("still in the lobby until the host says otherwise", H.g.phase === "lobby");
H.act("START", {});
await wait(500);
ok("host starts the adventure", H.g.phase === "play", "phase=" + H.g.phase);
ok("every client moved to play together", B.g.phase === "play" && C.g.phase === "play");

console.log("\n5. The host is a normal player who fights");
const en = (H.g.enemies || []).filter((e) => e.hp > 0)[0];
ok("host has a character in the world", !!H.g.players[H.pid].cls && H.g.players[H.pid].hp > 0, "hp=" + H.g.players[H.pid].hp);
if (en) {
  const hp0 = en.hp;
  H.act("ATK", { tid: en.uid });
  await wait(350);
  ok("host can attack", (H.g.enemies.find((e) => e.uid === en.uid) || {}).hp < hp0);
} else ok("an enemy exists to attack", false);

console.log("\n6. Starting with someone who never picked a class");
await D.open();
D.code = H.code;
D.raw({ k: "join", pid: D.pid, code: H.code, name: "Dee" });
await wait(500);
const joined = !!H.g.players[D.pid];
ok("late join follows the host's joinAfterStart setting", joined === (H.g.settings.joinAfterStart !== false),
   "joinAfterStart=" + H.g.settings.joinAfterStart + " joined=" + joined + (D.errs[0] ? " err=" + D.errs[0] : ""));
if (joined) {
  ok("late joiner starts with no class", !H.g.players[D.pid].cls);
  D.act("CLASS", { cls: "archer" });
  await wait(400);
  ok("late joiner can pick a class mid-adventure", H.g.players[D.pid].cls === "archer", names(H.g));
}

console.log(fails === 0 ? "\nALL CHECKS PASSED" : "\n" + fails + " CHECK(S) FAILED");
process.exit(fails === 0 ? 0 : 1);
