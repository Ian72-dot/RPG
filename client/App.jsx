import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ============================================================================
   EMBERVOW  —  a cooperative real-time browser RPG
   Original characters, monsters, items, dialogue and story.
   Networking: shared artifact storage acts as the game server; the host runs
   the authoritative simulation and is the only writer of game state.
   ========================================================================== */

const CSS = `
.ev *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.ev{
  --ink:#0b0d12; --iron:#141924; --slate:#1d2532; --edge:#2f3a4c; --edge2:#42506a;
  --gold:#d8a657; --gold2:#f0cd8a; --blood:#c7414a; --moss:#6fbf73; --arcane:#7c8cf8;
  --vellum:#e7e2d6; --dim:#8e97a9; --rust:#b5734a;
  position:relative; display:flex; flex-direction:column; width:100%; height:100%;
  min-height:600px; background:var(--ink); color:var(--vellum); overflow:hidden;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  font-size:15px; line-height:1.45;
}
.ev .disp{font-family:"Iowan Old Style",Palatino,"Palatino Linotype",Georgia,serif;letter-spacing:.04em}
.ev .num{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.ev .eyebrow{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim);font-weight:600}
.ev .col{display:flex;flex-direction:column;min-height:0}
.ev .row{display:flex;align-items:center;gap:8px}
.ev .grow{flex:1;min-height:0;min-width:0}
.ev .sp{flex:1}
.ev .pad{padding:14px}
.ev .center{align-items:center;justify-content:center}
.ev .hide{display:none}

/* --- buttons --- */
.ev .btn{
  appearance:none;border:1px solid var(--edge);background:linear-gradient(180deg,var(--slate),#161d28);
  color:var(--vellum);border-radius:10px;padding:12px 14px;font-size:15px;font-weight:600;
  cursor:pointer;min-height:48px;display:flex;align-items:center;justify-content:center;gap:8px;
  text-align:center;transition:transform .07s ease,border-color .15s,background .15s;font-family:inherit;
}
.ev .btn:active{transform:translateY(1px)}
.ev .btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.ev .btn[disabled]{opacity:.42;cursor:default}
.ev .btn.gold{border-color:#7a5c26;background:linear-gradient(180deg,#3a2d15,#241a0c);color:var(--gold2)}
.ev .btn.gold:not([disabled]):hover{border-color:var(--gold)}
.ev .btn.big{min-height:62px;font-size:17px;letter-spacing:.04em}
.ev .btn.sm{min-height:38px;padding:6px 10px;font-size:13px;border-radius:8px}
.ev .btn.danger{border-color:#6a2b30;color:#f0a6ab}
.ev .btn.on{border-color:var(--gold);box-shadow:inset 0 0 0 1px rgba(216,166,87,.35)}
.ev .btn .lbl{display:flex;flex-direction:column;line-height:1.15;align-items:center}
.ev .btn .sub{font-size:10px;font-weight:600;letter-spacing:.1em;color:var(--dim)}
.ev .cdfill{position:absolute;left:0;bottom:0;width:100%;background:rgba(216,166,87,.14);pointer-events:none}
.ev .btnwrap{position:relative;overflow:hidden;border-radius:10px;display:flex}
.ev .btnwrap>.btn{flex:1}

/* --- panels --- */
.ev .panel{background:var(--iron);border:1px solid var(--edge);border-radius:12px}
.ev .hr{height:1px;background:var(--edge);margin:10px 0}
.ev .chip{font-size:11px;padding:2px 7px;border-radius:99px;border:1px solid var(--edge2);color:var(--dim);white-space:nowrap}

/* --- scene --- */
.ev .scene{position:relative;width:100%;flex:0 0 auto;overflow:hidden;border-bottom:1px solid var(--edge)}
.ev .scene svg{display:block;width:100%;height:100%}
.ev .scenetop{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;
  padding:8px 10px;gap:8px;background:linear-gradient(180deg,rgba(6,8,12,.85),rgba(6,8,12,0))}
.ev .scenebot{position:absolute;bottom:0;left:0;right:0;padding:16px 10px 7px;
  background:linear-gradient(0deg,rgba(6,8,12,.92),rgba(6,8,12,0))}
.ev .float{position:absolute;font-weight:800;pointer-events:none;animation:fl 1.15s ease-out forwards;
  text-shadow:0 2px 6px #000;font-family:ui-monospace,monospace}
@keyframes fl{0%{opacity:0;transform:translateY(6px) scale(.8)}18%{opacity:1;transform:translateY(0) scale(1.12)}
  100%{opacity:0;transform:translateY(-42px) scale(1)}}
.ev .shake{animation:shk .32s ease}
@keyframes shk{0%,100%{transform:translate(0,0)}25%{transform:translate(-4px,2px)}50%{transform:translate(4px,-2px)}75%{transform:translate(-2px,-1px)}}

/* --- log --- */
.ev .log{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:5px;
  background:radial-gradient(120% 60% at 50% 0%,#121722 0%,var(--ink) 70%)}
.ev .le{font-size:13.5px;padding-left:10px;border-left:2px solid transparent;color:var(--vellum);opacity:.96;
  animation:in .25s ease}
@keyframes in{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
.ev .le.sys{color:var(--dim);border-color:#2c3646;font-style:italic}
.ev .le.hit{border-color:#5d2b30}
.ev .le.hurt{border-color:var(--blood);color:#f3b9bd}
.ev .le.loot{border-color:var(--gold);color:var(--gold2)}
.ev .le.talk{border-color:#5b4c8a;color:#c9bff2}
.ev .le.mons{border-color:#6b4a2a;color:#e2c3a3;font-style:italic}
.ev .le.good{border-color:var(--moss);color:#b6e6b9}
.ev .le.big{border-color:var(--gold);color:var(--gold2);font-size:15px;font-weight:700;letter-spacing:.03em;
  font-family:"Iowan Old Style",Georgia,serif}
.ev .le.chat{border-color:var(--arcane);color:#d3d9ff}
.ev .le b{color:var(--gold2);font-weight:700}

/* --- bars --- */
.ev .bar{position:relative;height:14px;border-radius:7px;background:#0a0d14;border:1px solid var(--edge);overflow:hidden}
.ev .bar>i{display:block;height:100%;transition:width .35s cubic-bezier(.2,.8,.3,1)}
.ev .bar>span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:9.5px;font-weight:700;letter-spacing:.06em;text-shadow:0 1px 2px #000;
  font-family:ui-monospace,monospace}
.ev .bar.thin{height:7px;border-radius:4px}
.ev .hpf{background:linear-gradient(90deg,#8e2b33,#c7414a)}
.ev .exf{background:linear-gradient(90deg,#4c3f8f,#7c8cf8)}
.ev .mnf{background:linear-gradient(90deg,#1f5f8a,#49b6e0)}
.ev .enf{background:linear-gradient(90deg,#7a4324,#c2703c)}

/* --- sheets --- */
.ev .scrim{position:absolute;inset:0;background:rgba(5,7,11,.72);z-index:40;display:flex;
  flex-direction:column;justify-content:flex-end;animation:fade .18s ease}
@keyframes fade{from{opacity:0}to{opacity:1}}
.ev .sheet{background:var(--iron);border-top:1px solid var(--edge2);border-radius:16px 16px 0 0;
  max-height:88%;display:flex;flex-direction:column;animation:up .22s cubic-bezier(.2,.9,.3,1);
  box-shadow:0 -18px 44px rgba(0,0,0,.6)}
@keyframes up{from{transform:translateY(28px);opacity:.4}to{transform:none;opacity:1}}
.ev .sheeth{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--edge)}
.ev .sheetb{overflow-y:auto;padding:12px 14px 18px;display:flex;flex-direction:column;gap:10px}
.ev .x{margin-left:auto;border:1px solid var(--edge);background:none;color:var(--dim);border-radius:8px;
  width:34px;height:34px;font-size:18px;cursor:pointer;line-height:1;font-family:inherit}

/* --- cards --- */
.ev .card{border:1px solid var(--edge);border-radius:10px;background:var(--slate);padding:10px;
  display:flex;gap:10px;align-items:center;text-align:left}
.ev .card.act{cursor:pointer}
.ev .card.act:active{transform:translateY(1px)}
.ev .card.sel{border-color:var(--gold);box-shadow:inset 0 0 0 1px rgba(216,166,87,.3)}
.ev .ico{width:38px;height:38px;flex:0 0 auto;border-radius:8px;border:1px solid var(--edge2);
  background:#11161f;display:flex;align-items:center;justify-content:center}
.ev .r0{color:#b9c0cd}.ev .r1{color:#7fc98a}.ev .r2{color:#5fa8e8}.ev .r3{color:#b78ce8}.ev .r4{color:var(--gold2)}
.ev .b0{border-color:#3a4457}.ev .b1{border-color:#2f6b3c}.ev .b2{border-color:#2b5c86}.ev .b3{border-color:#5a3d8a}
.ev .b4{border-color:#8a6a25}
.ev .tiny{font-size:11.5px;color:var(--dim)}
.ev .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ev .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.ev input,.ev select{background:#0d1119;border:1px solid var(--edge);color:var(--vellum);border-radius:9px;
  padding:11px 12px;font-size:16px;width:100%;font-family:inherit}
.ev input:focus,.ev select:focus{outline:2px solid var(--gold);outline-offset:1px}
.ev .code{font-family:ui-monospace,monospace;letter-spacing:.34em;font-size:30px;color:var(--gold2);font-weight:700}
.ev .st{display:flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--edge);
  border-radius:8px;background:#11161f;font-size:12px}
.ev .party{display:flex;gap:8px;overflow-x:auto;padding:8px 10px;border-bottom:1px solid var(--edge);
  background:#10141d}
.ev .pcard{flex:0 0 auto;min-width:112px;border:1px solid var(--edge);border-radius:9px;padding:6px 8px;background:var(--iron)}
.ev .pcard.dead{opacity:.55;border-color:#5a2a2e}
.ev .pcard.me{border-color:var(--gold)}
.ev .btns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:9px 10px 12px;
  border-top:1px solid var(--edge);background:#10141d}
.ev .toast{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:60;background:#1b2231;
  border:1px solid var(--gold);color:var(--gold2);padding:9px 14px;border-radius:10px;font-size:13px;
  animation:fade .2s ease;max-width:90%;text-align:center}
.ev .pulse{animation:pl 1.6s ease-in-out infinite}
@keyframes pl{0%,100%{opacity:1}50%{opacity:.55}}
.ev .ring{transform:rotate(-90deg);transform-origin:center}
.ev .lgrid{display:grid;grid-template-columns:1fr;gap:0;min-height:0;flex:1}
@media (min-width:900px){
  .ev .lgrid{grid-template-columns:270px 1fr 300px;gap:0}
  .ev .sidebar{display:flex !important;border-right:1px solid var(--edge);overflow-y:auto;background:#10141d}
  .ev .sidebar.r{border-right:none;border-left:1px solid var(--edge)}
  .ev .btns{grid-template-columns:repeat(6,1fr)}
  .ev .scrim{justify-content:center;align-items:center}
  .ev .sheet{border-radius:16px;max-width:640px;width:92%;border:1px solid var(--edge2);max-height:82%}
}
.ev .sidebar{display:none}
@media (prefers-reduced-motion:reduce){.ev *{animation-duration:.01ms !important;transition-duration:.01ms !important}}
.ev.big-text{font-size:17px}
.ev.big-text .le{font-size:15.5px}
`;

/* ------------------------------- utilities ------------------------------- */

import * as ENG from "../shared/engine.js";
const {
  clamp, now, uid, cap, CODE_CHARS, makeCode, rngFrom, hashStr, pick, pickN, ri, fmtT, RAR, ITEMS, defItems, WK, AK, CK, UK, CLS_WEAPON, CLASSES, POOLS, STATUS, MONS, M, BIOMES, DUNGEON, BOSSES, TALK_OPTS, AFF, LINES, FACTS, DEFAULTS, DIFF_LABEL, FREQ_LABEL, LOSS_LABEL, WIPE_LABEL, expNeed, poolFor, rarityRoll, rollItem, statusBonus, derive, critChance, playerTakes, enemyTakes, hasSt, addSt, invSpace, addItem, takeSlot, itemPower, newGame, newPlayer, setClass, L, alive, active, liveEnemies, curBiome, tierOf, monPool, mkEnemy, mkBoss, ADJ, NOUN, areaName, SHOPKEEPERS, EVENTS, NPCS, genArea, areaWeights, rollType, DANGER, REWARD, genDestinations, startReady, toVote, resolveVote, travel, grantExp, killEnemy, victory, loseItems, playerDies, applyWipe, dotVal, applyWeaponFx, hitEnemy, doAttack, doTalk, pacify, eventFx, chestOffers, doHaggle, shopPrice, processAction, enemyAct, tickUnitStatus, tick,
} = ENG;


/* ==========================================================================
   ART — procedural, seeded SVG scenery and creature sprites (all original)
   ========================================================================== */
function ridge(r, w, h, baseY, amp, seg) {
  let d = "M0 " + h + " L0 " + baseY.toFixed(1);
  const step = w / seg;
  for (let i = 1; i <= seg; i++) d += " L" + (i * step).toFixed(1) + " " + (baseY + (r() - 0.5) * amp).toFixed(1);
  return d + " L" + w + " " + h + " Z";
}
function peaks(r, w, h, baseY, hgt, n) {
  let d = "M0 " + h + " L0 " + baseY;
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const x = i * step, pk = baseY - hgt * (0.5 + r() * 0.6);
    d += " L" + (x + step * 0.5).toFixed(1) + " " + pk.toFixed(1) + " L" + (x + step).toFixed(1) + " " + (baseY - r() * 8).toFixed(1);
  }
  return d + " L" + w + " " + h + " Z";
}
function Scene({ biome, area, dim }) {
  const W = 400, H = 210;
  const seed = (area && area.seed) || 1;
  const r = rngFrom(seed >>> 0);
  const p = biome.pal, sc = biome.scene;
  const parts = [];
  const key = (k) => sc + "-" + seed + "-" + k;
  // sky + celestial
  parts.push(<rect key="sky" x="0" y="0" width={W} height={H} fill={"url(#sky" + seed + ")"} />);
  const cx = 40 + r() * 320, cy = 30 + r() * 40;
  if (sc === "cavern" || sc === "vault") {
    for (let i = 0; i < 22; i++) {
      const x = r() * W, y = r() * 40, ww = 4 + r() * 10;
      parts.push(<path key={key("st" + i)} d={"M" + x + " 0 L" + (x + ww) + " 0 L" + (x + ww / 2) + " " + (18 + y) + " Z"} fill={p[1]} opacity="0.9" />);
    }
  } else {
    parts.push(<circle key="orb" cx={cx} cy={cy} r={sc === "pale" ? 30 : 18} fill={p[3]} opacity={sc === "waste" ? 0.35 : 0.55} />);
    parts.push(<circle key="orb2" cx={cx} cy={cy} r={sc === "pale" ? 46 : 30} fill={p[3]} opacity="0.12" />);
  }
  // far ridge
  const far = sc === "peaks" || sc === "sky" ? peaks(r, W, H, 150, 90, 6) : sc === "desert" ? ridge(r, W, H, 150, 26, 7) : ridge(r, W, H, 140, 34, 9);
  parts.push(<path key="far" d={far} fill={p[1]} opacity="0.85" />);
  // mid features
  const mid = [];
  if (sc === "forest" || sc === "swamp") {
    for (let i = 0; i < 12; i++) {
      const x = r() * W, hh = 50 + r() * 70, bw = 5 + r() * 5;
      mid.push(<g key={key("t" + i)} opacity={0.9}>
        <rect x={x} y={175 - hh} width={bw} height={hh} fill={p[0]} />
        <ellipse cx={x + bw / 2} cy={175 - hh} rx={16 + r() * 14} ry={12 + r() * 10} fill={p[2]} opacity={sc === "swamp" ? 0.55 : 0.8} />
      </g>);
    }
  } else if (sc === "cavern" || sc === "vault") {
    for (let i = 0; i < 9; i++) {
      const x = r() * W, hh = 30 + r() * 60, bw = 8 + r() * 12;
      mid.push(<path key={key("c" + i)} d={"M" + x + " 178 L" + (x + bw / 2) + " " + (178 - hh) + " L" + (x + bw) + " 178 Z"} fill={p[2]} opacity="0.75" />);
    }
  } else if (sc === "ruins" || sc === "castle") {
    for (let i = 0; i < 7; i++) {
      const x = 12 + i * 55 + r() * 12, hh = 55 + r() * 60;
      mid.push(<g key={key("p" + i)}><rect x={x} y={175 - hh} width={14} height={hh} fill={p[1]} />
        <rect x={x - 4} y={175 - hh - 6} width={22} height={7} fill={p[2]} opacity="0.8" /></g>);
    }
  } else if (sc === "desert" || sc === "waste") {
    for (let i = 0; i < 5; i++) {
      const x = r() * W;
      mid.push(<path key={key("d" + i)} d={"M" + x + " 178 q " + (20 + r() * 30) + " " + (-14 - r() * 16) + " " + (50 + r() * 40) + " 0 Z"} fill={p[2]} opacity="0.5" />);
    }
  } else if (sc === "peaks") {
    parts.push(<path key="snow" d={peaks(r, W, H, 165, 62, 5)} fill={p[2]} opacity="0.7" />);
  } else if (sc === "sky") {
    for (let i = 0; i < 5; i++) {
      const x = r() * W, y = 70 + r() * 70, ww = 40 + r() * 60;
      mid.push(<g key={key("i" + i)}><ellipse cx={x} cy={y} rx={ww / 2} ry={8} fill={p[2]} />
        <path d={"M" + (x - ww / 2) + " " + y + " L" + x + " " + (y + 30 + r() * 30) + " L" + (x + ww / 2) + " " + y + " Z"} fill={p[1]} /></g>);
    }
  } else if (sc === "pale") {
    for (let i = 0; i < 8; i++) {
      const x = r() * W, hh = 40 + r() * 70;
      mid.push(<rect key={key("m" + i)} x={x} y={178 - hh} width={3} height={hh} fill={p[2]} opacity="0.6" />);
    }
  }
  parts.push(<g key="mid">{mid}</g>);
  // ground
  parts.push(<path key="gnd" d={ridge(r, W, H, 176, 10, 12)} fill={p[0]} />);
  parts.push(<rect key="gfl" x="0" y="186" width={W} height={H - 186} fill={p[0]} />);
  // atmosphere particles
  const pr = [];
  const pcount = sc === "peaks" ? 16 : sc === "waste" || sc === "cinder" ? 14 : sc === "pale" ? 12 : 8;
  for (let i = 0; i < pcount; i++) {
    const x = r() * W, y = r() * H, rad = 0.8 + r() * 1.8, dur = 4 + r() * 6;
    pr.push(<circle key={key("pt" + i)} cx={x} cy={y} r={rad} fill={p[3]} opacity="0.5">
      <animate attributeName="cy" values={y + ";" + (sc === "waste" ? y - 40 : y + 40)} dur={dur + "s"} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.55;0" dur={dur + "s"} repeatCount="indefinite" />
    </circle>);
  }
  parts.push(<g key="parts">{pr}</g>);
  return (
    <svg viewBox={"0 0 " + W + " " + H} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={"sky" + seed} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p[1]} /><stop offset="60%" stopColor={p[0]} /><stop offset="100%" stopColor={p[0]} />
        </linearGradient>
        <linearGradient id={"fog" + seed} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p[2]} stopOpacity="0" /><stop offset="100%" stopColor={p[2]} stopOpacity="0.18" />
        </linearGradient>
      </defs>
      {parts}
      <rect x="0" y="80" width={W} height={130} fill={"url(#fog" + seed + ")"} />
      {dim ? <rect x="0" y="0" width={W} height={H} fill="#05070b" opacity="0.45" /> : null}
    </svg>
  );
}
function MonsterArt({ art, size, hurt }) {
  const [shape, c1, c2, eyes] = art || ["blob", "#888", "#ccc", 2];
  const s = size || 64, k = s / 64;
  const E = [];
  const n = clamp(eyes || 2, 0, 9);
  for (let i = 0; i < n; i++) {
    const cols = Math.min(3, n), row = Math.floor(i / cols), col = i % cols;
    const ex = 32 + (col - (Math.min(cols, n - row * cols) - 1) / 2) * 11;
    const ey = 26 + row * 9;
    E.push(<g key={i}><circle cx={ex} cy={ey} r="3.6" fill="#0b0d12" /><circle cx={ex + 1} cy={ey - 1} r="1.3" fill={c2} /></g>);
  }
  const body = {
    blob: <g><ellipse cx="32" cy="40" rx="22" ry="18" fill={c1} /><ellipse cx="32" cy="30" rx="16" ry="13" fill={c1} /><ellipse cx="26" cy="34" rx="6" ry="4" fill={c2} opacity=".5" /></g>,
    wisp: <g><ellipse cx="32" cy="32" rx="14" ry="18" fill={c1} opacity=".7" /><ellipse cx="32" cy="30" rx="8" ry="11" fill={c2} opacity=".6" /><path d="M32 48 q -6 10 0 14 q 6 -4 0 -14" fill={c1} opacity=".5" /></g>,
    beast: <g><ellipse cx="34" cy="40" rx="21" ry="13" fill={c1} /><circle cx="20" cy="30" r="11" fill={c1} /><path d="M12 24 l4 -9 l6 7 z" fill={c1} /><path d="M26 22 l3 -9 l5 8 z" fill={c1} /><path d="M52 38 q 12 -6 8 -16" stroke={c1} strokeWidth="4" fill="none" /><rect x="16" y="48" width="5" height="10" fill={c1} /><rect x="42" y="48" width="5" height="10" fill={c1} /></g>,
    insect: <g><ellipse cx="32" cy="42" rx="15" ry="12" fill={c1} /><circle cx="32" cy="26" r="11" fill={c1} /><path d="M22 20 l-8 -10 M42 20 l8 -10" stroke={c2} strokeWidth="2.5" /><path d="M18 40 l-12 6 M46 40 l12 6 M18 46 l-12 10 M46 46 l12 10" stroke={c1} strokeWidth="2.5" /></g>,
    treant: <g><rect x="26" y="30" width="12" height="30" fill={c1} /><ellipse cx="32" cy="26" rx="24" ry="17" fill={c2} opacity=".85" /><path d="M26 42 l-12 -8 M38 42 l12 -8" stroke={c1} strokeWidth="4" /></g>,
    crystal: <g><path d="M32 8 L48 34 L38 58 L26 58 L16 34 Z" fill={c1} /><path d="M32 8 L48 34 L32 40 Z" fill={c2} opacity=".7" /><path d="M32 8 L16 34 L32 40 Z" fill={c2} opacity=".4" /></g>,
    fowl: <g><ellipse cx="32" cy="38" rx="13" ry="16" fill={c1} /><path d="M20 32 q -18 4 -14 18 q 10 2 16 -8" fill={c1} opacity=".85" /><path d="M44 32 q 18 4 14 18 q -10 2 -16 -8" fill={c1} opacity=".85" /><path d="M32 50 l-4 10 M32 50 l4 10" stroke={c2} strokeWidth="2" /></g>,
    construct: <g><rect x="16" y="20" width="32" height="30" rx="4" fill={c1} /><rect x="20" y="50" width="8" height="10" fill={c1} /><rect x="36" y="50" width="8" height="10" fill={c1} /><rect x="8" y="24" width="8" height="20" fill={c1} /><rect x="48" y="24" width="8" height="20" fill={c1} /><rect x="22" y="26" width="20" height="4" fill={c2} opacity=".6" /></g>,
    humanoid: <g><circle cx="32" cy="22" r="10" fill={c1} /><path d="M22 34 h20 l4 20 h-28 z" fill={c1} /><rect x="26" y="54" width="5" height="8" fill={c1} /><rect x="34" y="54" width="5" height="8" fill={c1} /><path d="M20 36 l-8 14 M44 36 l8 14" stroke={c1} strokeWidth="4" /><path d="M22 14 q10 -10 20 0" stroke={c2} strokeWidth="3" fill="none" /></g>,
    ghost: <g><path d="M32 10 q18 0 18 22 v20 q-6 -6 -9 0 q-3 6 -9 0 q-6 -6 -9 0 q-3 6 -9 0 v-20 q0 -22 18 -22" fill={c1} opacity=".82" /><ellipse cx="32" cy="26" rx="12" ry="10" fill={c2} opacity=".25" /></g>,
    worm: <g><path d="M12 52 q10 -18 20 0 q10 18 20 0" stroke={c1} strokeWidth="13" fill="none" strokeLinecap="round" /><circle cx="52" cy="34" r="10" fill={c1} /><circle cx="52" cy="34" r="5" fill="#0b0d12" /></g>,
    fungus: <g><rect x="28" y="34" width="8" height="24" fill={c2} /><path d="M8 36 q24 -30 48 0 z" fill={c1} /><circle cx="22" cy="28" r="3" fill={c2} opacity=".8" /><circle cx="40" cy="24" r="3.5" fill={c2} opacity=".8" /></g>,
    wyrm: <g><path d="M6 54 q14 -12 26 -6 q16 8 26 -14" stroke={c1} strokeWidth="11" fill="none" strokeLinecap="round" /><path d="M52 24 q10 4 8 14 q-10 4 -16 -6 z" fill={c1} /><path d="M30 40 l-6 -16 l14 6 z" fill={c2} opacity=".7" /><path d="M56 22 l6 -8 M50 20 l2 -10" stroke={c2} strokeWidth="2.5" /></g>,
    void: <g><circle cx="32" cy="34" r="22" fill="#05060a" /><circle cx="32" cy="34" r="22" fill={c1} opacity=".7" /><circle cx="32" cy="34" r="14" fill="#05060a" /><path d="M14 34 q18 -20 36 0 q-18 20 -36 0" fill={c2} opacity=".18" /></g>,
  }[shape] || null;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" style={{ filter: hurt ? "brightness(1.9) saturate(.4)" : "none", transition: "filter .12s" }} aria-hidden="true">
      <ellipse cx="32" cy="60" rx="20" ry="4" fill="#000" opacity=".35" />
      {body}
      {shape !== "worm" ? E : null}
    </svg>
  );
}
const ICON_PATH = {
  sword: "M32 6 L38 34 L32 46 L26 34 Z M22 44 h20 v5 h-20 z M30 49 h4 v9 h-4 z",
  bow: "M20 8 q22 24 0 48 M20 8 q10 24 0 48 M44 32 h-22 M26 28 l-6 4 l6 4",
  rod: "M22 52 L40 18 M40 18 m0 0 a8 8 0 1 0 0.1 0 M34 44 l6 3",
  arrows: "M32 6 v46 M32 6 l-7 10 M32 6 l7 10 M32 52 l-6 6 M32 52 l6 6",
  armor: "M32 8 l18 8 v14 q0 18 -18 26 q-18 -8 -18 -26 v-14 z",
  acc: "M32 20 a13 13 0 1 0 0.1 0 M32 30 a3 3 0 1 0 0.1 0",
  use: "M26 10 h12 v8 l6 12 v22 a4 4 0 0 1 -4 4 h-16 a4 4 0 0 1 -4 -4 v-22 l6 -12 z",
};
function ItemIcon({ id, size }) {
  const it = ITEMS[id]; if (!it) return null;
  const s = size || 24;
  const cols = ["#b9c0cd", "#7fc98a", "#5fa8e8", "#b78ce8", "#f0cd8a"];
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden="true">
      <path d={ICON_PATH[it.kind] || ICON_PATH.acc} fill={it.kind === "bow" || it.kind === "rod" || it.kind === "arrows" ? "none" : cols[it.rar]}
        stroke={cols[it.rar]} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
    </svg>
  );
}

/* ==========================================================================
   AUDIO — small synthesised cues (no external assets)
   ========================================================================== */
const Audio2 = {
  ctx: null, music: 0.35, sfxv: 0.5, muted: false, loop: null, scale: [0, 3, 5, 7, 10],
  init() {
    if (this.ctx) return this.ctx;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    return this.ctx;
  },
  beep(freq, dur, type, vol, slide) {
    if (this.muted) return;
    const c = this.init(); if (!c) return;
    if (c.state === "suspended") c.resume();
    const o = c.createOscillator(), g2 = c.createGain();
    o.type = type || "triangle"; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), c.currentTime + dur);
    g2.gain.value = 0.0001;
    g2.gain.exponentialRampToValueAtTime(Math.max(0.0002, (vol || 0.2) * this.sfxv), c.currentTime + 0.012);
    g2.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g2); g2.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  },
  sfx(n) {
    if (this.muted) return;
    if (n === "hit") this.beep(220, 0.14, "square", 0.16, 90);
    else if (n === "crit") { this.beep(320, 0.2, "sawtooth", 0.2, 120); setTimeout(() => this.beep(520, 0.16, "square", 0.14), 60); }
    else if (n === "hurt") this.beep(150, 0.22, "sawtooth", 0.16, 70);
    else if (n === "heal") { this.beep(520, 0.16, "sine", 0.16); setTimeout(() => this.beep(700, 0.2, "sine", 0.14), 80); }
    else if (n === "loot") { this.beep(660, 0.1, "triangle", 0.14); setTimeout(() => this.beep(880, 0.16, "triangle", 0.12), 70); }
    else if (n === "level") { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, 0.22, "triangle", 0.16), i * 90)); }
    else if (n === "tap") this.beep(420, 0.05, "square", 0.07);
    else if (n === "big") { this.beep(160, 0.5, "sawtooth", 0.16, 80); }
    else if (n === "die") { this.beep(200, 0.7, "sawtooth", 0.2, 55); }
  },
  startMusic(tier) {
    this.stopMusic();
    const c = this.init(); if (!c || this.muted) return;
    const root = 110 * Math.pow(2, ((tier % 5) * 2) / 12);
    let i = 0;
    this.loop = setInterval(() => {
      if (this.muted) return;
      const n = this.scale[i % this.scale.length];
      const f = root * Math.pow(2, n / 12) * (i % 8 === 0 ? 0.5 : 1);
      const o = c.createOscillator(), g2 = c.createGain();
      o.type = "sine"; o.frequency.value = f;
      g2.gain.value = 0.0001;
      g2.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.08 * this.music), c.currentTime + 0.3);
      g2.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.6);
      o.connect(g2); g2.connect(c.destination); o.start(); o.stop(c.currentTime + 1.7);
      i++;
    }, 900);
  },
  stopMusic() { if (this.loop) { clearInterval(this.loop); this.loop = null; } },
};

/* ==========================================================================
   NETWORKING HOOK — host runs the simulation, everyone else reads state
   ========================================================================== */

function loadIdent() { try { const j = JSON.parse(localStorage.getItem("embervow.id") || "{}"); return j && j.evid ? j : null; } catch (e) { return null; } }
function saveIdent(o) { try { localStorage.setItem("embervow.id", JSON.stringify(o)); } catch (e) {} }
function wsUrl() {
  const l = window.location;
  const proto = l.protocol === "https:" ? "wss://" : "ws://";
  return proto + l.host + "/ws";
}

/* Real online transport. The Node server is the single authority: it owns the
   game object, runs tick(), and validates every action through processAction().
   The client sends intents and renders whatever the server last told it. */
function useGame() {
  const identRef = useRef(null);
  if (!identRef.current) identRef.current = loadIdent() || { evid: uid() + uid(), name: "", code: "" };
  const myId = identRef.current.evid;

  const [g, setG] = useState(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState({ msg: "", err: "", host: false, lag: 0 });

  const wsRef = useRef(null), gRef = useRef(null), codeRef = useRef("");
  const seqRef = useRef(1), offRef = useRef(0), outRef = useRef([]);
  const reqRef = useRef(null), pingRef = useRef(0), retryRef = useRef(0);

  const flush = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) return;
    while (outRef.current.length) { try { ws.send(JSON.stringify(outRef.current.shift())); } catch (e) { break; } }
  }, []);

  const onMsg = useCallback((raw) => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.k === "state") {
      offRef.current = m.t - Date.now();
      if (m.code) { codeRef.current = m.code; setCode(m.code); }
      gRef.current = m.g; setG(m.g);
      setStatus((s) => Object.assign({}, s, { err: "", host: !!(m.g && m.g.hostId === myId), lag: pingRef.current }));
      if (reqRef.current) { const r = reqRef.current; reqRef.current = null; r(true); }
    } else if (m.k === "err") {
      setStatus((s) => Object.assign({}, s, { err: m.m || "Something went wrong." }));
      if (reqRef.current) { const r = reqRef.current; reqRef.current = null; r(false); }
    } else if (m.k === "bye") {
      codeRef.current = ""; gRef.current = null; setCode(""); setG(null);
    } else if (m.k === "pong") {
      pingRef.current = Date.now() - m.c;
    }
  }, [myId]);

  const connect = useCallback(() => new Promise((res) => {
    const cur = wsRef.current;
    if (cur && cur.readyState === 1) return res(true);
    if (cur && cur.readyState === 0) { cur.addEventListener("open", () => res(true), { once: true }); return; }
    let ws;
    try { ws = new WebSocket(wsUrl()); } catch (e) { return res(false); }
    wsRef.current = ws;
    let done = false;
    ws.onopen = () => { done = true; retryRef.current = 0; setStatus((s) => Object.assign({}, s, { err: "" })); flush(); res(true); };
    ws.onmessage = (ev) => onMsg(ev.data);
    ws.onerror = () => { if (!done) { done = true; res(false); } };
    ws.onclose = () => {
      if (!done) { done = true; res(false); }
      if (wsRef.current === ws) wsRef.current = null;
      if (codeRef.current) setStatus((s) => Object.assign({}, s, { err: "Connection lost — reconnecting…" }));
    };
    setTimeout(() => { if (!done) { done = true; res(false); } }, 8000);
  }), [flush, onMsg]);

  const request = useCallback(async (msg) => {
    const ok = await connect();
    if (!ok) { setStatus((s) => Object.assign({}, s, { err: "Could not reach the server." })); return false; }
    return await new Promise((res) => {
      reqRef.current = res;
      try { wsRef.current.send(JSON.stringify(msg)); } catch (e) { reqRef.current = null; return res(false); }
      setTimeout(() => { if (reqRef.current === res) { reqRef.current = null; res(false); } }, 9000);
    });
  }, [connect]);

  const send = useCallback((t, d) => {
    const a = { p: myId, s: seqRef.current++, t, d: d || {} };
    const msg = { k: "act", pid: myId, code: codeRef.current, a };
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(msg)); } catch (e) { outRef.current.push(msg); } }
    else { outRef.current.push(msg); if (outRef.current.length > 60) outRef.current.splice(0, 20); }
  }, [myId]);

  const create = useCallback(async (name, settings) => {
    const nm = String(name || "Wanderer").slice(0, 14);
    identRef.current.name = nm; saveIdent(identRef.current);
    const ok = await request({ k: "create", pid: myId, name: nm, settings: settings || null });
    if (ok) { identRef.current.code = codeRef.current; saveIdent(identRef.current); }
    return ok;
  }, [request, myId]);

  const join = useCallback(async (c, name) => {
    const cc = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!cc) { setStatus((s) => Object.assign({}, s, { err: "Enter a game code." })); return false; }
    const nm = String(name || "Wanderer").slice(0, 14);
    identRef.current.name = nm; saveIdent(identRef.current);
    const ok = await request({ k: "join", pid: myId, code: cc, name: nm });
    if (ok) { identRef.current.code = cc; saveIdent(identRef.current); }
    return ok;
  }, [request, myId]);

  const leave = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify({ k: "leave", pid: myId, code: codeRef.current })); } catch (e) {} }
    codeRef.current = ""; gRef.current = null;
    identRef.current.code = ""; saveIdent(identRef.current);
    setCode(""); setG(null);
    setStatus({ msg: "", err: "", host: false, lag: 0 });
  }, [myId]);

  /* keepalive + automatic rejoin after a drop */
  useEffect(() => {
    const iv = setInterval(async () => {
      if (!codeRef.current) return;
      const ws = wsRef.current;
      if (ws && ws.readyState === 1) {
        try { ws.send(JSON.stringify({ k: "ping", c: Date.now() })); } catch (e) {}
        send("HB", {});
      } else if (retryRef.current < 200) {
        retryRef.current++;
        await request({ k: "join", pid: myId, code: codeRef.current, name: identRef.current.name });
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [send, request, myId]);

  /* offer a one-tap rejoin if the tab was refreshed mid-adventure */
  const lastCode = identRef.current.code || "";
  const srvNow = useCallback(() => Date.now() + offRef.current, []);
  return { g, myId, code, send, create, join, leave, status, srvNow, ident: identRef.current, isHost: !!(g && g.hostId === myId), lastCode };
}


/* ==========================================================================
   UI ATOMS
   ========================================================================== */
function Bar({ v, max, cls, label, thin }) {
  const pct = clamp((v / Math.max(1, max)) * 100, 0, 100);
  return (
    <div className={"bar" + (thin ? " thin" : "")} role="img" aria-label={label || ""}>
      <i className={cls} style={{ width: pct + "%" }} />
      {!thin && label ? <span>{label}</span> : null}
    </div>
  );
}
function Stx({ st, small }) {
  if (!st || !st.length) return null;
  return (
    <span className="row" style={{ gap: 4, flexWrap: "wrap" }}>
      {st.map((s, i) => {
        const d = STATUS[s.k]; if (!d) return null;
        return <span key={i} title={d.name + " — " + d.desc} style={{ fontSize: small ? 10 : 12, color: d.c, border: "1px solid " + d.c + "55", borderRadius: 5, padding: "0 4px", lineHeight: 1.5 }}>{d.g}{small ? "" : " " + d.name}</span>;
      })}
    </span>
  );
}
function Sheet({ title, sub, onClose, children, foot }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sheeth">
          <div>
            <div className="disp" style={{ fontSize: 18, color: "var(--gold2)" }}>{title}</div>
            {sub ? <div className="tiny">{sub}</div> : null}
          </div>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="sheetb">{children}</div>
        {foot ? <div style={{ padding: "10px 14px", borderTop: "1px solid var(--edge)" }}>{foot}</div> : null}
      </div>
    </div>
  );
}
function ItemRow({ id, right, onClick, sub, sel }) {
  const it = ITEMS[id]; if (!it) return null;
  return (
    <div className={"card" + (onClick ? " act" : "") + (sel ? " sel" : "") + " b" + it.rar} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="ico"><ItemIcon id={id} size={26} /></div>
      <div className="grow">
        <div className={"r" + it.rar} style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
        <div className="tiny">{sub !== undefined ? sub : itemLine(it)}</div>
      </div>
      {right}
    </div>
  );
}
function itemLine(it) {
  const bits = [];
  if (it.kind === "sword" || it.kind === "bow" || it.kind === "rod") {
    if (it.fx !== "heal" && it.fx !== "ward") bits.push(it.dmg + " dmg");
    else bits.push(it.dmg + (it.fx === "heal" ? " heal" : ""));
    bits.push(it.cd + "s cd");
    if (it.mana) bits.push(it.mana + " mana");
  }
  if (it.kind === "arrows") bits.push("+" + it.dmg + " dmg");
  if (it.kind === "armor") bits.push(it.dcd + "s defend cd", Math.round(it.red * 100) + "% guard");
  Object.keys(it.b || {}).forEach((k) => bits.push("+" + it.b[k] + " " + ({ hp: "HP", atk: "Atk", def: "Def", spd: "Spd", cha: "Cha", mana: "Mana", cdr: "% cooldown", loot: "% loot" })[k]));
  if (it.fx && !["heal", "ward"].includes(it.fx)) bits.push(cap(it.fx));
  if (it.use) {
    if (it.use.hp) bits.push("+" + it.use.hp + " HP");
    if (it.use.mana) bits.push("+" + it.use.mana + " mana");
    if (it.use.cure) bits.push("cures effects");
    if (it.use.buff) bits.push(STATUS[it.use.buff[0]].name + " " + it.use.buff[1] * 10 + "s");
  }
  return RAR[it.rar] + " · " + bits.join(" · ");
}

const CSS2 = `
.ev .mobonly{display:flex}
@media (min-width:900px){ .ev .mobonly{display:none !important} }
.ev .vt{width:100%;border-collapse:collapse;font-size:13px}
.ev .vt th{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);text-align:left;padding:6px 6px;border-bottom:1px solid var(--edge)}
.ev .vt td{padding:7px 6px;border-bottom:1px solid #202836}
.ev .full{position:absolute;inset:0;z-index:50;background:rgba(6,8,13,.94);display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:20px;gap:12px;text-align:center;overflow-y:auto}
.ev .title{font-family:"Iowan Old Style",Palatino,Georgia,serif;font-size:38px;letter-spacing:.16em;color:var(--gold2);
  text-shadow:0 3px 18px rgba(216,166,87,.28);line-height:1}
.ev .opt{border:1px solid var(--edge);border-radius:11px;padding:11px 12px;background:var(--slate);cursor:pointer;text-align:left}
.ev .opt.sel{border-color:var(--gold);background:#2a2416}
`;

/* ============================== HOME ============================== */
function Home({ G }) {
  const [name, setName] = useState(G.ident.name || "");
  const [mode, setMode] = useState(null);
  const [code, setCodeIn] = useState("");
  const [busy, setBusy] = useState(false);
  const bg = useMemo(() => ({ pal: BIOMES[0].pal, scene: "forest" }), []);
  const go = async (fn) => { setBusy(true); await fn(); setBusy(false); };
  const nm = (name || "").trim() || "Adventurer";
  return (
    <div className="col grow" style={{ position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
        <Scene biome={{ pal: BIOMES[0].pal, scene: "forest" }} area={{ seed: 77 }} dim />
      </div>
      <div className="col grow center pad" style={{ position: "relative", gap: 14, justifyContent: "center" }}>
        <div className="eyebrow">A cooperative real-time RPG</div>
        <div className="title">EMBERVOW</div>
        <div className="tiny" style={{ maxWidth: 330, textAlign: "center" }}>
          One to fifteen adventurers, one game code. No turns — everything runs on cooldowns, and the party decides where to go next.
        </div>
        <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          <input value={name} maxLength={14} placeholder="Your name" onChange={(e) => setName(e.target.value)} aria-label="Your name" />
          {mode !== "join" ? (
            <>
              <button className="btn big gold" disabled={busy} onClick={() => go(() => G.create(nm))}>CREATE GAME</button>
              <button className="btn big" onClick={() => setMode("join")}>JOIN GAME</button>
            </>
          ) : (
            <>
              <input value={code} maxLength={5} placeholder="GAME CODE" aria-label="Game code"
                style={{ textAlign: "center", letterSpacing: ".3em", textTransform: "uppercase", fontSize: 22 }}
                onChange={(e) => setCodeIn(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") go(() => G.join(code, nm)); }} />
              <button className="btn big gold" disabled={busy || code.length < 4} onClick={() => go(() => G.join(code, nm))}>JOIN</button>
              <button className="btn" onClick={() => setMode(null)}>Back</button>
            </>
          )}
          {G.ident.code && mode !== "join" ? (
            <button className="btn sm" onClick={() => go(() => G.join(G.ident.code, nm))}>Rejoin {G.ident.code}</button>
          ) : null}
          {G.status.err ? <div className="tiny" style={{ color: "var(--blood)", textAlign: "center" }}>{G.status.err}</div> : null}
        </div>
        <div className="tiny" style={{ maxWidth: 330, marginTop: 10, opacity: .75 }}>
          {true
            ? "Share the code and friends can join from their own phones."
            : "Shared storage is unavailable here, so this session syncs between browser tabs on this device only."}
        </div>
      </div>
    </div>
  );
}

/* ============================== SETTINGS ============================== */
function SettingsSheet({ g, send, onClose }) {
  const s = g.settings;
  const set = (k, v) => send("RSET", { [k]: v });
  const Num = ({ k, label, min, max, step, suffix }) => (
    <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
      <div style={{ fontSize: 13 }}>{label}</div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm" onClick={() => set(k, clamp(s[k] - (step || 1), min, max))} aria-label={"Decrease " + label}>−</button>
        <div className="num" style={{ minWidth: 46, textAlign: "center", color: "var(--gold2)" }}>{s[k]}{suffix || ""}</div>
        <button className="btn sm" onClick={() => set(k, clamp(s[k] + (step || 1), min, max))} aria-label={"Increase " + label}>+</button>
      </div>
    </div>
  );
  const Sel = ({ k, label, opts }) => (
    <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
      <div style={{ fontSize: 13 }}>{label}</div>
      <select style={{ width: 168 }} value={String(s[k])} onChange={(e) => { const v = e.target.value; set(k, v === "true" ? true : v === "false" ? false : isNaN(Number(v)) ? v : Number(v)); }}>
        {opts.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
      </select>
    </div>
  );
  return (
    <Sheet title="Game settings" sub="Only the host can change these" onClose={onClose}>
      <div className="eyebrow">Party</div>
      <Num k="maxPlayers" label="Maximum players" min={1} max={15} />
      <Num k="minPlayers" label="Minimum to start" min={1} max={15} />
      <Sel k="joinAfterStart" label="Join after start" opts={[[true, "Allowed"], [false, "Locked"]]} />
      <div className="hr" /><div className="eyebrow">Ready</div>
      <Sel k="autoReady" label="Automatic ready timer" opts={[[true, "On"], [false, "Off"]]} />
      <Num k="readyTimer" label="Ready timer" min={10} max={180} step={5} suffix="s" />
      <Num k="voteTimer" label="Voting time" min={10} max={90} step={5} suffix="s" />
      <div className="hr" /><div className="eyebrow">Adventure</div>
      <Num k="biomes" label="Biomes before the vault" min={1} max={10} />
      <Num k="minAreas" label="Min areas before a new biome" min={1} max={20} />
      <Num k="maxAreas" label="Max areas before one is forced" min={1} max={30} />
      <Num k="dungeonAreas" label="Areas inside the final vault" min={1} max={8} />
      <Sel k="difficulty" label="Difficulty" opts={[[0, "Gentle"], [1, "Standard"], [2, "Harsh"], [3, "Merciless"]]} />
      <Sel k="monsterPower" label="Monster power" opts={[[0.7, "Weaker"], [1, "Normal"], [1.35, "Stronger"]]} />
      <Sel k="loot" label="Loot rarity" opts={[[0, "Stingy"], [1, "Normal"], [2, "Generous"]]} />
      <Sel k="shopFreq" label="Shop frequency" opts={[[0.5, "Rare"], [1, "Normal"], [2, "Common"]]} />
      <Sel k="treasureFreq" label="Treasure frequency" opts={[[0.5, "Rare"], [1, "Normal"], [2, "Common"]]} />
      <div className="hr" /><div className="eyebrow">Death</div>
      <Num k="respawn" label="Respawn time" min={3} max={60} step={1} suffix="s" />
      <Sel k="lossMode" label="Items lost on death" opts={[["none", "Nothing"], ["cons", "1 random consumable"], ["one", "1 item"], ["two", "2 items"], ["half", "Half the pack"]]} />
      <Sel k="loseEquipped" label="Equipped gear can be lost" opts={[[false, "Protected"], [true, "At risk"]]} />
      <Sel k="wipeMode" label="If the whole party falls" opts={[["area", "Restart this area"], ["biome", "Restart this biome"], ["adventure", "Restart the adventure"]]} />
      <div className="hr" />
      <div className="tiny">Seed: <span className="num">{g.seed}</span> — the same seed replays the same adventure.</div>
    </Sheet>
  );
}

/* ============================== LOBBY ============================== */
function Lobby({ G }) {
  const { g, myId, send } = G;
  const me = g.players[myId];
  const [showSet, setShowSet] = useState(false);
  const isHost = g.hostId === myId;
  const ready = g.order.map((i) => g.players[i]).filter((p) => p && p.cls);
  const canStart = isHost && ready.length >= g.settings.minPlayers && ready.length > 0;
  return (
    <div className="col grow" style={{ overflow: "hidden" }}>
      <div style={{ height: "clamp(120px,20vh,190px)", position: "relative", flex: "0 0 auto", borderBottom: "1px solid var(--edge)" }}>
        <Scene biome={{ pal: BIOMES[0].pal, scene: "forest" }} area={{ seed: 21 }} dim />
        <div className="scenebot" style={{ textAlign: "center" }}>
          <div className="eyebrow">Game code</div>
          <div className="code">{g.code}</div>
        </div>
      </div>
      <div className="grow col" style={{ overflowY: "auto", padding: 12, gap: 10 }}>
        <div className="row"><div className="eyebrow">Choose your class</div></div>
        <div className="grid3">
          {Object.values(CLASSES).map((c) => (
            <button key={c.id} className={"btn" + (me && me.cls === c.id ? " on gold" : "")} style={{ flexDirection: "column", minHeight: 74, gap: 2 }}
              onClick={() => { Audio2.sfx("tap"); send("CLASS", { cls: c.id }); }}>
              <span style={{ fontSize: 13 }}>{c.name}</span>
              <span className="sub">{c.id === "mage" ? "MANA" : "NO MANA"}</span>
            </button>
          ))}
        </div>
        {me && me.cls ? <div className="tiny" style={{ padding: "0 2px" }}>{CLASSES[me.cls].blurb}</div> : <div className="tiny">Pick a class to be counted in the party.</div>}
        <div className="hr" />
        <div className="row"><div className="eyebrow">Players</div><div className="sp" /><div className="chip">{ready.length} / {g.settings.maxPlayers}</div></div>
        {g.order.map((id) => {
          const p = g.players[id]; if (!p) return null;
          return (
            <div key={id} className="card">
              <div className="ico" style={{ fontSize: 16, color: "var(--gold)" }}>{g.hostId === id ? "★" : "•"}</div>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>{p.name}{id === myId ? " (you)" : ""}</div>
                <div className="tiny">{p.cls ? CLASSES[p.cls].name : "choosing…"}{p.conn ? "" : " · disconnected"}</div>
              </div>
              {p.ready ? <span className="chip" style={{ borderColor: "var(--moss)", color: "var(--moss)" }}>READY</span> : null}
            </div>
          );
        })}
        <div className="hr" />
        <div className="tiny">
          {g.settings.biomes} biomes · {g.settings.minAreas}–{g.settings.maxAreas} areas each · {DIFF_LABEL[g.settings.difficulty]} · respawn {g.settings.respawn}s · on wipe: {WIPE_LABEL[g.settings.wipeMode]}
        </div>
      </div>
      <div style={{ padding: 10, borderTop: "1px solid var(--edge)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn grow" onClick={() => send("LOBBYREADY", {})}>{me && me.ready ? "NOT READY" : "READY"}</button>
          {isHost ? <button className="btn grow" onClick={() => setShowSet(true)}>SETTINGS</button> : null}
        </div>
        {isHost ? (
          <button className="btn big gold" disabled={!canStart} onClick={() => { Audio2.sfx("big"); send("START", {}); }}>
            {canStart ? "START GAME" : "NEED " + g.settings.minPlayers + " PLAYER" + (g.settings.minPlayers > 1 ? "S" : "") + " WITH A CLASS"}
          </button>
        ) : <div className="tiny" style={{ textAlign: "center" }}>Waiting for the host to start…</div>}
      </div>
      {showSet ? <SettingsSheet g={g} send={send} onClose={() => setShowSet(false)} /> : null}
    </div>
  );
}

/* ============================== GAME SCREEN ============================== */
function PartyCard({ p, me, t, wide }) {
  const d = derive(p);
  return (
    <div className={"pcard" + (p.dead ? " dead" : "") + (p.id === me ? " me" : "")} style={wide ? { minWidth: 0, width: "100%", marginBottom: 6 } : null}>
      <div className="row" style={{ gap: 5 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
        <div className="sp" />
        <div className="tiny num">{p.level}</div>
      </div>
      {p.dead ? (
        <div className="tiny" style={{ color: "var(--blood)" }}>Down · {Math.max(0, Math.ceil((p.respawnAt - t) / 1000))}s</div>
      ) : (
        <>
          <Bar v={p.hp} max={d.maxHp} cls="hpf" thin />
          <div className="tiny num" style={{ fontSize: 10 }}>{Math.ceil(p.hp)}/{d.maxHp}</div>
          {p.cls === "mage" ? <Bar v={p.mana} max={d.maxMana} cls="mnf" thin /> : null}
        </>
      )}
      <div className="row" style={{ gap: 4, marginTop: 3 }}>
        <span className="tiny" style={{ fontSize: 10 }}>{CLASSES[p.cls] ? CLASSES[p.cls].name.slice(0, 5) : ""}</span>
        {p.defUntil > t ? <span className="tiny" style={{ color: "var(--arcane)", fontSize: 10 }}>GUARD</span> : null}
        {p.ready ? <span className="tiny" style={{ color: "var(--moss)", fontSize: 10 }}>READY</span> : null}
        {!p.conn ? <span className="tiny" style={{ fontSize: 10 }}>offline</span> : null}
      </div>
      <Stx st={p.st} small />
    </div>
  );
}
function EnemyCard({ e, onPick, sel }) {
  return (
    <div className={"card act" + (sel ? " sel" : "")} onClick={onPick} role="button" tabIndex={0}>
      <div style={{ width: 52, flex: "0 0 auto" }}><MonsterArt art={e.art} size={52} /></div>
      <div className="grow">
        <div className="row"><div style={{ fontWeight: 700, fontSize: 14 }}>{e.name}</div><div className="sp" />
          <div className="tiny num">{Math.max(0, Math.ceil(e.hp))}/{e.maxHp}</div></div>
        <Bar v={e.hp} max={e.maxHp} cls="enf" thin />
        <div className="row" style={{ marginTop: 4, gap: 6 }}>
          <Stx st={e.st} small />
          {e.mercy > 0 ? <span className="tiny" style={{ color: "#c9bff2" }}>talked down {Math.round(e.mercy)}%</span> : null}
        </div>
      </div>
    </div>
  );
}
function Game({ G, ui }) {
  const { g, myId, send, srvNow } = G;
  const me = g.players[myId];
  const t = srvNow();
  const d = me && me.cls ? derive(me) : null;
  const [sheet, setSheet] = useState(null);
  const [tgt, setTgt] = useState(null);
  const [tab, setTab] = useState("mons");
  const [chat, setChat] = useState("");
  const [floats, setFloats] = useState([]);
  const [lvlOpen, setLvlOpen] = useState(true);
  const [shake, setShake] = useState(false);
  const seen = useRef(-1), logEl = useRef(null), opt = useRef({ a: 0, df: 0 }), areaRef = useRef(-1), bioRef = useRef(-1);
  const enemies = liveEnemies(g);
  const area = g.area || {};
  const biome = curBiome(g);

  useEffect(() => {
    if (!g.log.length) return;
    const last = g.log[g.log.length - 1].i;
    if (seen.current < 0) { seen.current = last; return; }
    const fresh = g.log.filter((e) => e.i > seen.current);
    seen.current = last;
    const adds = [];
    fresh.forEach((e) => {
      if (e.n) adds.push({ id: e.i + "-" + Math.random(), n: Math.round(e.n), heal: e.heal, crit: e.crit, mine: e.who === myId, x: 12 + Math.random() * 70 });
      if (e.k === "big") Audio2.sfx("big");
      else if (e.who === myId && e.k === "hurt") { Audio2.sfx("hurt"); setShake(true); setTimeout(() => setShake(false), 340); }
      else if (e.k === "hit" && e.crit) Audio2.sfx("crit");
      else if (e.k === "hit") Audio2.sfx("hit");
      else if (e.k === "loot") Audio2.sfx("loot");
      else if (e.heal) Audio2.sfx("heal");
    });
    if (adds.length) {
      setFloats((f) => f.concat(adds).slice(-10));
      setTimeout(() => setFloats((f) => f.filter((x) => !adds.find((a) => a.id === x.id))), 1200);
    }
    if (logEl.current) logEl.current.scrollTop = logEl.current.scrollHeight;
  }, [g.log.length, myId]);

  useEffect(() => {
    if (bioRef.current !== g.biome || (g.inDungeon && bioRef.current !== 99)) {
      bioRef.current = g.inDungeon ? 99 : g.biome;
      if (!Audio2.muted) Audio2.startMusic(g.inDungeon ? 6 : g.biome);
    }
  }, [g.biome, g.inDungeon]);

  useEffect(() => {
    if (areaRef.current === g.areaNo) return;
    areaRef.current = g.areaNo;
    setTgt(null); setSheet(null);
    if (area.chest) setSheet("chest");
    else if (area.event) setSheet("event");
  }, [g.areaNo]);

  if (!me || !me.cls) {
    return (
      <div className="col grow center pad" style={{ gap: 12 }}>
        <div className="disp" style={{ fontSize: 20 }}>Choose a class to join the party</div>
        <div className="grid3" style={{ width: "100%", maxWidth: 380 }}>
          {Object.values(CLASSES).map((c) => (
            <button key={c.id} className="btn" style={{ flexDirection: "column", minHeight: 72 }} onClick={() => send("CLASS", { cls: c.id })}>
              <span style={{ fontSize: 13 }}>{c.name}</span><span className="sub">{c.tag}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const atkLeft = Math.max(0, Math.max(me.atkAt, opt.current.a) - t);
  const defLeft = Math.max(0, Math.max(me.defAt, opt.current.df) - t);
  const guarding = me.defUntil > t;
  const frozen = hasSt(me, "freeze") || hasSt(me, "sleep") || hasSt(me, "stun");
  const rod = d.w && d.w.kind === "rod" ? d.w : null;
  const supportRod = rod && (rod.fx === "heal" || rod.fx === "ward");
  const noMana = me.cls === "mage" && d.w && me.mana < d.w.mana;
  const canAct = !me.dead && !frozen && !guarding && g.phase === "play";
  const party = active(g);

  const attack = (id) => {
    if (!canAct || atkLeft > 0 || noMana) { Audio2.sfx("tap"); return; }
    opt.current.a = t + d.acd * 1000;
    send("ATK", { tid: id });
  };
  const defend = () => {
    if (me.dead || frozen || guarding || defLeft > 0 || g.phase !== "play") return;
    opt.current.df = t + d.dur + d.dcd * 1000;
    Audio2.sfx("tap");
    send("DEF", {});
  };
  const target = tgt && enemies.find((e) => e.uid === tgt) ? tgt : enemies.length ? enemies[0].uid : null;
  const readyCount = party.filter((p) => p.ready || p.dead).length;

  const Btn = ({ label, sub, on, cd, cdMax, disabled, hot }) => (
    <div className="btnwrap">
      <button className={"btn" + (hot ? " gold on" : "")} disabled={disabled} onClick={on} style={{ minHeight: 56 }}>
        <span className="lbl"><span>{label}</span>{sub ? <span className="sub">{sub}</span> : null}</span>
      </button>
      {cd > 0 ? <div className="cdfill" style={{ height: clamp((cd / (cdMax || 1)) * 100, 0, 100) + "%" }} /> : null}
    </div>
  );

  return (
    <div className="col grow" style={{ overflow: "hidden" }}>
      <div className="lgrid">
        {/* left sidebar (desktop) */}
        <div className="sidebar col" style={{ padding: 10 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Party · {party.length}</div>
          {party.map((p) => <PartyCard key={p.id} p={p} me={myId} t={t} wide />)}
          {enemies.length ? <><div className="hr" /><div className="eyebrow" style={{ marginBottom: 6 }}>Enemies</div>
            {enemies.map((e) => <div key={e.uid} style={{ marginBottom: 6 }}><EnemyCard e={e} sel={target === e.uid} onPick={() => { setTgt(e.uid); attack(e.uid); }} /></div>)}</> : null}
        </div>

        {/* centre column */}
        <div className="col grow" style={{ overflow: "hidden" }}>
          <div className={"scene" + (shake ? " shake" : "")} style={{ height: "clamp(120px,22vh,230px)" }}>
            <Scene biome={biome} area={area} />
            <div className="scenetop">
              <div>
                <div className="eyebrow">{biome.name}</div>
                <div className="disp" style={{ fontSize: 15, lineHeight: 1.1 }}>{area.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="eyebrow">{g.code}</div>
                <button className="btn sm" style={{ marginTop: 4 }} onClick={() => setSheet("menu")}>MENU</button>
              </div>
            </div>
            {enemies.length ? (
              <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
                {enemies.slice(0, 6).map((e) => (
                  <button key={e.uid} onClick={() => { setTgt(e.uid); attack(e.uid); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", opacity: target === e.uid ? 1 : 0.82 }} aria-label={"Attack " + e.name}>
                    <MonsterArt art={e.art} size={enemies.length > 3 ? 46 : 62} hurt={false} />
                    <div style={{ width: enemies.length > 3 ? 42 : 56, margin: "0 auto" }}><Bar v={e.hp} max={e.maxHp} cls="enf" thin /></div>
                  </button>
                ))}
              </div>
            ) : null}
            {floats.map((f) => (
              <div key={f.id} className="float" style={{ left: f.x + "%", top: "45%", color: f.heal ? "var(--moss)" : f.mine ? "#ffb3b8" : "#ffd9a0", fontSize: f.crit ? 26 : 19 }}>
                {f.heal ? "+" : "−"}{f.n}
              </div>
            ))}
          </div>

          {/* party strip (mobile) */}
          <div className="party mobonly">
            {party.map((p) => <PartyCard key={p.id} p={p} me={myId} t={t} />)}
          </div>

          {/* adventure log */}
          <div className="log" ref={logEl} aria-live="polite">
            {g.log.map((e) => <div key={e.i} className={"le " + (e.k || "sys")}>{e.m}</div>)}
          </div>

          {/* status */}
          <div style={{ padding: "8px 10px", borderTop: "1px solid var(--edge)", background: "#10141d", display: "flex", flexDirection: "column", gap: 5 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="eyebrow" style={{ width: 32 }}>HP</span>
              <div className="grow"><Bar v={me.hp} max={d.maxHp} cls="hpf" label={Math.max(0, Math.ceil(me.hp)) + " / " + d.maxHp} /></div>
              <span className="chip num" style={{ color: "var(--gold2)", borderColor: "#7a5c26" }}>{me.gold}g</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="eyebrow" style={{ width: 32 }}>EXP</span>
              <div className="grow"><Bar v={me.exp} max={expNeed(me.level)} cls="exf" label={"LV " + me.level + " · " + me.exp + " / " + expNeed(me.level)} /></div>
            </div>
            {me.cls === "mage" ? (
              <div className="row" style={{ gap: 8 }}>
                <span className="eyebrow" style={{ width: 32 }}>MANA</span>
                <div className="grow"><Bar v={me.mana} max={d.maxMana} cls="mnf" label={Math.floor(me.mana) + " / " + d.maxMana} /></div>
              </div>
            ) : null}
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              <Stx st={me.st} />
              {guarding ? <span className="chip pulse" style={{ color: "var(--arcane)", borderColor: "var(--arcane)" }}>DEFENDING</span> : null}
              {area.cleared && g.phase === "play" ? <span className="chip">{readyCount}/{party.length} ready{g.readyAt ? " · " + Math.max(0, Math.ceil((g.readyAt - t) / 1000)) + "s" : ""}</span> : null}
              {area.shop ? <button className="btn sm gold" onClick={() => setSheet("shop")}>TRADE</button> : null}
              {area.chest && !area.chest.taken[myId] ? <button className="btn sm gold" onClick={() => setSheet("chest")}>OPEN CHEST</button> : null}
              {area.event && !area.event.done[myId] ? <button className="btn sm gold" onClick={() => setSheet("event")}>CHOOSE</button> : null}
            </div>
          </div>

          {/* main buttons */}
          <div className="btns">
            <Btn label="FIGHT" sub={atkLeft > 0 ? fmtT(atkLeft) + "s" : noMana ? "NO MANA" : guarding ? "GUARDING" : "READY"}
              cd={atkLeft} cdMax={d.acd * 1000} hot={atkLeft <= 0 && canAct && !noMana}
              on={() => { if (supportRod || !enemies.length) { setSheet("fight"); } else if (atkLeft <= 0 && canAct) { attack(target); setSheet("fight"); } else setSheet("fight"); }} />
            <Btn label="DEFEND" sub={guarding ? "ACTIVE" : defLeft > 0 ? fmtT(defLeft) + "s" : "READY"} cd={defLeft} cdMax={(d.dcd + d.dur / 1000) * 1000}
              hot={defLeft <= 0 && !guarding && !me.dead} on={defend} />
            <Btn label="TALK" sub={me.talkAt > t ? fmtT(me.talkAt - t) + "s" : enemies.length ? "PERSUADE" : "CHAT"} on={() => { setTab(enemies.length ? "mons" : "chat"); setSheet("talk"); }} />
            <Btn label="READY" sub={area.cleared ? (me.ready ? "WAITING" : "TAP WHEN DONE") : "IN COMBAT"} hot={me.ready} disabled={!area.cleared || g.phase !== "play"}
              on={() => { Audio2.sfx("tap"); send("READY", {}); }} />
            <Btn label="INVENTORY" sub={me.inv.length + "/5"} on={() => setSheet("inv")} />
            <Btn label="STATS" sub={me.pts > 0 ? me.pts + " POINT" + (me.pts > 1 ? "S" : "") : "LV " + me.level} hot={me.pts > 0} on={() => setSheet("stats")} />
          </div>
        </div>

        {/* right sidebar (desktop) */}
        <div className="sidebar r col" style={{ padding: 10 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Party chat</div>
          <div className="grow" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {g.log.filter((e) => e.k === "chat").map((e) => <div key={e.i} className="le chat">{e.m}</div>)}
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <input value={chat} placeholder="Say something" maxLength={140} onChange={(e) => setChat(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && chat.trim()) { send("CHAT", { m: chat }); setChat(""); } }} />
            <button className="btn sm" onClick={() => { if (chat.trim()) { send("CHAT", { m: chat }); setChat(""); } }}>SEND</button>
          </div>
        </div>
      </div>

      {/* ---------- overlays ---------- */}
      {me.dead && g.phase !== "wipe" ? (
        <div className="full" style={{ background: "rgba(40,6,10,.86)" }}>
          <div className="title" style={{ color: "#ffb3b8" }}>YOU DIED</div>
          <div className="eyebrow">Respawning in</div>
          <div className="num" style={{ fontSize: 44, color: "var(--vellum)" }}>{Math.max(0, Math.ceil((me.respawnAt - t) / 1000))}s</div>
          <div className="tiny" style={{ maxWidth: 300 }}>The party fights on. You can still watch the log and chat.</div>
          <button className="btn" onClick={() => { setTab("chat"); setSheet("talk"); }}>OPEN CHAT</button>
        </div>
      ) : null}
      {g.phase === "wipe" ? (
        <div className="full">
          <div className="title" style={{ color: "var(--blood)", fontSize: 30 }}>THE PARTY HAS FALLEN</div>
          <div className="tiny">{WIPE_LABEL[g.settings.wipeMode]} in {Math.max(0, Math.ceil((g.wipeAt - t) / 1000))}s…</div>
        </div>
      ) : null}
      {g.phase === "vote" && g.vote ? (
        <div className="full" style={{ justifyContent: "flex-start", paddingTop: 24 }}>
          <div className="eyebrow">Party vote · {Math.max(0, Math.ceil((g.vote.deadline - t) / 1000))}s</div>
          <div className="disp" style={{ fontSize: 24, color: "var(--gold2)" }}>Where should we go?</div>
          <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 9 }}>
            {g.vote.opts.map((o, i) => {
              const n = Object.keys(g.vote.votes).filter((k) => g.vote.votes[k] === i).length;
              const locked = g.vote.only && !g.vote.only.includes(i);
              return (
                <button key={i} className={"opt" + (g.vote.votes[myId] === i ? " sel" : "")} disabled={locked} style={{ opacity: locked ? 0.35 : 1 }}
                  onClick={() => { Audio2.sfx("tap"); send("VOTE", { i }); }}>
                  <div className="row">
                    <div className="disp" style={{ fontSize: 17, color: "var(--gold2)" }}>{o.name}</div>
                    <div className="sp" />
                    <div className="num" style={{ color: "var(--gold)" }}>{n}</div>
                  </div>
                  <div className="tiny">Danger: {o.danger} · {o.reward}</div>
                  {o.newBiome ? <div className="chip" style={{ marginTop: 5, display: "inline-block", color: "var(--moss)", borderColor: "var(--moss)" }}>NEW BIOME</div> : null}
                  {o.dungeon ? <div className="chip" style={{ marginTop: 5, display: "inline-block", color: "var(--blood)", borderColor: "var(--blood)" }}>FINAL DUNGEON</div> : null}
                </button>
              );
            })}
          </div>
          <div className="tiny">Most votes wins. Ties are re-voted once, then decided by fate.</div>
        </div>
      ) : null}
      {me.pts > 0 && lvlOpen ? (
        <div className="scrim" style={{ justifyContent: "center", alignItems: "center" }}>
          <div className="sheet" style={{ borderRadius: 16, width: "92%", maxWidth: 420, margin: "0 auto", padding: 16 }}>
            <div className="disp" style={{ fontSize: 22, color: "var(--gold2)", textAlign: "center" }}>LEVEL {me.level}</div>
            <div className="tiny" style={{ textAlign: "center", marginBottom: 10 }}>{me.pts} point{me.pts > 1 ? "s" : ""} to spend</div>
            <div className="grid2">
              {[["atk", "ATTACK", "More damage"], ["def", "DEFENCE", "Less damage taken, more HP"], ["spd", "SPEED", "Shorter cooldowns"], ["cha", "CHARISMA", "Better talking and haggling"]].map(([k, n, s]) => (
                <button key={k} className="btn" style={{ flexDirection: "column", minHeight: 62 }} onClick={() => { Audio2.sfx("level"); send("LVL", { s: k }); }}>
                  <span>{n} +1</span><span className="sub">{me[k]} → {me[k] + 1}</span>
                </button>
              ))}
            </div>
            <div className="tiny" style={{ textAlign: "center", marginTop: 8 }}>{[["atk", "Damage"], ["def", "Toughness"], ["spd", "Cooldowns"], ["cha", "Talking"]].map(() => null)}</div>
            <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setLvlOpen(false)}>Decide later</button>
          </div>
        </div>
      ) : null}

      {/* ---------- sheets ---------- */}
      {sheet === "fight" ? (
        <Sheet title={supportRod ? "Choose an ally" : "Choose a target"} sub={d.w ? d.w.name + " · " + (atkLeft > 0 ? fmtT(atkLeft) + "s cooldown" : "ready") : "Unarmed"} onClose={() => setSheet(null)}>
          {supportRod ? party.filter((p) => !p.dead).map((p) => (
            <div key={p.id} className="card act" onClick={() => attack(p.id)}>
              <div className="ico">{p.name.slice(0, 2).toUpperCase()}</div>
              <div className="grow"><div style={{ fontWeight: 700 }}>{p.name}</div><Bar v={p.hp} max={derive(p).maxHp} cls="hpf" thin /></div>
              <button className="btn sm gold" disabled={atkLeft > 0 || noMana}>{rod.fx === "heal" ? "HEAL" : "WARD"}</button>
            </div>
          )) : enemies.length ? enemies.map((e) => (
            <EnemyCard key={e.uid} e={e} sel={target === e.uid} onPick={() => { setTgt(e.uid); attack(e.uid); }} />
          )) : <div className="tiny">Nothing is attacking you right now.</div>}
          {noMana ? <div className="tiny" style={{ color: "var(--blood)" }}>Not enough mana for {d.w.name} ({d.w.mana} needed).</div> : null}
          {guarding ? <div className="tiny" style={{ color: "var(--arcane)" }}>You cannot attack while defending.</div> : null}
        </Sheet>
      ) : null}

      {sheet === "talk" ? (
        <Sheet title={tab === "mons" ? "Talk to the monster" : "Party chat"} onClose={() => setSheet(null)}
          foot={tab === "chat" ? (
            <div className="row" style={{ gap: 6 }}>
              <input value={chat} placeholder="Say something" maxLength={140} onChange={(e) => setChat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && chat.trim()) { send("CHAT", { m: chat }); setChat(""); } }} />
              <button className="btn sm gold" onClick={() => { if (chat.trim()) { send("CHAT", { m: chat }); setChat(""); } }}>SEND</button>
            </div>
          ) : null}>
          <div className="row" style={{ gap: 6 }}>
            <button className={"btn sm" + (tab === "mons" ? " on" : "")} onClick={() => setTab("mons")}>MONSTER</button>
            <button className={"btn sm" + (tab === "chat" ? " on" : "")} onClick={() => setTab("chat")}>PARTY</button>
          </div>
          {tab === "mons" ? (
            enemies.length ? (
              <>
                {enemies.length > 1 ? <div className="tiny">Talking to: {(enemies.find((e) => e.uid === target) || enemies[0]).name}</div> : null}
                {enemies.length > 1 ? <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  {enemies.map((e) => <button key={e.uid} className={"btn sm" + (target === e.uid ? " on" : "")} onClick={() => setTgt(e.uid)}>{e.name}</button>)}
                </div> : null}
                <EnemyCard e={enemies.find((e) => e.uid === target) || enemies[0]} />
                <div className="grid2">
                  {TALK_OPTS.map((o) => (
                    <button key={o.id} className="btn" disabled={me.talkAt > t || (o.id === "bribe" && me.gold < 25)}
                      style={{ flexDirection: "column", minHeight: 54 }}
                      onClick={() => { Audio2.sfx("tap"); send("TALK", { opt: o.id, tid: target }); }}>
                      <span style={{ fontSize: 13 }}>{o.name}</span><span className="sub">{o.hint}</span>
                    </button>
                  ))}
                </div>
                <div className="tiny">Charisma {d.cha}. Every monster wants something different — and some cannot be talked down at all.</div>
              </>
            ) : <div className="tiny">There is nothing here to talk to.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {g.log.filter((e) => e.k === "chat").slice(-40).map((e) => <div key={e.i} className="le chat">{e.m}</div>)}
              {g.log.filter((e) => e.k === "chat").length === 0 ? <div className="tiny">No messages yet.</div> : null}
            </div>
          )}
        </Sheet>
      ) : null}

      {sheet === "inv" ? (
        <Sheet title="Inventory" sub={me.gold + " gold · " + me.inv.length + "/5 slots"} onClose={() => setSheet(null)}>
          <div className="eyebrow">Equipped</div>
          {["weapon", "armor", "acc"].concat(me.cls === "archer" ? ["arrows"] : []).map((k) => (
            me.eq[k] ? <ItemRow key={k} id={me.eq[k]} right={<button className="btn sm" onClick={() => send("UNEQ", { k })}>REMOVE</button>} />
              : <div key={k} className="card" style={{ opacity: .5 }}><div className="ico">—</div><div className="grow tiny">{{ weapon: CLASSES[me.cls].name + " weapon", armor: "Armor", acc: "Accessory", arrows: "Arrows" }[k]} slot empty</div></div>
          ))}
          <div className="hr" />
          <div className="eyebrow">Pack</div>
          {me.inv.length === 0 ? <div className="tiny">Empty. Loot drops, chests and shops will fill it.</div> : null}
          {me.inv.map((s, i) => {
            const it = ITEMS[s.id];
            const canEq = it.kind !== "use" && (it.cls === "any" || it.cls === me.cls) &&
              (it.kind === CLS_WEAPON[me.cls] || it.kind === "armor" || it.kind === "acc" || (it.kind === "arrows" && me.cls === "archer"));
            const canUse = it.kind === "use" && (it.cls === "any" || it.cls === me.cls);
            return (
              <ItemRow key={i} id={s.id} sub={(s.n > 1 ? "×" + s.n + " · " : "") + itemLine(it)}
                right={<div className="row" style={{ gap: 5 }}>
                  {canUse ? <button className="btn sm gold" onClick={() => send("USE", { i })}>USE</button> : null}
                  {canEq ? <button className="btn sm gold" onClick={() => send("EQUIP", { i })}>EQUIP</button> : null}
                  <button className="btn sm danger" onClick={() => send("DROP", { i })}>✕</button>
                </div>} />
            );
          })}
        </Sheet>
      ) : null}

      {sheet === "stats" ? (
        <Sheet title={me.name} sub={CLASSES[me.cls].name + " · Level " + me.level} onClose={() => setSheet(null)}>
          <Bar v={me.exp} max={expNeed(me.level)} cls="exf" label={"EXP " + me.exp + " / " + expNeed(me.level)} />
          {me.pts > 0 ? <div className="tiny" style={{ color: "var(--gold2)" }}>{me.pts} unspent point{me.pts > 1 ? "s" : ""}</div> : null}
          {[["atk", "Attack", "Raises damage dealt"], ["def", "Defence", "Reduces damage taken, raises max HP"], ["spd", "Speed", "Shortens attack and defend cooldowns"], ["cha", "Charisma", "Persuasion, haggling, special dialogue"]].map(([k, n, s]) => (
            <div key={k} className="card">
              <div className="grow"><div style={{ fontWeight: 700 }}>{n} <span className="num" style={{ color: "var(--gold2)" }}>{me[k]}</span></div><div className="tiny">{s}</div></div>
              {me.pts > 0 ? <button className="btn sm gold" onClick={() => { Audio2.sfx("level"); send("LVL", { s: k }); }}>+1</button> : null}
            </div>
          ))}
          <div className="hr" /><div className="eyebrow">Calculated</div>
          <div className="grid2">
            {[["HP", Math.ceil(me.hp) + " / " + d.maxHp], ["Attack damage", String(d.dmg)],
            ["Attack cooldown", d.acd.toFixed(1) + "s"], ["Defend cooldown", d.dcd.toFixed(1) + "s"],
            ["Guard lasts", (d.dur / 1000).toFixed(1) + "s"], ["Guard absorbs", Math.round(d.red * 100) + "%"],
            ["Critical chance", Math.round(critChance(d) * 100) + "%"], ["Gold", me.gold + "g"]]
              .concat(me.cls === "mage" ? [["Mana", Math.floor(me.mana) + " / " + d.maxMana], ["Rod cost", (d.w ? d.w.mana : 0) + " mana"]] : [])
              .map(([a, b]) => <div key={a} className="card" style={{ padding: 8 }}><div className="grow"><div className="tiny">{a}</div><div className="num" style={{ color: "var(--gold2)" }}>{b}</div></div></div>)}
          </div>
          <div className="hr" />
          <div className="tiny">Damage dealt {Math.round(me.tot.dmg)} · healing {Math.round(me.tot.heal)} · kills {me.tot.kills} · deaths {me.tot.deaths}</div>
        </Sheet>
      ) : null}

      {sheet === "shop" && area.shop ? (
        <Sheet title={area.shop.keeper} sub={"Your gold: " + me.gold + (area.shop.disc[myId] ? " · " + area.shop.disc[myId] + "% adjustment" : "")} onClose={() => setSheet(null)}
          foot={<button className="btn" disabled={!!area.shop.hag[myId]} onClick={() => send("HAGGLE", {})}>
            {area.shop.hag[myId] ? "ALREADY HAGGLED" : "HAGGLE (Charisma " + d.cha + ")"}</button>}>
          <div className="tiny" style={{ fontStyle: "italic" }}>{area.shop.line}</div>
          {area.shop.items.map((it, i) => {
            const def = ITEMS[it.id];
            const price = shopPrice(area.shop, it, myId);
            const wrong = def.cls !== "any" && def.cls !== me.cls;
            return <ItemRow key={i} id={it.id} sub={itemLine(def) + " · stock " + it.stock}
              right={<button className="btn sm gold" disabled={it.stock <= 0 || me.gold < price || wrong || !invSpace(me) && !def.stack}
                onClick={() => { Audio2.sfx("loot"); send("BUY", { i }); }}>{it.stock <= 0 ? "SOLD OUT" : wrong ? "N/A" : price + "g"}</button>} />;
          })}
          <div className="hr" /><div className="eyebrow">Sell from your pack</div>
          {me.inv.map((s, i) => <ItemRow key={i} id={s.id} sub={"Sells for " + Math.max(4, Math.round((ITEMS[s.id].price || 20) * 0.4)) + "g"}
            right={<button className="btn sm" onClick={() => send("SELL", { i })}>SELL</button>} />)}
          <div className="tiny">Stock is shared by the whole party — first come, first served.</div>
        </Sheet>
      ) : null}

      {sheet === "chest" && area.chest ? (
        <Sheet title="Treasure" sub={area.chest.taken[myId] ? "You already chose" : "Choose one — everyone gets a pick"} onClose={() => setSheet(null)}>
          {area.chest.taken[myId] ? <ItemRow id={area.chest.taken[myId]} sub="Taken" /> :
            (chestOffers(g, me) || []).map((id, i) => (
              <ItemRow key={i} id={id} onClick={() => { Audio2.sfx("loot"); send("CHEST", { i }); }} right={<button className="btn sm gold">TAKE</button>} />
            ))}
          {!invSpace(me) && !area.chest.taken[myId] ? <div className="tiny" style={{ color: "var(--blood)" }}>Your pack is full — discard something first.</div> : null}
        </Sheet>
      ) : null}

      {sheet === "event" && area.event ? (
        <Sheet title={area.event.t} onClose={() => setSheet(null)}>
          <div style={{ fontSize: 14 }}>{area.event.d}</div>
          {area.event.done[myId] ? <div className="tiny">You have already made your choice here.</div> :
            area.event.o.map((o, i) => (
              <button key={i} className="btn" style={{ justifyContent: "flex-start" }} onClick={() => { Audio2.sfx("tap"); send("EVENT", { i }); }}>{o.l}</button>
            ))}
        </Sheet>
      ) : null}

      {sheet === "menu" ? (
        <Sheet title="Menu" sub={"Code " + g.code + " · seed " + g.seed} onClose={() => setSheet(null)}>
          <div className="row" style={{ justifyContent: "space-between" }}><div style={{ fontSize: 13 }}>Sound</div>
            <button className="btn sm" onClick={() => { ui.setMuted(!ui.muted); if (!ui.muted) Audio2.stopMusic(); }}>{ui.muted ? "MUTED" : "ON"}</button></div>
          <div className="row" style={{ justifyContent: "space-between" }}><div style={{ fontSize: 13 }}>Music volume</div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm" onClick={() => { Audio2.music = clamp(Audio2.music - 0.15, 0, 1); }}>−</button>
              <button className="btn sm" onClick={() => { Audio2.music = clamp(Audio2.music + 0.15, 0, 1); }}>+</button>
            </div></div>
          <div className="row" style={{ justifyContent: "space-between" }}><div style={{ fontSize: 13 }}>Larger text</div>
            <button className="btn sm" onClick={() => ui.setBig(!ui.big)}>{ui.big ? "ON" : "OFF"}</button></div>
          <div className="hr" />
          <div className="tiny">{g.hostId === myId ? "You are hosting this game — the adventure runs on your device." : "Hosted by " + (g.players[g.hostId] ? g.players[g.hostId].name : "another player") + "."}</div>
          <div className="tiny">Area {g.areaNo} · {biome.name} · {g.biomesDone} biome{g.biomesDone === 1 ? "" : "s"} behind you</div>
          <button className="btn danger" onClick={() => { Audio2.stopMusic(); G.leave(); }}>LEAVE GAME</button>
        </Sheet>
      ) : null}
    </div>
  );
}

/* ============================== VICTORY ============================== */
function Victory({ G }) {
  const { g, myId, send } = G;
  const tl = g.tally || { players: [], areas: 0, biomes: 0, time: 0 };
  const boss = BOSSES.find((b) => b.id === g.boss);
  const mins = Math.floor(tl.time / 60000), secs = Math.floor((tl.time % 60000) / 1000);
  return (
    <div className="col grow" style={{ overflowY: "auto", padding: 16, gap: 12, alignItems: "center" }}>
      <div className="eyebrow" style={{ marginTop: 10 }}>The vault is quiet</div>
      <div className="title">VICTORY</div>
      <div className="disp" style={{ color: "var(--gold2)", textAlign: "center" }}>{boss ? boss.name + " has fallen." : "The final boss has fallen."}</div>
      <div className="tiny">{tl.areas} areas · {tl.biomes} biomes · {mins}m {secs}s</div>
      <div className="panel" style={{ width: "100%", maxWidth: 640, padding: 10, overflowX: "auto" }}>
        <table className="vt">
          <thead><tr><th>Adventurer</th><th>Lv</th><th>Damage</th><th>Healing</th><th>Kills</th><th>Gold</th><th>Items</th><th>Deaths</th></tr></thead>
          <tbody>
            {tl.players.map((p, i) => (
              <tr key={i}><td style={{ fontWeight: 700 }}>{p.name} <span className="tiny">{CLASSES[p.cls] ? CLASSES[p.cls].name : ""}</span></td>
                <td className="num">{p.level}</td><td className="num">{p.dmg}</td><td className="num">{p.heal}</td>
                <td className="num">{p.kills}</td><td className="num">{p.gold}</td><td className="num">{p.items}</td><td className="num">{p.deaths}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {g.hostId === myId ? <button className="btn big gold" style={{ maxWidth: 320, width: "100%" }} onClick={() => send("RESTART", {})}>START ANOTHER ADVENTURE</button>
        : <div className="tiny">Waiting for the host to start another adventure…</div>}
      <button className="btn sm" onClick={() => G.leave()}>Leave game</button>
    </div>
  );
}

/* ============================== APP ============================== */
export default function App() {
  const G = useGame();
  const [big, setBig] = useState(false);
  const [muted, setMuted] = useState(false);
  useEffect(() => { Audio2.muted = muted; if (muted) Audio2.stopMusic(); }, [muted]);
  useEffect(() => () => Audio2.stopMusic(), []);
  const g = G.g;
  const ui = { big, setBig, muted, setMuted };
  return (
    <div className={"ev" + (big ? " big-text" : "")} style={{ height: "100dvh", minHeight: 520 }}>
      <style>{CSS + CSS2}</style>
      {!g ? <Home G={G} />
        : g.phase === "lobby" ? <Lobby G={G} />
          : g.phase === "victory" ? <Victory G={G} />
            : <Game G={G} ui={ui} />}
      {G.status.msg ? <div className="toast">{G.status.msg}</div> : null}
    </div>
  );
}
