/* Embervow - game engine. Pure logic: no DOM, no React.
   Shared verbatim by the Node server (the authority) and the browser client. */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => Date.now();
const uid = () => Math.random().toString(36).slice(2, 10);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
/* seeded rng (mulberry32) — lets an adventure be reproduced from its seed */
function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function pickN(r, arr, n) {
  const c = arr.slice(); const out = [];
  while (c.length && out.length < n) out.push(c.splice(Math.floor(r() * c.length), 1)[0]);
  return out;
}
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const fmtT = (ms) => (ms <= 0 ? "0.0" : (ms / 1000).toFixed(1));

/* --------------------------- storage / transport -------------------------- */

/* ==========================================================================
   CONTENT — items, statuses, monsters, biomes, bosses, dialogue
   ========================================================================== */
const RAR = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const ITEMS = {};
function defItems(kind, cls, rows, keys) {
  rows.forEach((row) => {
    const o = { kind, cls, fx: null, b: {}, dmg: 0, cd: 0, mana: 0, price: 0, desc: "", stack: false };
    keys.forEach((k, i) => { if (row[i] !== undefined && row[i] !== null) o[k] = row[i]; });
    ITEMS[o.id] = o;
  });
}
const WK = ["id", "name", "rar", "dmg", "cd", "fx", "b", "mana", "price", "desc"];
const AK = ["id", "name", "rar", "dcd", "dur", "red", "b", "price", "desc"];
const CK = ["id", "name", "rar", "b", "price", "desc"];
const UK = ["id", "name", "rar", "use", "price", "desc"];

/* ---- swords ---- */
defItems("sword", "sword", [
  ["s_chip", "Chipped Warblade", 0, 9, 3.4, null, {}, 0, 24, "Notched from a hundred small mistakes."],
  ["s_iron", "Ironmark Shortsword", 0, 13, 4.2, null, {}, 0, 45, "Stamped with a garrison mark nobody claims."],
  ["s_twin", "Twinfang Sabre", 1, 11, 2.8, "bleed", { spd: 1 }, 0, 80, "Two edges, both impatient."],
  ["s_oath", "Oathkeeper Blade", 1, 17, 4.8, null, { def: 2 }, 0, 95, "Heavy with promises."],
  ["s_ember", "Emberbrand", 2, 20, 5.0, "burn", {}, 0, 160, "The steel never fully cools."],
  ["s_rime", "Rimefang Cleaver", 2, 22, 5.6, "freeze", {}, 0, 175, "Frost creeps back up the arm."],
  ["s_whisper", "Thief's Whisper", 2, 13, 2.3, "crit", { spd: 2 }, 0, 150, "Light enough to lie about."],
  ["s_warden", "Warden's Greatsword", 3, 33, 7.8, null, { def: 3, hp: 15 }, 0, 300, "Two hands, one answer."],
  ["s_serpent", "Serpent's Vow", 3, 25, 5.2, "drain", { atk: 2 }, 0, 320, "It drinks first, then you do."],
  ["s_storm", "Stormcarver", 4, 37, 6.6, "stun", { atk: 3 }, 0, 600, "Thunder arrives a moment late."],
  ["s_dawn", "Dawnbrand", 4, 31, 5.2, "drain", { hp: 30, cha: 2 }, 0, 640, "Forged for a war that ended kindly."],
], WK);

/* ---- bows ---- */
defItems("bow", "archer", [
  ["b_short", "Hunter's Shortbow", 0, 8, 2.7, null, {}, 0, 24, "Cut from a tree that owed someone a favour."],
  ["b_yew", "Yew Longbow", 0, 13, 4.0, null, {}, 0, 45, "Taller than most of its owners."],
  ["b_wind", "Windwhisper", 1, 11, 2.5, null, { spd: 2 }, 0, 85, "Draws itself if you let it."],
  ["b_thorn", "Thornstring Recurve", 1, 16, 4.6, "poison", {}, 0, 95, "The string is not string."],
  ["b_sun", "Sunpiercer", 2, 22, 5.2, "crit", {}, 0, 165, "Leaves an afterimage where it aims."],
  ["b_glass", "Glasswing Bow", 2, 15, 3.1, "bleed", { spd: 1 }, 0, 155, "Hums a note only the target hears."],
  ["b_siege", "Siege Longbow", 3, 31, 7.4, null, { atk: 3 }, 0, 300, "Built for gates, used on worse."],
  ["b_ghost", "Ghostdraw", 3, 24, 4.6, "pierce", { spd: 2 }, 0, 330, "Armour is a suggestion to this one."],
  ["b_void", "Voidstring", 4, 35, 6.4, "pierce", { atk: 3 }, 0, 610, "The arrow is gone before it is loosed."],
  ["b_falcon", "Falconheart", 4, 27, 4.0, "crit", { spd: 4 }, 0, 640, "It wants to be somewhere else, fast."],
], WK);

/* ---- arrows (archer only, own slot) ---- */
defItems("arrows", "archer", [
  ["a_keen", "Keen Arrows", 0, 3, 0, null, {}, 0, 30, "Sharpened past the point of sense."],
  ["a_fire", "Fire Arrows", 1, 2, 0, "burn", {}, 0, 70, "Fletched with something that likes to spread."],
  ["a_frost", "Frost Arrows", 1, 2, 0, "slow", {}, 0, 70, "Cold enough to make a monster reconsider."],
  ["a_venom", "Venom Arrows", 2, 3, 0, "poison", {}, 0, 130, "Tipped with swamp patience."],
  ["a_shatter", "Shattering Arrows", 2, 5, 0, "pierce", {}, 0, 150, "Finds the seam in any plate."],
  ["a_feather", "Featherfall Arrows", 3, 4, 0, null, { spd: 3 }, 0, 240, "Weightless, and slightly rude about it."],
], WK);

/* ---- magic rods: the rod IS the spell ---- */
defItems("rod", "mage", [
  ["r_gale", "Gale Rod", 0, 9, 2.4, null, {}, 6, 30, "Attack: Gale. Cheap, quick, unimpressive, reliable."],
  ["r_ember", "Ember Rod", 0, 15, 3.4, "burn", {}, 10, 55, "Attack: Fire. Sets the target smouldering."],
  ["r_rime", "Rime Rod", 1, 13, 3.6, "freeze", {}, 12, 85, "Attack: Ice. May lock a monster in place."],
  ["r_venom", "Venom Rod", 1, 11, 3.8, "poison", {}, 12, 90, "Attack: Blight. Damage that keeps working."],
  ["r_mend", "Mending Rod", 1, 26, 4.0, "heal", {}, 18, 110, "Attack: Heal. Restores an ally instead of harming a monster."],
  ["r_lull", "Lull Rod", 2, 5, 4.4, "sleep", {}, 15, 140, "Attack: Hypnosis. Puts a monster under, if it lets you."],
  ["r_ward", "Warding Rod", 2, 0, 4.0, "ward", {}, 14, 135, "Attack: Ward. Hardens an ally against the next few blows."],
  ["r_siphon", "Siphon Rod", 2, 19, 4.4, "drain", {}, 14, 165, "Attack: Siphon. Takes health and gives it to you."],
  ["r_storm", "Storm Rod", 2, 28, 5.2, "stun", {}, 20, 185, "Attack: Lightning. Loud, expensive, worth it."],
  ["r_sunflare", "Sunflare Rod", 3, 17, 5.6, "aoe", {}, 24, 320, "Attack: Sunflare. Strikes every monster at once."],
  ["r_greatmend", "Greater Mending Rod", 3, 46, 4.4, "heal", { cha: 1 }, 24, 340, "Attack: Greater Heal. Brings an ally most of the way back."],
  ["r_null", "Nullstone Rod", 4, 36, 6.0, "pierce", { mana: 20 }, 26, 620, "Attack: Unmaking. Ignores whatever the monster is hiding behind."],
  ["r_chorus", "Chorus Rod", 4, 22, 4.8, "aoeburn", { mana: 30 }, 28, 650, "Attack: Chorus. Every monster hears it, and burns."],
], WK);

/* ---- armor (class-specific; determines base defend cooldown) ---- */
defItems("armor", "sword", [
  ["ar_gam", "Padded Gambeson", 0, 4.5, 2.4, 0.55, { def: 2 }, 35, "Light. Defends often, absorbs little."],
  ["ar_haub", "Ironscale Hauberk", 1, 6.0, 2.9, 0.65, { def: 5, hp: 12 }, 90, "Medium weight, medium regret."],
  ["ar_plate", "Warden Plate", 2, 8.5, 3.6, 0.76, { def: 9, hp: 26 }, 210, "Slow to raise. Very hard to get through."],
  ["ar_bul", "Bulwark of the Vow", 4, 8.0, 4.2, 0.80, { def: 13, hp: 45 }, 580, "Worn by someone who never stepped back."],
], AK);
defItems("armor", "archer", [
  ["ar_leath", "Ranger's Leathers", 0, 4.0, 2.3, 0.52, { def: 2, spd: 1 }, 35, "Quiet, quick, minimal."],
  ["ar_brig", "Hunter's Brigandine", 1, 5.4, 2.8, 0.62, { def: 4, spd: 1 }, 90, "Plates sewn where they matter."],
  ["ar_shadow", "Shadowweave Coat", 2, 6.6, 3.1, 0.70, { def: 7, spd: 2 }, 210, "Holds a shape you are not in."],
  ["ar_falcon", "Falconer's Mantle", 4, 6.0, 3.5, 0.75, { def: 10, spd: 3, cha: 1 }, 580, "The feathers are not decoration."],
], AK);
defItems("armor", "mage", [
  ["ar_appr", "Apprentice Robes", 0, 4.2, 2.4, 0.50, { def: 1, mana: 15 }, 35, "Comfortable. Barely armour."],
  ["ar_runed", "Runed Vestments", 1, 5.6, 2.8, 0.60, { def: 3, mana: 32 }, 90, "The stitching argues with incoming spells."],
  ["ar_star", "Starlit Regalia", 2, 6.8, 3.2, 0.68, { def: 6, mana: 55 }, 210, "Holds a small amount of night in the weave."],
  ["ar_quiet", "Mantle of the Quiet Hour", 4, 6.2, 3.5, 0.74, { def: 9, mana: 75, cdr: 8 }, 580, "Time moves politely around it."],
], AK);

/* ---- accessories ---- */
defItems("acc", "any", [
  ["c_copper", "Copper Band", 0, { def: 1 }, 25, "Green where it touches skin."],
  ["c_charm", "Hunter's Charm", 0, { spd: 1 }, 30, "A knuckle bone, still lucky."],
  ["c_pin", "Silver Tongue Pin", 1, { cha: 2 }, 60, "Worn by people who talk their way out."],
  ["c_knot", "Brawler's Knot", 1, { atk: 2 }, 60, "Tied to remember a grudge."],
  ["c_locket", "Sturdy Locket", 1, { hp: 20 }, 65, "Whatever was inside is long gone."],
  ["c_coin", "Coinbiter Ring", 1, { loot: 15 }, 75, "Monsters seem to carry more when you wear it."],
  ["c_quick", "Ring of the Quick", 2, { spd: 3 }, 150, "Your hands arrive before your intent."],
  ["c_ember", "Amulet of Embers", 3, { atk: 3, hp: 14 }, 300, "Warm even in the Rimewind."],
  ["c_whisper", "Whisperglass", 3, { cha: 5 }, 310, "You hear what people nearly said."],
  ["c_gale", "Boots of the Gale", 3, { spd: 5 }, 330, "The ground is a formality."],
  ["c_heart", "Heartstone", 3, { hp: 60, def: 3 }, 320, "Beats slightly out of time with yours."],
  ["c_crown", "Crown of Small Hours", 4, { atk: 4, spd: 4, cha: 3, hp: 35 }, 700, "Rules nothing. Improves everything."],
], CK);
defItems("acc", "sword", [
  ["c_warrior", "Warrior Ring", 2, { atk: 4 }, 160, "Fits over a callus."],
], CK);
defItems("acc", "archer", [
  ["c_ranger", "Ranger Ring", 2, { spd: 2, atk: 2 }, 160, "Steadies the draw hand."],
], CK);
defItems("acc", "mage", [
  ["c_wizard", "Wizard Ring", 2, { mana: 32, cdr: 6 }, 160, "Rods answer faster to it."],
  ["c_crystal", "Mana Crystal", 2, { mana: 50 }, 170, "Hums when your reserves run low."],
], CK);

/* ---- consumables ---- */
defItems("use", "any", [
  ["u_hp", "HP Potion", 0, { hp: 45 }, 20, "Tastes like a rusted coin. Works anyway."],
  ["u_hp2", "Greater HP Potion", 1, { hp: 115 }, 55, "Thick, red, alarmingly warm."],
  ["u_def", "Defence Draught", 1, { buff: ["defUp", 6, 25] }, 30, "Your skin remembers being stone."],
  ["u_atk", "Strength Booster", 1, { buff: ["atkUp", 6, 25] }, 50, "Everything looks slightly breakable."],
  ["u_spd", "Swift Draught", 1, { buff: ["spdUp", 5, 25] }, 45, "Cooldowns shorten. So does patience."],
  ["u_cha", "Charm Tonic", 1, { buff: ["chaUp", 6, 60] }, 35, "You become briefly, dangerously likeable."],
  ["u_cure", "Antidote", 0, { cure: 1 }, 18, "Clears poison, burn and worse."],
  ["u_bread", "Emberbread", 0, { hp: 25, buff: ["regen", 4, 20] }, 22, "Still warm. Nobody knows who bakes it."],
], UK);
defItems("use", "mage", [
  ["u_mp", "Mana Potion", 0, { mana: 55 }, 25, "Blue, bitter, faintly electrical."],
  ["u_mp2", "Greater Mana Potion", 1, { mana: 125 }, 60, "A whole storm, decanted."],
], UK);
ITEMS.u_hp.stack = true; ITEMS.u_hp2.stack = true; ITEMS.u_mp.stack = true; ITEMS.u_mp2.stack = true;
ITEMS.u_def.stack = true; ITEMS.u_atk.stack = true; ITEMS.u_spd.stack = true; ITEMS.u_cha.stack = true;
ITEMS.u_cure.stack = true; ITEMS.u_bread.stack = true;

const CLS_WEAPON = { sword: "sword", archer: "bow", mage: "rod" };
const CLASSES = {
  sword: {
    id: "sword", name: "Swordfighter", tag: "Melee · No mana",
    blurb: "Stands in front. Trades cooldown for weight — heavy blades hit like a falling gate.",
    base: { atk: 5, def: 4, spd: 3, cha: 2 }, start: ["s_chip", "ar_gam"],
  },
  archer: {
    id: "archer", name: "Archer", tag: "Ranged · No mana",
    blurb: "Fastest cooldowns in the party. Arrow types change what every shot does.",
    base: { atk: 4, def: 2, spd: 6, cha: 3 }, start: ["b_short", "ar_leath", "a_keen"],
  },
  mage: {
    id: "mage", name: "Mage", tag: "Magic rods · Mana",
    blurb: "No spellbook. The equipped rod is the spell — swap rods to change your whole role.",
    base: { atk: 3, def: 2, spd: 3, cha: 5 }, start: ["r_ember", "ar_appr"],
  },
};

/* ---- item pools for loot / shops ---- */
const POOLS = {};
Object.keys(ITEMS).forEach((id) => {
  const it = ITEMS[id];
  const key = it.kind + ":" + it.cls;
  if (!POOLS[key]) POOLS[key] = [];
  POOLS[key].push(id);
});

/* ---- status effects ---- */
const STATUS = {
  poison: { name: "Poison", g: "☠", c: "#8fd18f", bad: 1, desc: "Loses health every few seconds." },
  burn: { name: "Burn", g: "🔥", c: "#e8894a", bad: 1, desc: "Heavier damage over time, shorter duration." },
  freeze: { name: "Freeze", g: "❄", c: "#8fd6f0", bad: 1, desc: "Cannot act until it thaws." },
  sleep: { name: "Sleep", g: "z", c: "#b7a6f0", bad: 1, desc: "Cannot act. Breaks early when struck." },
  stun: { name: "Stun", g: "✦", c: "#f0e08a", bad: 1, desc: "Cannot act for a moment." },
  slow: { name: "Slow", g: "⌛", c: "#9fb4d0", bad: 1, desc: "Cooldowns take much longer." },
  confuse: { name: "Confusion", g: "?", c: "#e6a3d8", bad: 1, desc: "Attacks may hit the wrong target." },
  bleed: { name: "Bleed", g: "◊", c: "#d9666e", bad: 1, desc: "Light damage over time." },
  defUp: { name: "Defence Up", g: "⛨", c: "#8fb8f0", bad: 0, desc: "Incoming damage reduced." },
  atkUp: { name: "Attack Up", g: "⚔", c: "#f0a06a", bad: 0, desc: "Damage dealt increased." },
  spdUp: { name: "Speed Up", g: "»", c: "#8fe8d0", bad: 0, desc: "Cooldowns shortened." },
  chaUp: { name: "Charm", g: "♪", c: "#f0b8e0", bad: 0, desc: "Talking and haggling go better." },
  regen: { name: "Regeneration", g: "+", c: "#8fe09a", bad: 0, desc: "Recovers health over time." },
  ward: { name: "Ward", g: "◈", c: "#a9c8ff", bad: 0, desc: "Absorbs a share of incoming damage." },
  rage: { name: "Rage", g: "!!", c: "#ff8a7a", bad: 0, desc: "Hits much harder." },
  shield: { name: "Shielded", g: "▣", c: "#c9d4e6", bad: 0, desc: "Takes greatly reduced damage." },
};

/* ---- monsters ---- */
const MONS = {};
function M(id, name, pers, art, hp, dmg, cd, def, exp, gold, abil, greet) {
  MONS[id] = { id, name, pers, art, hp, dmg, cd, def, exp, gold, abil: abil || [], greet };
}
/* art: [shape, primary, secondary, eyes] */
/* 1. Greenwood Verge */
M("m_grub", "Mossback Grubling", "timid", ["blob", "#6b8f4a", "#c2d68a", 2], 34, 6, 3.2, 1, 14, 9, [], "It flinches, then tries to look bigger than it is.");
M("m_thistle", "Thistle Sprite", "mad", ["wisp", "#9fd66a", "#e8f0a0", 3], 26, 8, 2.4, 0, 15, 12, ["slow"], "It giggles at a joke nobody told.");
M("m_stag", "Hollow Stag", "sorrowful", ["beast", "#4f6b3a", "#d8cfa8", 2], 52, 11, 4.0, 3, 24, 16, [], "Its ribs show through. It watches you without hunger.");
M("m_bramble", "Bramble Lurker", "hungry", ["insect", "#3f5a2e", "#8f6b3a", 4], 44, 10, 3.4, 2, 21, 14, ["poison"], "Thorns unfold from the undergrowth in a shape roughly like a mouth.");
M("m_root", "Old Rootfather", "ancient", ["treant", "#54703c", "#a8894f", 2], 130, 16, 4.6, 6, 70, 55, ["shield", "heal"], "The ground shifts. Something very old decides to stand up.");
/* 2. Glimmerdeep Caverns */
M("m_shard", "Shardling", "curious", ["crystal", "#5fd0c8", "#bff4ef", 1], 42, 11, 3.0, 4, 22, 15, [], "It reflects you back, slightly wrong.");
M("m_echo", "Echo Bat", "mad", ["fowl", "#7a6bb0", "#d0c4f0", 2], 34, 13, 2.2, 1, 24, 14, ["confuse"], "It screams your own footsteps back at you.");
M("m_quartz", "Quartz Golem", "dutiful", ["construct", "#4a7d96", "#a8dcea", 2], 96, 18, 4.8, 9, 46, 34, ["shield"], "A slab of the wall unfolds into arms.");
M("m_lumen", "Lumen Crawler", "hungry", ["insect", "#3f8f8a", "#9ff0d8", 6], 58, 14, 3.2, 3, 30, 20, ["drain"], "Its light goes out where it touches you.");
M("m_geode", "Geode Warden", "ancient", ["crystal", "#6a8fe0", "#dbe8ff", 4], 175, 22, 4.4, 11, 96, 78, ["shield", "aoe"], "The cavern's oldest tenant asks, in cracking stone, what you are taking.");
/* 3. Ashfall Barrens */
M("m_jackal", "Ash Jackal", "hungry", ["beast", "#8f6b45", "#e0c08a", 2], 58, 17, 2.6, 3, 32, 22, [], "It has already decided which of you is slowest.");
M("m_wretch", "Dune Wretch", "greedy", ["humanoid", "#a8783f", "#f0d8a0", 2], 66, 15, 3.4, 5, 34, 40, [], "It rattles a purse it definitely stole.");
M("m_cinder", "Cinder Beetle", "wrathful", ["insect", "#b04a2a", "#f0a05a", 4], 74, 19, 3.6, 7, 38, 24, ["burn"], "Its shell splits and shows a furnace.");
M("m_husk", "Sun-Bleached Husk", "sorrowful", ["ghost", "#d8cfa8", "#fff4d8", 2], 62, 16, 3.8, 4, 36, 18, ["drain"], "It walks the same forty steps it died walking.");
M("m_kiln", "Kilnborn Colossus", "wrathful", ["construct", "#8f3a20", "#f0b06a", 3], 240, 30, 4.6, 14, 140, 110, ["burn", "aoe", "rage"], "The sand pours off something that was built to end a siege.");
/* 4. Mirefen Hollow */
M("m_croak", "Bog Croaker", "greedy", ["blob", "#5a7d3f", "#c0d86a", 2], 78, 19, 3.2, 6, 40, 34, ["poison"], "It swallows a coin in front of you, meaningfully.");
M("m_leech", "Fen Leech", "hungry", ["worm", "#6b3a4f", "#c07a8f", 0], 66, 21, 2.8, 4, 42, 26, ["drain", "poison"], "It has no face to negotiate with.");
M("m_widow", "Mire Widow", "proud", ["insect", "#3f2a4a", "#a06bc0", 8], 92, 24, 3.6, 8, 52, 44, ["poison", "slow"], "She is very pleased you came all this way.");
M("m_rot", "Rotcap", "curious", ["fungus", "#7a5a8f", "#d8c0f0", 3], 84, 18, 4.0, 9, 46, 30, ["confuse", "heal"], "Spores spell a question in the air.");
M("m_chorus", "The Drowned Chorus", "sorrowful", ["ghost", "#3f6b7a", "#a8e0f0", 6], 300, 32, 4.2, 12, 175, 130, ["aoe", "confuse", "summon"], "Many voices apologise at once, and keep coming.");
/* 5. Rimewind Peaks */
M("m_wisp", "Frost Wisp", "timid", ["wisp", "#a8e0f0", "#ffffff", 2], 74, 22, 2.6, 5, 48, 30, ["freeze"], "It hides behind snowfall, badly.");
M("m_rwolf", "Rime Wolf", "wrathful", ["beast", "#8fa8c0", "#e8f4ff", 2], 108, 27, 3.0, 8, 60, 40, ["bleed"], "The pack sent its least patient member.");
M("m_troll", "Glacier Troll", "mad", ["humanoid", "#5a7d96", "#c0e0f0", 2], 165, 33, 4.6, 13, 82, 62, ["rage", "heal"], "It is talking to a rock. The rock is winning.");
M("m_sentinel", "Snowbound Sentinel", "dutiful", ["construct", "#6b7d96", "#dbe8ff", 2], 145, 29, 4.2, 16, 76, 55, ["shield", "stun"], "It asks for a password from an empire that fell.");
M("m_hoar", "Hoarfang", "proud", ["wyrm", "#4a6b8f", "#c8f0ff", 4], 380, 40, 3.8, 15, 220, 165, ["freeze", "aoe", "rage"], "Something enormous exhales, and the pass goes white.");
/* 6. Sunken Colonnade */
M("m_column", "Column Wraith", "ancient", ["ghost", "#8f96a8", "#e0e8f0", 3], 118, 30, 3.4, 9, 70, 48, ["drain"], "It holds up a ceiling that is no longer there.");
M("m_scholar", "Tidebound Scholar", "curious", ["humanoid", "#3f7d8f", "#a8e0d8", 2], 128, 28, 3.6, 11, 74, 66, ["confuse", "shield"], "It has waited centuries for someone to check its work.");
M("m_hound", "Marble Hound", "dutiful", ["beast", "#c0bfae", "#f0ece0", 2], 140, 34, 3.0, 14, 80, 52, ["stun"], "Loyal to a family that ended in this room.");
M("m_silt", "Silt Serpent", "hungry", ["wyrm", "#5a6b4a", "#a8c08f", 2], 155, 36, 3.4, 10, 86, 58, ["poison", "bleed"], "The floor was not floor.");
M("m_archivist", "The Archivist", "ancient", ["humanoid", "#2f5a6b", "#8fe0d8", 6], 430, 44, 3.6, 18, 260, 200, ["aoe", "shield", "summon"], "It looks up from a ledger of everyone who has entered. Your names are already written.");
/* 7. Umbral Reach */
M("m_gloom", "Gloom Knight", "proud", ["humanoid", "#3a3350", "#8f7ad0", 2], 185, 42, 3.6, 17, 100, 78, ["bleed", "rage"], "It salutes you. That is somehow worse.");
M("m_raven", "Ravenmask", "curious", ["fowl", "#2a2a3a", "#a8a0d0", 2], 158, 38, 2.8, 12, 96, 88, ["confuse"], "It wears a face it did not grow.");
M("m_dusk", "Duskhound", "wrathful", ["beast", "#4a2a4a", "#c06bd0", 4], 172, 44, 2.6, 13, 104, 70, ["bleed"], "It runs in the space between torchlight.");
M("m_vassal", "Iron Vassal", "dutiful", ["construct", "#4a4a5a", "#c0c8d8", 2], 220, 40, 4.4, 22, 112, 82, ["shield", "stun"], "Obedient to an order given three hundred years ago.");
M("m_blackgate", "Warden of the Black Gate", "dutiful", ["construct", "#2a2438", "#c08fd0", 4], 520, 52, 3.8, 24, 320, 260, ["aoe", "stun", "rage"], "The gate does not open. The gate stands up.");
/* 8. Aethervault Isles */
M("m_mite", "Cloudmite", "timid", ["insect", "#8fd8f0", "#ffffff", 4], 165, 44, 2.4, 12, 108, 70, ["slow"], "It bounces off you apologetically, twice.");
M("m_weaver", "Skyweaver", "curious", ["insect", "#6bc0e0", "#e0f8ff", 6], 195, 46, 3.0, 16, 118, 96, ["confuse", "heal"], "It is stitching the wind into something.");
M("m_herald", "Storm Herald", "proud", ["humanoid", "#4a8fd0", "#f0f0a0", 2], 215, 54, 3.4, 18, 130, 105, ["stun", "aoe"], "It announces the weather. The weather obeys.");
M("m_drake", "Featherfall Drake", "hungry", ["wyrm", "#e0c06b", "#fff0c0", 2], 240, 58, 3.2, 17, 140, 112, ["rage"], "It drops out of the sun with its mouth already open.");
M("m_zephyr", "Zephyr Tyrant", "proud", ["wyrm", "#8fe0f0", "#ffffff", 4], 620, 64, 3.4, 26, 400, 320, ["aoe", "stun", "rage"], "Every island tilts toward it. It enjoys that.");
/* 9. Cinderwaste */
M("m_fiend", "Emberfiend", "wrathful", ["humanoid", "#c04a2a", "#f0c06a", 4], 230, 62, 2.8, 20, 150, 118, ["burn"], "It burns from inside a hole in the world.");
M("m_slag", "Slag Hound", "hungry", ["beast", "#8f2a1a", "#f08a4a", 2], 255, 66, 2.6, 18, 158, 122, ["burn", "bleed"], "It leaves glass footprints.");
M("m_ogre", "Brimstone Ogre", "mad", ["humanoid", "#7a3a2a", "#e0a05a", 1], 330, 74, 4.2, 26, 175, 145, ["rage", "aoe"], "It is counting something. It keeps losing count.");
M("m_wound", "Wound-in-the-Air", "ancient", ["void", "#2a1a2a", "#e06bc0", 0], 285, 70, 3.4, 22, 185, 150, ["drain", "confuse"], "There is nothing there. It is looking at you anyway.");
M("m_cinderlord", "The Cinderlord", "proud", ["humanoid", "#a02a1a", "#ffb86a", 6], 760, 82, 3.4, 30, 520, 420, ["burn", "aoe", "rage", "summon"], "It stands where the fire is thickest, and finds you interesting.");
/* 10. The Pale Concord */
M("m_herald2", "Pale Herald", "dutiful", ["ghost", "#e8e4f0", "#ffffff", 2], 300, 78, 3.0, 24, 200, 160, ["drain"], "It reads your name from a list and looks disappointed.");
M("m_acolyte", "Null Acolyte", "ancient", ["humanoid", "#c0b8d8", "#ffffff", 3], 320, 82, 3.4, 26, 215, 175, ["shield", "confuse"], "It prays to a silence that answers.");
M("m_teeth", "Chorus of Teeth", "hungry", ["void", "#3a2a4a", "#ffffff", 9], 360, 88, 2.8, 22, 235, 185, ["bleed", "aoe"], "It is a smile the size of a doorway.");
M("m_unwritten", "The Unwritten One", "sorrowful", ["void", "#1a1a2a", "#c0a8f0", 1], 340, 84, 3.6, 28, 245, 195, ["drain", "sleep"], "It was almost somebody. It resents the almost.");
M("m_judge", "The Quiet Judge", "ancient", ["humanoid", "#d8d0e8", "#8f7ad0", 2], 900, 96, 3.4, 34, 640, 520, ["aoe", "stun", "shield", "summon"], "It has heard your case. It has not decided.");

/* ---- biomes ---- */
const BIOMES = [
  { id: "greenwood", name: "Greenwood Verge", scene: "forest", pal: ["#1b2a1c", "#3c5c33", "#7fa04f", "#c9d98a"], mons: ["m_grub", "m_thistle", "m_stag", "m_bramble"], elite: "m_root", tier: 0, flavor: ["Sap runs where nothing was cut.", "The path is older than the trees around it.", "Something small keeps pace with you, out of sight."] },
  { id: "glimmer", name: "Glimmerdeep Caverns", scene: "cavern", pal: ["#0f1a24", "#1e3a4a", "#3f9a96", "#a8f0e8"], mons: ["m_shard", "m_echo", "m_quartz", "m_lumen"], elite: "m_geode", tier: 1, flavor: ["Your light comes back to you from four directions.", "The walls are growing, slowly, inward.", "Every footstep is repeated by something patient."] },
  { id: "ashfall", name: "Ashfall Barrens", scene: "desert", pal: ["#2a1a12", "#7a4a26", "#c8863f", "#f2d99a"], mons: ["m_jackal", "m_wretch", "m_cinder", "m_husk"], elite: "m_kiln", tier: 2, flavor: ["The wind carries grit and old smoke.", "Bones here are arranged, not scattered.", "Heat rises off a road that leads nowhere."] },
  { id: "mirefen", name: "Mirefen Hollow", scene: "swamp", pal: ["#141d16", "#2d4030", "#5f7a3a", "#9fc46a"], mons: ["m_croak", "m_leech", "m_widow", "m_rot"], elite: "m_chorus", tier: 3, flavor: ["The water is warmer than it should be.", "Lanterns hang from nothing, still lit.", "Something exhales beneath the reeds."] },
  { id: "rimewind", name: "Rimewind Peaks", scene: "peaks", pal: ["#141c2a", "#33506e", "#7fa8cc", "#e6f4ff"], mons: ["m_wisp", "m_rwolf", "m_troll", "m_sentinel"], elite: "m_hoar", tier: 4, flavor: ["The cold has opinions about your armour.", "A frozen banner marks a company that never came down.", "Snow falls upward here for a few seconds at a time."] },
  { id: "colonnade", name: "Sunken Colonnade", scene: "ruins", pal: ["#14201f", "#2f4f4a", "#6f9a8a", "#d6e0c8"], mons: ["m_column", "m_scholar", "m_hound", "m_silt"], elite: "m_archivist", tier: 5, flavor: ["Pillars stand in water that has no shore.", "Someone recently swept these steps.", "The carvings show this room, with you in it."] },
  { id: "umbral", name: "Umbral Reach", scene: "castle", pal: ["#120f1c", "#2c2444", "#5a4a86", "#b8a8e0"], mons: ["m_gloom", "m_raven", "m_dusk", "m_vassal"], elite: "m_blackgate", tier: 6, flavor: ["The torches burn without giving light.", "Every door in this hall is a different height.", "A court still keeps its schedule here."] },
  { id: "aether", name: "Aethervault Isles", scene: "sky", pal: ["#12253a", "#2f6b96", "#6fc0e0", "#f6e6a8"], mons: ["m_mite", "m_weaver", "m_herald", "m_drake"], elite: "m_zephyr", tier: 7, flavor: ["The bridge between islands is made of held breath.", "Rain falls sideways past you and never lands.", "There is no ground to fall to, only more sky."] },
  { id: "cinder", name: "Cinderwaste", scene: "waste", pal: ["#1d0d0b", "#5c1f16", "#b8452a", "#f0a05a"], mons: ["m_fiend", "m_slag", "m_ogre", "m_wound"], elite: "m_cinderlord", tier: 8, flavor: ["The ash remembers being a city.", "Fires burn with nothing left to burn.", "A bell rings somewhere under the slag."] },
  { id: "pale", name: "The Pale Concord", scene: "pale", pal: ["#1a1826", "#3d3a5c", "#8f88c0", "#efe9ff"], mons: ["m_herald2", "m_acolyte", "m_teeth", "m_unwritten"], elite: "m_judge", tier: 9, flavor: ["Everything here is very slightly too quiet.", "Your shadow arrives a moment after you do.", "The light has no source and no warmth."] },
];
const DUNGEON = { id: "vault", name: "The Sealed Vault", scene: "vault", pal: ["#0d0b14", "#2a1f3a", "#6b4a8f", "#e0c06b"], tier: 10, mons: ["m_teeth", "m_acolyte", "m_unwritten", "m_wound", "m_fiend", "m_herald2"], elite: "m_judge", flavor: ["The door was locked from this side.", "Nine seals, eight of them broken already.", "Something at the bottom notices you starting down."] };

/* ---- final bosses (chosen at random, never voted on) ---- */
const BOSSES = [
  { id: "wyrm", name: "Vashkaroth, the Emberwyrm", art: ["wyrm", "#a02a1a", "#ffcf6a", 2], hp: 1500, dmg: 74, cd: 2.6, def: 26, exp: 1600, gold: 1800,
    intro: "The vault floor is scale, and the scale is breathing.",
    phases: [
      { at: 1.0, name: "Kindling", abil: ["burn"], line: "Vashkaroth opens one eye. \"Small warm things. Come closer.\"" },
      { at: 0.6, name: "Firestorm", abil: ["burn", "aoe"], line: "Vashkaroth rears up. The whole vault takes a breath in. \"YOU HAVE MADE ME STAND.\"" },
      { at: 0.25, name: "Last Ember", abil: ["burn", "aoe", "rage"], line: "Scales fall away and the light underneath is unbearable. \"THEN BURN WITH ME.\"" },
    ] },
  { id: "witch", name: "Nyssel, the Hollow Witch", art: ["humanoid", "#3a2a5a", "#c0a8f0", 6], hp: 1250, dmg: 66, cd: 2.2, def: 20, exp: 1600, gold: 1800,
    intro: "A woman made of borrowed outlines turns to face the party.",
    phases: [
      { at: 1.0, name: "Invitation", abil: ["confuse", "drain"], line: "Nyssel smiles with someone else's mouth. \"I have been collecting. You will fit.\"" },
      { at: 0.65, name: "Unravelling", abil: ["confuse", "drain", "summon"], line: "She pulls a thread and three of your own shadows step out. \"Meet yourselves.\"" },
      { at: 0.3, name: "Hollow Hour", abil: ["aoe", "sleep", "drain"], line: "The room empties of colour. \"Sleep. I will finish this quietly.\"" },
    ] },
  { id: "demon", name: "Ordrun, the Undying Anvil", art: ["construct", "#4a2a1a", "#f08a4a", 3], hp: 1800, dmg: 62, cd: 3.0, def: 34, exp: 1600, gold: 1800,
    intro: "Something enormous is hammering. It stops. It turns around.",
    phases: [
      { at: 1.0, name: "Forging", abil: ["stun", "shield"], line: "Ordrun lifts a hammer the size of a cart. \"YOU ARE MATERIAL.\"" },
      { at: 0.6, name: "Tempering", abil: ["stun", "aoe", "shield"], line: "It plunges its arm into its own chest-furnace and comes out white-hot." },
      { at: 0.25, name: "Quenching", abil: ["aoe", "rage", "burn"], line: "The anvil cracks. \"GOOD. GOOD. NOW YOU RING TRUE.\"" },
    ] },
  { id: "maw", name: "The Ninefold Maw", art: ["void", "#1a1024", "#e06bc0", 9], hp: 1400, dmg: 70, cd: 2.4, def: 22, exp: 1600, gold: 1800,
    intro: "The last seal opens onto a room with far too many doors, all of them teeth.",
    phases: [
      { at: 1.0, name: "First Mouth", abil: ["bleed", "drain"], line: "Nine voices ask the same question a beat apart. \"WHO CAME DOWN?\"" },
      { at: 0.6, name: "Sixth Mouth", abil: ["bleed", "aoe", "confuse"], line: "Three of the doors close. The rest inhale." },
      { at: 0.28, name: "Ninth Mouth", abil: ["aoe", "rage", "drain"], line: "Every mouth speaks at once, in your own voices. \"STAY.\"" },
    ] },
];

/* ---- talk: personality affinities & lines ---- */
const TALK_OPTS = [
  { id: "compliment", name: "Compliment", hint: "Flattery" },
  { id: "joke", name: "Joke", hint: "Disarm" },
  { id: "threaten", name: "Threaten", hint: "Intimidate" },
  { id: "bribe", name: "Bribe", hint: "25 gold" },
  { id: "ask", name: "Ask a question", hint: "Learn" },
  { id: "mercy", name: "Show mercy", hint: "Lower your guard" },
];
const AFF = {
  proud: { compliment: 32, joke: -16, threaten: -6, bribe: -12, ask: 6, mercy: -6 },
  timid: { compliment: 16, joke: 10, threaten: -26, bribe: 20, ask: 0, mercy: 28 },
  greedy: { compliment: 6, joke: -4, threaten: -10, bribe: 36, ask: 6, mercy: 0 },
  hungry: { compliment: 0, joke: 6, threaten: -10, bribe: 26, ask: -6, mercy: 12 },
  wrathful: { compliment: -10, joke: -20, threaten: 22, bribe: -4, ask: -10, mercy: -14 },
  curious: { compliment: 6, joke: 16, threaten: -20, bribe: 0, ask: 32, mercy: 6 },
  sorrowful: { compliment: 12, joke: -10, threaten: -22, bribe: -6, ask: 10, mercy: 32 },
  mad: { compliment: 6, joke: 32, threaten: 0, bribe: -10, ask: -10, mercy: 6 },
  dutiful: { compliment: 12, joke: -16, threaten: 6, bribe: -22, ask: 12, mercy: 12 },
  ancient: { compliment: 10, joke: -20, threaten: -26, bribe: -16, ask: 22, mercy: 16 },
};
const LINES = {
  proud: { good: ["It straightens, pleased. \"You have some sense in you.\"", "\"Finally. Someone who recognises quality.\""], bad: ["\"Do not waste my bearing on you.\"", "It looks past you, insulted."] },
  timid: { good: ["It stops shaking quite so much.", "\"You — you're not going to, um. Right. Okay.\""], bad: ["It shrieks and lashes out on instinct!", "\"Why does everyone DO that?\""] },
  greedy: { good: ["It counts something invisible and looks satisfied.", "\"Now THAT is a conversation.\""], bad: ["\"That's it? That's your offer?\"", "It spits, unimpressed."] },
  hungry: { good: ["It stops chewing. That is progress.", "\"...you have more of that?\""], bad: ["Its stomach makes the decision for it.", "\"Talk is thin. You are not.\""] },
  wrathful: { good: ["It grunts. Grudging respect, or close enough.", "\"Say that again. Louder.\""], bad: ["That was exactly the wrong thing to say!", "It roars and comes on harder!"] },
  curious: { good: ["It tilts its head, delighted. \"Go on. Go ON.\"", "\"Nobody has ever explained that to me.\""], bad: ["It loses interest in you entirely.", "\"Boring. And now, briefly, fatal.\""] },
  sorrowful: { good: ["Something in it eases very slightly.", "\"You are the first to say so.\""], bad: ["It turns away, and the grief turns to something worse.", "\"Do not pretend to understand.\""] },
  mad: { good: ["It laughs so hard it forgets to attack.", "\"HA! Yes! Wrong, but yes!\""], bad: ["It laughs anyway. That is somehow worse.", "\"No no no no no. No.\""] },
  dutiful: { good: ["\"That is... within the terms. Continue.\"", "It nods once, formally."], bad: ["\"I have my orders.\"", "\"You are attempting to alter a standing instruction.\""] },
  ancient: { good: ["It considers you across a very long time.", "\"You ask well. Few do, now.\""], bad: ["\"You are brief. You will stay brief.\"", "The air gets heavier."] },
};
const FACTS = [
  "\"The deep road is a mouth. Do not thank it.\"",
  "\"Everything down here is walking away from the same thing.\"",
  "\"There were ten seals. There are not ten any more.\"",
  "\"Gold is heavier past the ninth gate. Nobody knows why.\"",
  "\"The one at the bottom does not sleep. It waits politely.\"",
  "\"Cold iron makes the pale ones hesitate. Only hesitate.\"",
  "\"Your party will be offered a door that is already open. That is the wrong door.\"",
  "\"Speak to the old things before you cut them. They remember which.\"",
];

/* ==========================================================================
   RULES — derived stats, damage, loot
   ========================================================================== */
const DEFAULTS = {
  maxPlayers: 15, minPlayers: 1, joinAfterStart: true,
  autoReady: true, readyTimer: 45, voteTimer: 25,
  biomes: 5, minAreas: 4, maxAreas: 7, dungeonAreas: 3,
  difficulty: 1, monsterPower: 1, loot: 1, shopFreq: 1, treasureFreq: 1,
  respawn: 20, lossMode: "one", loseEquipped: false, wipeMode: "area",
  friendlyFire: false, seed: 0,
};
const DIFF_LABEL = ["Gentle", "Standard", "Harsh", "Merciless"];
const FREQ_LABEL = ["Rare", "Normal", "Common"];
const LOSS_LABEL = { none: "Nothing", one: "1 item", two: "2 items", half: "Half the pack", cons: "Random consumable" };
const WIPE_LABEL = { area: "Restart this area", biome: "Restart this biome", adventure: "Restart the adventure" };

function expNeed(lvl) { return 48 + lvl * 34; }
function poolFor(kind, cls) {
  const a = POOLS[kind + ":" + cls] || [];
  const b = kind === "acc" || kind === "use" ? POOLS[kind + ":any"] || [] : [];
  return a.concat(b);
}
function rarityRoll(r, tier, bias) {
  const t = clamp(tier, 0, 10), w = [
    Math.max(4, 52 - t * 5 - bias * 8), 28 + t * 0.5, 12 + t * 2 + bias * 4,
    3 + t * 1.8 + bias * 4, 0.4 + t * 0.7 + bias * 2,
  ];
  const tot = w.reduce((a, b) => a + b, 0); let x = r() * tot;
  for (let i = 0; i < 5; i++) { x -= w[i]; if (x <= 0) return i; }
  return 0;
}
function rollItem(r, cls, tier, bias, kindHint) {
  let kind = kindHint;
  if (!kind) {
    const x = r();
    kind = x < 0.28 ? "weapon" : x < 0.46 ? "armor" : x < 0.68 ? "acc" : "use";
  }
  if (kind === "weapon") kind = cls === "archer" && r() < 0.3 ? "arrows" : CLS_WEAPON[cls];
  const pool = poolFor(kind, cls);
  if (!pool.length) return "u_hp";
  let want = rarityRoll(r, tier, bias);
  if (kind === "use") want = Math.min(want, 1);
  for (let d = 0; d < 5; d++) {
    for (const s of [want - d, want + d]) {
      const c = pool.filter((id) => ITEMS[id].rar === s);
      if (c.length) return pick(r, c);
    }
  }
  return pick(r, pool);
}
function statusBonus(p) {
  const o = { atk: 0, def: 0, spd: 0, cha: 0, slow: 0, ward: 0 };
  (p.st || []).forEach((s) => {
    if (s.k === "atkUp") o.atk += s.v; else if (s.k === "defUp") o.def += s.v;
    else if (s.k === "spdUp") o.spd += s.v; else if (s.k === "chaUp") o.cha += s.v / 10;
    else if (s.k === "slow") o.slow = 1; else if (s.k === "ward") o.ward = 1;
    else if (s.k === "rage") o.atk += 40;
  });
  return o;
}
function derive(p) {
  const eq = p.eq || {};
  const w = ITEMS[eq.weapon] || null, ar = ITEMS[eq.armor] || null;
  const ac = ITEMS[eq.acc] || null, q = p.cls === "archer" ? ITEMS[eq.arrows] || null : null;
  const b = { hp: 0, atk: 0, def: 0, spd: 0, cha: 0, mana: 0, cdr: 0, loot: 0 };
  [w, ar, ac, q].forEach((it) => { if (it && it.b) Object.keys(it.b).forEach((k) => { b[k] = (b[k] || 0) + it.b[k]; }); });
  const sb = statusBonus(p);
  const atk = p.atk + b.atk, def = p.def + b.def, spd = p.spd + b.spd, cha = p.cha + b.cha + sb.cha;
  const maxHp = 55 + p.level * 13 + def * 5 + b.hp;
  const maxMana = p.cls === "mage" ? 45 + p.level * 8 + b.mana : 0;
  let sf = clamp(10 / (10 + spd * 0.55), 0.4, 1);
  sf *= 1 - b.cdr / 100;
  if (sb.spd) sf *= 1 - sb.spd / 100;
  if (sb.slow) sf *= 1.65;
  const wcd = w ? w.cd : 3.6;
  const acd = Math.max(0.6, wcd * sf);
  const dcd = Math.max(1.2, (ar ? ar.dcd : 6) * sf);
  const dur = (ar ? ar.dur : 2.2) * 1000;
  const red = ar ? ar.red : 0.45;
  const dmg = Math.round(((w ? w.dmg : 5) + (q ? q.dmg : 0) + atk * 1.9) * (1 + sb.atk / 100));
  return { atk, def, spd, cha, maxHp, maxMana, acd, dcd, dur, red, dmg, w, ar, ac, q, b, loot: b.loot, sb };
}
function critChance(d) { return clamp(0.05 + d.spd * 0.006, 0.05, 0.32); }
function playerTakes(p, raw, opts) {
  const d = derive(p); const o = opts || {};
  let x = raw * (14 / (14 + d.def * 1.15));
  if (!o.pierce && p.defUntil && p.defUntil > now()) x *= 1 - d.red;
  if (d.sb.def) x *= 1 - d.sb.def / 100;
  if (d.sb.ward) x *= 0.55;
  return Math.max(1, Math.round(x));
}
function enemyTakes(e, raw, pierce) {
  let x = raw * (pierce ? 1 : 16 / (16 + e.def));
  if (hasSt(e, "shield")) x *= 0.55;
  if (hasSt(e, "sleep")) x *= 1.6;
  return Math.max(Math.max(1, Math.round(raw * 0.12)), Math.round(x));
}
const hasSt = (u, k) => !!(u.st || []).find((s) => s.k === k);
function addSt(u, k, secs, v) {
  u.st = (u.st || []).filter((s) => s.k !== k);
  u.st.push({ k, until: now() + secs * 1000, next: now() + 1600, v: v || 0 });
}
function invSpace(p) { return (p.inv || []).length < 5; }
function addItem(p, id, n) {
  n = n || 1; const it = ITEMS[id]; if (!it) return false;
  p.inv = p.inv || [];
  if (it.stack) {
    const s = p.inv.find((x) => x.id === id);
    if (s) { s.n = Math.min(9, s.n + n); return true; }
  }
  if (p.inv.length >= 5) return false;
  p.inv.push({ id, n: it.stack ? n : 1 });
  return true;
}
function takeSlot(p, i) {
  const s = p.inv[i]; if (!s) return null;
  if (s.n > 1) { s.n--; } else { p.inv.splice(i, 1); }
  return s.id;
}
const itemPower = (id) => { const i = ITEMS[id]; return i ? i.rar * 10 + i.dmg + (i.b.hp || 0) / 5 : 0; };

/* ==========================================================================
   ENGINE — authoritative game state (run by the host client)
   ========================================================================== */
function newGame(code, hostId, seed) {
  return {
    v: 5, code, hostId, t: now(), phase: "lobby", seed: seed || (Math.random() * 1e9) | 0,
    settings: Object.assign({}, DEFAULTS), players: {}, order: [], ack: {},
    biome: 0, areaNo: 0, areasInBiome: 0, biomesDone: 0, inDungeon: false, dungeonStep: 0,
    area: null, enemies: [], log: [], ls: 0, vote: null, readyAt: 0, wipeAt: 0,
    boss: null, startedAt: 0, endedAt: 0, tally: null, msg: "",
  };
}
function newPlayer(id, name, cls) {
  return {
    id, name: (name || "Adventurer").slice(0, 14), cls: cls || null, seen: now(), conn: true,
    level: 1, exp: 0, hp: 60, mana: 0, atk: 0, def: 0, spd: 0, cha: 0, pts: 0, gold: 60,
    inv: [], eq: {}, st: [], ready: false, dead: false, respawnAt: 0, atkAt: 0, defAt: 0,
    defUntil: 0, talkAt: 0, tot: { dmg: 0, heal: 0, kills: 0, gold: 0, items: 0, deaths: 0 },
  };
}
function setClass(p, cls) {
  p.cls = cls; const c = CLASSES[cls];
  p.atk = c.base.atk; p.def = c.base.def; p.spd = c.base.spd; p.cha = c.base.cha;
  p.eq = {}; p.inv = [];
  c.start.forEach((id) => {
    const it = ITEMS[id];
    if (it.kind === "armor") p.eq.armor = id;
    else if (it.kind === "arrows") p.eq.arrows = id;
    else if (["sword", "bow", "rod"].includes(it.kind)) p.eq.weapon = id;
  });
  addItem(p, "u_hp", 2);
  if (cls === "mage") addItem(p, "u_mp", 2);
  const d = derive(p); p.hp = d.maxHp; p.mana = d.maxMana;
}
function L(g, k, m, x) {
  g.ls = (g.ls || 0) + 1;
  const e = Object.assign({ i: g.ls, t: now(), k, m }, x || {});
  g.log.push(e);
  if (g.log.length > 110) g.log.splice(0, g.log.length - 110);
}
const alive = (g) => g.order.map((i) => g.players[i]).filter((p) => p && p.cls && !p.dead);
const active = (g) => g.order.map((i) => g.players[i]).filter((p) => p && p.cls);
const liveEnemies = (g) => (g.enemies || []).filter((e) => e.hp > 0);
const curBiome = (g) => (g.inDungeon ? DUNGEON : BIOMES[Math.min(g.biome, BIOMES.length - 1)]);
const tierOf = (g) => (g.inDungeon ? 10 + g.dungeonStep : curBiome(g).tier) + (g.settings.difficulty - 1);

/* ---- enemies ---- */
// The dungeon is always tuned to how far the party actually got, so a short
// 2-biome run doesn't slam a level-2 party into tier-9 monsters.
function monPool(g) {
  if (!g.inDungeon) { const b = curBiome(g); return { mons: b.mons, elite: b.elite }; }
  const hi = clamp(Math.max(g.biome, g.biomesDone - 1), 0, BIOMES.length - 1);
  const lo = Math.max(0, hi - 1);
  return { mons: BIOMES[hi].mons.concat(BIOMES[lo].mons), elite: BIOMES[hi].elite };
}
function mkEnemy(g, monId, r, opt) {
  const m = MONS[monId]; const o = opt || {};
  const n = Math.max(1, active(g).length);
  const sizeMul = 0.62 + 0.38 * n;
  const dm = g.settings.monsterPower * (0.75 + g.settings.difficulty * 0.25);
  const lvlMul = 1 + g.areaNo * 0.007;
  const hp = Math.round(m.hp * sizeMul * dm * lvlMul * (o.elite ? 1.35 : 1));
  return {
    uid: uid(), id: monId, name: (o.elite ? "Elite " : "") + m.name, art: m.art, pers: m.pers,
    hp, maxHp: hp, dmg: Math.round(m.dmg * dm * lvlMul * (o.elite ? 1.2 : 1)), def: Math.round(m.def * dm),
    cd: m.cd, exp: Math.round(m.exp * (o.elite ? 1.5 : 1)), gold: Math.round(m.gold * (o.elite ? 1.6 : 1)),
    abil: m.abil.slice(), greet: m.greet, next: now() + 1800 + Math.random() * 1500,
    st: [], mercy: 0, tries: 0, tk: {}, elite: !!o.elite, boss: false,
  };
}
function mkBoss(g, b) {
  const n = Math.max(1, active(g).length);
  // Short adventures produce lower-level parties, so the boss is scaled to the
  // journey the host actually configured rather than always assuming 10 biomes.
  const avgLvl = Math.max(1, active(g).reduce((a, p) => a + p.level, 0) / n);
  const pm = clamp(avgLvl / 14, 0.3, 1.15);
  const dm = g.settings.monsterPower * (0.8 + g.settings.difficulty * 0.2) * pm;
  const hp = Math.round(b.hp * (0.55 + 0.45 * n) * dm);
  return {
    uid: uid(), id: b.id, name: b.name, art: b.art, pers: "ancient", hp, maxHp: hp,
    dmg: Math.round(b.dmg * dm), def: b.def, cd: b.cd, exp: b.exp, gold: b.gold,
    abil: b.phases[0].abil.slice(), greet: b.intro, next: now() + 3000, st: [], mercy: 0,
    tries: 0, tk: {}, boss: true, ph: 0,
  };
}

/* ---- area naming & generation ---- */
const ADJ = ["Overgrown", "Silent", "Broken", "Sunless", "Weeping", "Crooked", "Forgotten", "Hollow", "Bitter", "Pale", "Wandering", "Last"];
const NOUN = {
  forest: ["Trailhead", "Thicket", "Glade", "Deadfall", "Briar Path", "Watchtree"],
  cavern: ["Gallery", "Drip Hall", "Shaftmouth", "Vein", "Undercut", "Echo Well"],
  desert: ["Wash", "Bone Flat", "Kiln Road", "Sink", "Glass Field", "Waystone"],
  swamp: ["Boardwalk", "Sinkpool", "Reedmaze", "Drowned Row", "Lanternway"],
  peaks: ["Cornice", "Wind Gap", "Icefall", "Cairn Line", "Frozen Camp"],
  ruins: ["Peristyle", "Flooded Nave", "Step Well", "Broken Arcade", "Tide Court"],
  castle: ["Long Hall", "Undercroft", "Portcullis", "Black Stair", "Sconce Row"],
  sky: ["Anchor Isle", "Windbridge", "Cloudshelf", "Torn Span", "Lift Stone"],
  waste: ["Slag Field", "Ashfall", "Cracked Yard", "Ember Row", "Cinder Gate"],
  pale: ["White Court", "Quiet Row", "Blank Terrace", "Named Stair", "Concord Gate"],
  vault: ["Seal", "Descent", "Antechamber", "Locked Stair", "Inner Ring"],
};
function areaName(r, scene) { return pick(r, ADJ) + " " + pick(r, NOUN[scene] || NOUN.forest); }

const SHOPKEEPERS = [
  { n: "Bern Ossik", p: "greedy", l: "\"Everything's priced fair. Fair to me.\"" },
  { n: "Old Wick", p: "sorrowful", l: "\"Take what you need. It won't help, but take it.\"" },
  { n: "Halloway the Third", p: "proud", l: "\"You are buying from a licensed concern. Behave accordingly.\"" },
  { n: "Small Muriel", p: "curious", l: "\"Tell me where you've been and I'll tell you what you need.\"" },
  { n: "The Quartermaster", p: "dutiful", l: "\"Requisition, payment, departure. In that order.\"" },
];
const EVENTS = [
  { id: "shrine", t: "A Cracked Shrine", d: "Someone has left offerings here for a god with no name left. The bowl is still warm.", o: [
    { l: "Leave a coin (20 gold)", fx: "bless" }, { l: "Take the offerings", fx: "steal" }, { l: "Bow and move on", fx: "rest" }] },
  { id: "well", t: "The Listening Well", d: "A well with no bottom. If you speak into it, something repeats your words back with a different meaning.", o: [
    { l: "Ask it a question", fx: "info" }, { l: "Drink the water", fx: "gamble" }, { l: "Drop a stone and wait", fx: "exp" }] },
  { id: "corpse", t: "A Well-Dressed Corpse", d: "They died well-equipped, which raises questions about what happened.", o: [
    { l: "Search the body", fx: "loot" }, { l: "Bury them properly", fx: "bless" }, { l: "Read their letters", fx: "info" }] },
  { id: "camp", t: "An Abandoned Camp", d: "The fire is banked, the bedrolls are made, and nobody has been here for a very long time.", o: [
    { l: "Rest by the fire", fx: "rest" }, { l: "Search the packs", fx: "loot" }, { l: "Take the firewood", fx: "gold" }] },
  { id: "door", t: "A Door That Is Already Open", d: "It stands in the middle of the path with nothing on either side of it. Through the frame, the road looks shorter.", o: [
    { l: "Step through", fx: "gamble" }, { l: "Walk around it", fx: "exp" }, { l: "Close it", fx: "bless" }] },
  { id: "market", t: "A Wandering Merchant's Cart", d: "The wheels are broken. The merchant is nowhere. The stock is not.", o: [
    { l: "Take what you can carry", fx: "loot" }, { l: "Leave payment", fx: "bless" }, { l: "Repair the wheel", fx: "gold" }] },
];
const NPCS = [
  { n: "Tam Harrowe, mapmaker", l: "\"I draw where people die. It's steady work. Here — this stretch is wrong on every other map.\"", fx: "info" },
  { n: "The Lamplighter", l: "\"I light them going down. Nobody's ever needed one coming back up.\"", fx: "bless" },
  { n: "Sister Vell", l: "\"Sit. Breathe. The road will still be terrible in five minutes.\"", fx: "rest" },
  { n: "A very small knight", l: "\"I am on a quest. I will not say for what. Take this, I have two.\"", fx: "loot" },
];

function genArea(g, spec) {
  const r = rngFrom(hashStr(g.seed + ":" + g.areaNo + ":" + (spec.type || "x")));
  const bi = curBiome(g);
  const a = { type: spec.type, name: spec.name || areaName(r, bi.scene), scene: bi.scene, seed: (r() * 1e9) | 0, cleared: false, desc: pick(r, bi.flavor) };
  g.enemies = [];
  const tier = tierOf(g);
  const pool = monPool(g);
  if (spec.type === "combat" || spec.type === "multi" || spec.type === "elite") {
    const n = spec.type === "combat" ? 1 : spec.type === "multi" ? ri(r, 2, Math.min(5, 2 + Math.floor(active(g).length / 3))) : 1;
    for (let i = 0; i < n; i++) g.enemies.push(mkEnemy(g, pick(r, pool.mons), r, {}));
    if (spec.type === "elite") {
      g.enemies = [mkEnemy(g, pool.elite || pick(r, pool.mons), r, { elite: true })];
      if (r() < 0.5) g.enemies.push(mkEnemy(g, pick(r, pool.mons), r, {}));
    }
  } else if (spec.type === "boss") {
    const b = BOSSES[Math.floor(r() * BOSSES.length)];
    g.boss = b.id; a.name = b.name; a.bossDef = b.id;
    g.enemies = [mkBoss(g, b)];
  } else if (spec.type === "shop") {
    const k = pick(r, SHOPKEEPERS);
    const cnt = ri(r, 1, 5);
    const items = [];
    const classesHere = Array.from(new Set(active(g).map((p) => p.cls)));
    for (let i = 0; i < cnt; i++) {
      const cls = classesHere.length ? pick(r, classesHere) : "sword";
      const kind = r() < 0.5 ? "use" : r() < 0.5 ? "weapon" : r() < 0.5 ? "acc" : "armor";
      const id = rollItem(r, cls, tier, g.settings.loot - 1, kind);
      if (items.find((x) => x.id === id)) { i--; continue; }
      const base = ITEMS[id].price || 25;
      items.push({ id, price: Math.max(8, Math.round(base * (0.85 + r() * 0.5))), stock: ITEMS[id].stack ? ri(r, 2, 5) : ri(r, 1, 2) });
    }
    a.shop = { keeper: k.n, pers: k.p, line: k.l, items, disc: {}, hag: {} };
    a.name = "Trade Post — " + k.n;
    a.cleared = true;
  } else if (spec.type === "chest") {
    a.chest = { offers: {}, taken: {} };
    a.name = pick(r, ["Sealed Cache", "Buried Strongbox", "Reliquary Chest", "Traveller's Hoard"]);
    a.cleared = true;
  } else if (spec.type === "event" || spec.type === "npc") {
    if (spec.type === "npc") {
      const n = pick(r, NPCS);
      a.event = { t: n.n, d: n.l, o: [{ l: "Accept their help", fx: n.fx }, { l: "Ask about the road ahead", fx: "info" }, { l: "Keep walking", fx: "none" }], done: {} };
      a.name = "A Meeting on the Road";
    } else {
      const e = pick(r, EVENTS);
      a.event = { t: e.t, d: e.d, o: e.o.map((x) => ({ l: x.l, fx: x.fx })), done: {} };
      a.name = e.t;
    }
    a.cleared = true;
  } else if (spec.type === "rest") {
    a.name = "A Place to Stop";
    a.event = { t: "A Place to Stop", d: "Nothing here wants to kill you, which by itself is worth the detour.", o: [{ l: "Rest and recover", fx: "rest" }], done: {} };
    a.cleared = true;
  }
  g.area = a;
  g.areaNo++; g.areasInBiome++;
  if (g.inDungeon) g.dungeonStep++;
  active(g).forEach((p) => { p.ready = false; });
  L(g, "big", "— " + a.name + " —");
  L(g, "sys", a.desc);
  if (g.enemies.length) {
    g.enemies.forEach((e) => L(g, "mons", e.name + ". " + e.greet));
    L(g, "hurt", g.enemies.length > 1 ? g.enemies.length + " enemies block the way!" : g.enemies[0].name + " blocks the way!");
  } else if (a.shop) { L(g, "loot", a.shop.keeper + ": " + a.shop.line); }
  else if (a.chest) { L(g, "loot", "A chest sits unopened. Everyone gets one pick."); }
  else if (a.event) { L(g, "talk", a.event.t + " — " + a.event.d); }
  if (a.cleared) startReady(g);
}
function areaWeights(g) {
  const s = g.settings;
  const el = g.areaNo < 3 ? 0 : 9;
  return [["combat", 30], ["multi", g.areaNo < 2 ? 8 : 20], ["elite", el], ["shop", 9 * s.shopFreq], ["chest", 10 * s.treasureFreq], ["event", 12], ["npc", 7], ["rest", 5]];
}
function rollType(r, g) {
  const w = areaWeights(g); const tot = w.reduce((a, b) => a + b[1], 0);
  let x = r() * tot;
  for (const [k, v] of w) { x -= v; if (x <= 0) return k; }
  return "combat";
}
const DANGER = { combat: "Medium", multi: "High", elite: "Very high", shop: "None", chest: "Low", event: "Unknown", npc: "None", rest: "None", boss: "Extreme" };
const REWARD = { combat: "Experience", multi: "Experience, gold", elite: "Rare loot", shop: "Supplies", chest: "Equipment", event: "Unknown", npc: "A favour", rest: "Recovery", boss: "The end of it" };
function genDestinations(g) {
  const r = rngFrom(hashStr(g.seed + ":dest:" + g.areaNo));
  const s = g.settings;
  const opts = [];
  const bi = curBiome(g);
  if (g.inDungeon) {
    for (let i = 0; i < 3; i++) {
      const t = pick(r, ["elite", "multi", "chest", "event", "combat"]);
      opts.push({ type: t, name: areaName(r, "vault"), danger: DANGER[t], reward: REWARD[t] });
    }
    return opts;
  }
  const canBiome = g.areasInBiome >= s.minAreas && g.biomesDone + 1 < s.biomes;
  const mustBiome = g.areasInBiome >= s.maxAreas;
  const finalReady = g.biomesDone + 1 >= s.biomes && g.areasInBiome >= s.minAreas;
  const types = [];
  for (let i = 0; i < 3; i++) {
    let t = rollType(r, g), guard = 0;
    while (types.filter((x) => x === t).length >= 2 && guard++ < 8) t = rollType(r, g);
    types.push(t);
    opts.push({ type: t, name: areaName(r, bi.scene), danger: DANGER[t], reward: REWARD[t] });
  }
  if (finalReady) {
    opts[2] = { type: "dungeon", name: DUNGEON.name, danger: "Extreme", reward: "The final descent", dungeon: true };
    if (g.areasInBiome >= s.maxAreas) { opts[1] = { type: "dungeon", name: "The Ninth Seal", danger: "Extreme", reward: "The final descent", dungeon: true }; }
  } else if (canBiome && (mustBiome || r() < 0.5)) {
    const nb = BIOMES[Math.min(g.biome + 1, BIOMES.length - 1)];
    opts[2] = { type: "combat", name: nb.name, danger: "Rising", reward: "New territory", biome: g.biome + 1, newBiome: true };
  }
  return opts;
}

/* ---- phase helpers ---- */
function startReady(g) {
  if (g.phase !== "play") return;
  if (g.settings.autoReady && !g.readyAt) g.readyAt = now() + g.settings.readyTimer * 1000;
}
function toVote(g) {
  g.readyAt = 0;
  active(g).forEach((p) => { p.ready = false; });
  if (g.inDungeon && g.dungeonStep > g.settings.dungeonAreas) {
    L(g, "big", "The last seal breaks. There is no vote to take.");
    genArea(g, { type: "boss" });
    g.phase = "play";
    const b = g.enemies[0];
    L(g, "mons", b.greet);
    return;
  }
  g.phase = "vote";
  g.vote = { opts: genDestinations(g), votes: {}, deadline: now() + g.settings.voteTimer * 1000, revote: 0, only: null };
  L(g, "big", "Where should we go?");
}
function resolveVote(g) {
  const v = g.vote; if (!v) return;
  const counts = v.opts.map((_, i) => 0);
  Object.keys(v.votes).forEach((pid) => { const i = v.votes[pid]; if (counts[i] !== undefined) counts[i]++; });
  let best = -1, tied = [];
  counts.forEach((c, i) => { if (v.only && !v.only.includes(i)) return; if (c > best) { best = c; tied = [i]; } else if (c === best) tied.push(i); });
  if (tied.length > 1 && v.revote === 0 && best > 0) {
    v.revote = 1; v.votes = {}; v.only = tied; v.deadline = now() + 15000;
    L(g, "big", "Tied vote. Deciding between " + tied.map((i) => v.opts[i].name).join(" and ") + ".");
    return;
  }
  const r = rngFrom(hashStr(g.seed + ":tie:" + g.areaNo));
  const chosen = v.opts[tied.length ? tied[Math.floor(r() * tied.length)] : 0];
  g.vote = null; g.phase = "play"; g.readyAt = 0;
  travel(g, chosen);
}
function travel(g, opt) {
  if (opt.dungeon) {
    g.inDungeon = true; g.dungeonStep = 0; g.areasInBiome = 0; g.biomesDone++;
    L(g, "big", "The party descends into " + DUNGEON.name + ".");
    genArea(g, { type: "elite" });
    return;
  }
  if (opt.biome !== undefined) {
    g.biome = opt.biome; g.areasInBiome = 0; g.biomesDone++;
    L(g, "big", "The party crosses into " + BIOMES[g.biome].name + ".");
  }
  genArea(g, { type: opt.type === "dungeon" ? "elite" : opt.type, name: opt.newBiome || opt.biome !== undefined ? undefined : opt.name });
}
function grantExp(g, p, amount) {
  p.exp += amount;
  let guard = 0;
  while (p.exp >= expNeed(p.level) && guard++ < 30) {
    p.exp -= expNeed(p.level); p.level++; p.pts++;
    const d = derive(p);
    p.hp = Math.min(d.maxHp, p.hp + Math.round(d.maxHp * 0.35));
    if (p.cls === "mage") p.mana = Math.min(d.maxMana, p.mana + Math.round(d.maxMana * 0.35));
    L(g, "big", p.name + " reached Level " + p.level + "!", { who: p.id });
  }
}
function killEnemy(g, e, killer) {
  e.hp = 0;
  const party = active(g);
  const r = rngFrom(hashStr(g.seed + ":kill:" + e.uid));
  L(g, "good", e.name + " is defeated!");
  party.forEach((p) => { if (!p.dead) grantExp(g, p, Math.round(e.exp * (0.65 + 0.35 / Math.max(1, party.length)) * 1.4)); });
  const kg = Math.round(e.gold * 0.6), rest = Math.max(1, Math.round((e.gold * 0.4) / Math.max(1, party.length)));
  if (killer) { killer.gold += kg; killer.tot.gold += kg; killer.tot.kills++; }
  party.forEach((p) => { if (!killer || p.id !== killer.id) { p.gold += rest; p.tot.gold += rest; } });
  const d = killer ? derive(killer) : { loot: 0 };
  if (r() < 0.14 + (d.loot || 0) / 100 + (e.elite ? 0.5 : 0) + (e.boss ? 1 : 0)) {
    const who = killer || pick(r, party);
    if (who) {
      const id = rollItem(r, who.cls, tierOf(g), g.settings.loot - 1 + (e.elite ? 1 : 0));
      if (addItem(who, id)) { who.tot.items++; L(g, "loot", who.name + " picks up " + ITEMS[id].name + ".", { who: who.id }); }
      else L(g, "sys", who.name + "'s pack is full — " + ITEMS[id].name + " is left behind.");
    }
  }
  g.enemies = g.enemies.filter((x) => x.uid !== e.uid);
  if (e.boss) victory(g);
}
function victory(g) {
  g.phase = "victory"; g.endedAt = now();
  g.tally = {
    boss: g.boss, areas: g.areaNo, biomes: g.biomesDone, time: now() - (g.startedAt || now()),
    players: active(g).map((p) => ({ name: p.name, cls: p.cls, level: p.level, dmg: Math.round(p.tot.dmg), heal: Math.round(p.tot.heal), kills: p.tot.kills, gold: p.tot.gold, items: p.tot.items, deaths: p.tot.deaths })),
  };
  L(g, "big", "The vault goes quiet. You are still standing.");
}
function loseItems(g, p) {
  const s = g.settings; if (s.lossMode === "none") return;
  const lost = [];
  const take = (i) => { const id = takeSlot(p, i); if (id) lost.push(ITEMS[id].name); };
  const cons = p.inv.map((x, i) => [x, i]).filter(([x]) => ITEMS[x.id].kind === "use").map(([, i]) => i);
  if (s.lossMode === "cons" && cons.length) take(cons[Math.floor(Math.random() * cons.length)]);
  else {
    let n = s.lossMode === "one" ? 1 : s.lossMode === "two" ? 2 : Math.ceil(p.inv.length / 2);
    while (n-- > 0 && p.inv.length) take(Math.floor(Math.random() * p.inv.length));
  }
  if (s.loseEquipped && Math.random() < 0.3) {
    const keys = Object.keys(p.eq).filter((k) => p.eq[k]);
    if (keys.length) { const k = pick(Math.random, keys); lost.push(ITEMS[p.eq[k]].name); delete p.eq[k]; }
  }
  if (lost.length) L(g, "hurt", p.name + " lost: " + lost.join(", "), { who: p.id });
}
function playerDies(g, p) {
  p.dead = true; p.hp = 0; p.st = []; p.defUntil = 0; p.tot.deaths++;
  p.respawnAt = now() + g.settings.respawn * 1000;
  L(g, "hurt", p.name + " has fallen.", { who: p.id });
  loseItems(g, p);
  const al = alive(g);
  if (al.length === 0 && active(g).length > 0) {
    g.phase = "wipe"; g.wipeAt = now() + 5000; g.vote = null;
    L(g, "big", "THE ENTIRE PARTY HAS FALLEN.");
  }
}
function applyWipe(g) {
  const s = g.settings;
  active(g).forEach((p) => {
    const d = derive(p);
    p.dead = false; p.hp = Math.round(d.maxHp * 0.7); p.mana = d.maxMana; p.st = []; p.ready = false;
    p.respawnAt = 0; p.defUntil = 0;
  });
  g.phase = "play"; g.wipeAt = 0; g.readyAt = 0;
  if (s.wipeMode === "adventure") {
    g.biome = 0; g.biomesDone = 0; g.areasInBiome = 0; g.inDungeon = false; g.dungeonStep = 0; g.areaNo = 0;
    L(g, "big", "The adventure begins again at " + BIOMES[0].name + ".");
    genArea(g, { type: "combat" });
  } else if (s.wipeMode === "biome") {
    g.areasInBiome = 0; if (g.inDungeon) g.dungeonStep = 0;
    L(g, "big", "The party wakes at the edge of " + curBiome(g).name + ".");
    genArea(g, { type: rollType(rngFrom(hashStr(g.seed + ":wipe" + g.areaNo)), g) });
  } else {
    L(g, "big", "The party wakes where they fell. Try again.");
    const t = g.area ? g.area.type : "combat";
    g.areaNo--; if (g.areasInBiome > 0) g.areasInBiome--; if (g.inDungeon && g.dungeonStep > 0) g.dungeonStep--;
    genArea(g, { type: t === "boss" ? "boss" : t });
  }
}

/* ---- combat resolution ---- */
function dotVal(g, k) {
  const t = tierOf(g);
  return k === "burn" ? Math.round(7 + t * 2.4) : k === "poison" ? Math.round(5 + t * 1.7) : Math.round(3 + t * 1.2);
}
function applyWeaponFx(g, p, e, fx, dmgDone) {
  const r = Math.random;
  if (!fx) return;
  if (fx === "burn" && r() < 0.5) { addSt(e, "burn", 6, dotVal(g, "burn")); L(g, "hit", e.name + " catches fire."); }
  if (fx === "bleed" && r() < 0.4) { addSt(e, "bleed", 8, dotVal(g, "bleed")); }
  if (fx === "poison" && r() < 0.5) { addSt(e, "poison", 10, dotVal(g, "poison")); L(g, "hit", e.name + " is poisoned."); }
  if (fx === "freeze" && r() < 0.3 && !e.boss) { addSt(e, "freeze", 3, 0); L(g, "hit", e.name + " is frozen solid."); }
  if (fx === "slow" && r() < 0.45) addSt(e, "slow", 6, 0);
  if (fx === "stun" && r() < (e.boss ? 0.12 : 0.3)) { addSt(e, "stun", 2.2, 0); L(g, "hit", e.name + " is stunned."); }
  if (fx === "drain") { const h = Math.round(dmgDone * 0.45); const d = derive(p); p.hp = Math.min(d.maxHp, p.hp + h); p.tot.heal += h; }
}
function hitEnemy(g, p, e, mult, opts) {
  const d = derive(p); const o = opts || {};
  const fx = o.fx !== undefined ? o.fx : d.w ? d.w.fx : null;
  let crit = Math.random() < critChance(d) + (fx === "crit" ? 0.15 : 0);
  let raw = d.dmg * (mult || 1) * (0.9 + Math.random() * 0.2) * (crit ? 1.8 : 1);
  const dealt = enemyTakes(e, raw, fx === "pierce");
  e.hp -= dealt;
  p.tot.dmg += dealt;
  if (hasSt(e, "sleep")) e.st = e.st.filter((s) => s.k !== "sleep");
  L(g, "hit", p.name + (crit ? " lands a critical hit on " : " hits ") + e.name + " for " + dealt + (crit ? "!" : "."), { who: p.id, n: dealt, tgt: e.uid, crit: crit ? 1 : 0 });
  applyWeaponFx(g, p, e, fx, dealt);
  if (e.hp <= 0) killEnemy(g, e, p);
  return dealt;
}
function doAttack(g, p, tid) {
  const d = derive(p); const w = d.w;
  const fx = w ? w.fx : null;
  p.atkAt = now() + d.acd * 1000;
  if (p.cls === "mage" && w) p.mana = Math.max(0, p.mana - w.mana);
  if (fx === "heal" || fx === "ward") {
    const ally = g.players[tid] || p;
    if (fx === "heal") {
      const amt = Math.round((w.dmg + d.atk * 0.8) * (0.9 + Math.random() * 0.2));
      const ad = derive(ally);
      const before = ally.hp;
      ally.hp = Math.min(ad.maxHp, ally.hp + amt);
      const real = ally.hp - before;
      p.tot.heal += real;
      L(g, "good", p.name + " heals " + (ally.id === p.id ? "themselves" : ally.name) + " for " + real + ".", { who: ally.id, n: real, heal: 1 });
    } else {
      addSt(ally, "ward", 10, 0);
      L(g, "good", p.name + " wards " + (ally.id === p.id ? "themselves" : ally.name) + ".", { who: ally.id });
    }
    return;
  }
  if (fx === "aoe" || fx === "aoeburn") {
    const list = liveEnemies(g);
    L(g, "hit", p.name + " unleashes " + (w ? w.name : "an attack") + " across the field.", { who: p.id });
    list.forEach((e) => { if (e.hp > 0) hitEnemy(g, p, e, 0.7, { fx: fx === "aoeburn" ? "burn" : null }); });
    return;
  }
  const e = g.enemies.find((x) => x.uid === tid && x.hp > 0) || liveEnemies(g)[0];
  if (!e) return;
  if (fx === "sleep") {
    const chance = clamp(0.32 + d.cha * 0.02 - (e.boss ? 0.3 : 0), 0.03, 0.8);
    hitEnemy(g, p, e, 0.4, { fx: null });
    if (e.hp > 0 && Math.random() < chance) { addSt(e, "sleep", 6, 0); L(g, "talk", e.name + " sinks into a hypnotic sleep."); }
    else if (e.hp > 0) L(g, "sys", e.name + " shakes off the drowsiness.");
    return;
  }
  hitEnemy(g, p, e, 1, {});
}

/* ---- talking ---- */
function doTalk(g, p, e, opt) {
  const d = derive(p);
  p.talkAt = now() + 3000;
  e.tk = e.tk || {}; e.tk[opt] = (e.tk[opt] || 0) + 1; e.tries = (e.tries || 0) + 1;
  const aff = (AFF[e.pers] || AFF.curious)[opt] || 0;
  const hpPct = e.hp / e.maxHp;
  let ch = 30 + aff + d.cha * 2.4 - (e.tk[opt] - 1) * 13 - e.tries * 2 + (hpPct < 0.4 ? 14 : 0);
  if (e.boss) ch -= 45;
  ch = clamp(ch, 3, 92);
  const win = Math.random() * 100 < ch;
  const lines = LINES[e.pers] || LINES.curious;
  if (opt === "bribe") { p.gold -= 25; }
  if (win) {
    const gain = (25 + d.cha * 1.5) * (e.boss ? 0.15 : 1) * (opt === "mercy" ? 1.15 : 1);
    e.mercy = clamp((e.mercy || 0) + gain, 0, 100);
    L(g, "talk", p.name + " tries to " + opt + ". " + pick(Math.random, lines.good), { who: p.id });
    if (opt === "ask") {
      L(g, "talk", e.name + ": " + pick(Math.random, FACTS));
      grantExp(g, p, 12 + tierOf(g) * 4);
    }
    if (e.mercy >= 100 && !e.boss) return pacify(g, p, e);
    L(g, "sys", e.name + " is " + (e.mercy >= 70 ? "nearly won over" : e.mercy >= 40 ? "listening" : "less hostile") + ". (" + Math.round(e.mercy) + "%)");
  } else {
    e.mercy = Math.max(0, (e.mercy || 0) - 6);
    L(g, "talk", p.name + " tries to " + opt + ". " + pick(Math.random, lines.bad), { who: p.id });
    if (Math.random() < 0.28) { addSt(e, "rage", 8, 0); L(g, "hurt", e.name + " is enraged!"); }
    if (Math.random() < 0.35) { e.next = Math.min(e.next, now() + 600); }
  }
}
function pacify(g, p, e) {
  const party = active(g);
  L(g, "big", e.name + " stands down.");
  const r = rngFrom(hashStr(g.seed + ":pac:" + e.uid));
  const roll = r();
  if (roll < 0.34) L(g, "talk", e.name + " leaves the way it came, unhurried.");
  else if (roll < 0.68) {
    const gold = Math.round(e.gold * 0.8);
    party.forEach((x) => { x.gold += Math.round(gold / Math.max(1, party.length)); });
    L(g, "loot", e.name + " leaves something behind. The party splits " + gold + " gold.");
  } else {
    const id = rollItem(r, p.cls, tierOf(g), g.settings.loot);
    if (addItem(p, id)) { p.tot.items++; L(g, "loot", e.name + " presses " + ITEMS[id].name + " into " + p.name + "'s hands.", { who: p.id }); }
    else L(g, "sys", p.name + "'s pack is full.");
  }
  party.forEach((x) => { if (!x.dead) grantExp(g, x, Math.round(e.exp * 0.75)); });
  g.enemies = g.enemies.filter((x) => x.uid !== e.uid);
}

/* ---- events, shops, chests ---- */
function eventFx(g, p, fx) {
  const d = derive(p); const r = Math.random;
  if (fx === "rest") {
    const h = Math.round(d.maxHp * 0.45); p.hp = Math.min(d.maxHp, p.hp + h);
    if (p.cls === "mage") p.mana = d.maxMana;
    L(g, "good", p.name + " rests. +" + h + " HP" + (p.cls === "mage" ? ", mana restored" : "") + ".", { who: p.id, n: h, heal: 1 });
  } else if (fx === "bless") {
    if (p.gold >= 20) p.gold -= 20;
    addSt(p, "defUp", 90, 25); grantExp(g, p, 20 + tierOf(g) * 5);
    L(g, "good", p.name + " is steadied by something. Defence Up.", { who: p.id });
  } else if (fx === "steal") {
    const gold = 40 + Math.round(r() * 60 * (1 + tierOf(g) * 0.3));
    p.gold += gold; const hit = Math.round(d.maxHp * 0.15); p.hp = Math.max(1, p.hp - hit);
    L(g, "loot", p.name + " takes " + gold + " gold and immediately regrets it (-" + hit + " HP).", { who: p.id, n: hit });
  } else if (fx === "info") {
    L(g, "talk", pick(r, FACTS)); grantExp(g, p, 18 + tierOf(g) * 6);
  } else if (fx === "gamble") {
    if (r() < 0.5) { const gold = 80 + Math.round(r() * 120); p.gold += gold; L(g, "loot", p.name + " comes out the other side holding " + gold + " gold.", { who: p.id }); }
    else { const hit = Math.round(d.maxHp * 0.3); p.hp = Math.max(1, p.hp - hit); addSt(p, "confuse", 10, 0); L(g, "hurt", p.name + " comes out the other side wrong (-" + hit + " HP).", { who: p.id, n: hit }); }
  } else if (fx === "exp") {
    grantExp(g, p, 30 + tierOf(g) * 8); L(g, "good", p.name + " learns something from it.", { who: p.id });
  } else if (fx === "loot") {
    const id = rollItem(Math.random, p.cls, tierOf(g), g.settings.loot - 1);
    if (addItem(p, id)) { p.tot.items++; L(g, "loot", p.name + " finds " + ITEMS[id].name + ".", { who: p.id }); }
    else L(g, "sys", p.name + "'s pack is full — nothing taken.");
  } else if (fx === "gold") {
    const gold = 25 + Math.round(Math.random() * 40 * (1 + tierOf(g) * 0.25));
    p.gold += gold; p.tot.gold += gold; L(g, "loot", p.name + " pockets " + gold + " gold.", { who: p.id });
  } else L(g, "sys", p.name + " keeps walking.");
}
function chestOffers(g, p) {
  const a = g.area; if (!a || !a.chest) return null;
  if (!a.chest.offers[p.id]) {
    const r = rngFrom(hashStr(g.seed + ":chest:" + g.areaNo + ":" + p.id));
    const kinds = pickN(r, ["weapon", "armor", "acc", "use"], 3);
    a.chest.offers[p.id] = kinds.map((k) => rollItem(r, p.cls, tierOf(g), g.settings.loot - 1, k));
  }
  return a.chest.offers[p.id];
}
function doHaggle(g, p) {
  const s = g.area && g.area.shop; if (!s) return;
  const d = derive(p);
  s.hag[p.id] = 1;
  const ch = clamp(22 + d.cha * 4.5, 5, 88);
  if (Math.random() * 100 < ch) {
    const roll = Math.random();
    if (roll < 0.55) {
      const cut = 15 + Math.round(Math.random() * 25);
      s.disc[p.id] = cut;
      L(g, "loot", p.name + " haggles " + s.keeper + " down " + cut + "% — for themselves, at least.", { who: p.id });
    } else if (roll < 0.8) {
      const id = rollItem(Math.random, p.cls, tierOf(g), g.settings.loot + 1);
      s.items.push({ id, price: Math.round((ITEMS[id].price || 40) * 1.1), stock: 1 });
      L(g, "loot", s.keeper + " reaches under the counter: " + ITEMS[id].name + ", one only.", { who: p.id });
    } else {
      s.items.forEach((it) => { it.stock += 1; });
      L(g, "loot", s.keeper + " finds more stock in the back.", { who: p.id });
    }
  } else {
    s.disc[p.id] = -10;
    L(g, "sys", s.keeper + " does not appreciate " + p.name + "'s approach. Prices up 10% for them.", { who: p.id });
  }
}
const shopPrice = (s, it, pid) => Math.max(1, Math.round(it.price * (1 - (s.disc[pid] || 0) / 100)));

/* ---- action handling (server-authoritative validation) ---- */
function processAction(g, a) {
  const T = a.t;
  if (T === "JOIN") {
    if (g.players[a.p]) { g.players[a.p].conn = true; g.players[a.p].seen = now(); return; }
    if (g.order.length >= g.settings.maxPlayers) return;
    if (g.phase !== "lobby" && !g.settings.joinAfterStart) return;
    const p = newPlayer(a.p, a.d && a.d.name);
    g.players[a.p] = p; g.order.push(a.p);
    L(g, "sys", p.name + " joined the party.");
    if (g.phase !== "lobby") {
      const lv = Math.max(1, Math.round(active(g).reduce((s, x) => s + x.level, 0) / Math.max(1, active(g).length)));
      p.level = lv; p.pts = lv - 1;
    }
    return;
  }
  const p = g.players[a.p];
  if (!p) return;
  p.seen = now(); p.conn = true;
  const d = p.cls ? derive(p) : null;
  const t = now();
  switch (T) {
    case "HB": return;
    case "NAME": if (a.d.name) p.name = String(a.d.name).slice(0, 14); return;
    case "CLASS": {
      if (g.phase !== "lobby" && p.cls) return;
      if (!CLASSES[a.d.cls]) return;
      setClass(p, a.d.cls);
      L(g, "sys", p.name + " takes up the path of the " + CLASSES[a.d.cls].name + ".");
      return;
    }
    case "RSET": {
      if (p.id !== g.hostId || g.phase !== "lobby") return;
      Object.keys(a.d || {}).forEach((k) => { if (k in g.settings) g.settings[k] = a.d[k]; });
      g.settings.maxPlayers = clamp(g.settings.maxPlayers, 1, 15);
      g.settings.minPlayers = clamp(g.settings.minPlayers, 1, g.settings.maxPlayers);
      g.settings.biomes = clamp(g.settings.biomes, 1, 10);
      g.settings.minAreas = clamp(g.settings.minAreas, 1, 20);
      g.settings.maxAreas = clamp(g.settings.maxAreas, g.settings.minAreas, 30);
      return;
    }
    case "LOBBYREADY": if (g.phase === "lobby") p.ready = !p.ready; return;
    case "START": {
      if (p.id !== g.hostId || g.phase !== "lobby") return;
      const ready = active(g);
      if (ready.length < g.settings.minPlayers || ready.length === 0) return;
      g.phase = "play"; g.startedAt = now(); g.areaNo = 0; g.areasInBiome = 0;
      L(g, "big", "The party sets out into " + BIOMES[0].name + ".");
      genArea(g, { type: "combat" });
      return;
    }
    case "ATK": {
      if (g.phase !== "play" || !p.cls || p.dead) return;
      if (t < p.atkAt - 250) return;
      if (p.defUntil > t) return;
      if (hasSt(p, "freeze") || hasSt(p, "sleep") || hasSt(p, "stun")) return;
      const w = d.w;
      if (p.cls === "mage" && w && p.mana < w.mana) return;
      if (w && w.kind !== CLS_WEAPON[p.cls]) return;
      const healing = w && (w.fx === "heal" || w.fx === "ward");
      if (!healing && liveEnemies(g).length === 0) return;
      let tid = a.d && a.d.tid;
      if (healing) { if (!g.players[tid] || g.players[tid].dead) tid = p.id; }
      else if (!g.enemies.find((x) => x.uid === tid && x.hp > 0)) { const f = liveEnemies(g)[0]; if (!f) return; tid = f.uid; }
      if (hasSt(p, "confuse") && Math.random() < 0.3 && liveEnemies(g).length > 1) {
        tid = pick(Math.random, liveEnemies(g)).uid;
        L(g, "sys", p.name + " is confused and swings at the wrong target.");
      }
      doAttack(g, p, tid);
      return;
    }
    case "DEF": {
      if (g.phase !== "play" || !p.cls || p.dead) return;
      if (t < p.defAt - 250 || p.defUntil > t) return;
      if (hasSt(p, "freeze") || hasSt(p, "sleep") || hasSt(p, "stun")) return;
      p.defUntil = t + d.dur;
      p.defAt = t + d.dur + d.dcd * 1000;
      L(g, "sys", p.name + " raises a guard.", { who: p.id });
      return;
    }
    case "TALK": {
      if (g.phase !== "play" || !p.cls || p.dead || t < p.talkAt) return;
      const e = g.enemies.find((x) => x.uid === a.d.tid && x.hp > 0) || liveEnemies(g)[0];
      if (!e) return;
      if (!TALK_OPTS.find((o) => o.id === a.d.opt)) return;
      if (a.d.opt === "bribe" && p.gold < 25) return;
      doTalk(g, p, e, a.d.opt);
      return;
    }
    case "CHAT": {
      const m = String(a.d.m || "").slice(0, 140).trim();
      if (m) L(g, "chat", p.name + ": " + m, { who: p.id });
      return;
    }
    case "READY": {
      if (g.phase !== "play" || !p.cls) return;
      if (!g.area || !g.area.cleared) return;
      p.ready = !p.ready;
      if (p.ready) startReady(g);
      return;
    }
    case "VOTE": {
      if (g.phase !== "vote" || !g.vote || !p.cls) return;
      const i = a.d.i;
      if (i < 0 || i >= g.vote.opts.length) return;
      if (g.vote.only && !g.vote.only.includes(i)) return;
      g.vote.votes[p.id] = i;
      return;
    }
    case "LVL": {
      if (p.pts <= 0) return;
      const s = a.d.s;
      if (!["atk", "def", "spd", "cha"].includes(s)) return;
      p[s]++; p.pts--;
      const nd = derive(p);
      if (s === "def") p.hp = Math.min(nd.maxHp, p.hp + 4);
      L(g, "good", p.name + " trains " + ({ atk: "Attack", def: "Defence", spd: "Speed", cha: "Charisma" })[s] + ".", { who: p.id });
      return;
    }
    case "USE": {
      if (!p.cls || p.dead) return;
      const slot = p.inv[a.d.i]; if (!slot) return;
      const it = ITEMS[slot.id]; if (!it || it.kind !== "use") return;
      if (it.cls !== "any" && it.cls !== p.cls) return;
      const u = it.use || {};
      if (u.hp) { const h = Math.min(d.maxHp - p.hp, u.hp); p.hp += h; L(g, "good", p.name + " drinks " + it.name + ". +" + h + " HP.", { who: p.id, n: h, heal: 1 }); }
      if (u.mana) { p.mana = Math.min(d.maxMana, p.mana + u.mana); L(g, "good", p.name + " restores mana.", { who: p.id }); }
      if (u.cure) { p.st = (p.st || []).filter((s) => !STATUS[s.k] || !STATUS[s.k].bad); L(g, "good", p.name + " is cured.", { who: p.id }); }
      if (u.buff) { addSt(p, u.buff[0], u.buff[1] * 10, u.buff[2]); L(g, "good", p.name + " gains " + STATUS[u.buff[0]].name + ".", { who: p.id }); }
      takeSlot(p, a.d.i);
      return;
    }
    case "EQUIP": {
      if (!p.cls) return;
      const slot = p.inv[a.d.i]; if (!slot) return;
      const it = ITEMS[slot.id]; if (!it) return;
      let key = null;
      if (it.kind === CLS_WEAPON[p.cls]) key = "weapon";
      else if (it.kind === "armor" && it.cls === p.cls) key = "armor";
      else if (it.kind === "acc" && (it.cls === "any" || it.cls === p.cls)) key = "acc";
      else if (it.kind === "arrows" && p.cls === "archer") key = "arrows";
      if (!key) return;
      const old = p.eq[key];
      p.inv.splice(a.d.i, 1);
      p.eq[key] = slot.id;
      if (old) p.inv.push({ id: old, n: 1 });
      const nd = derive(p); p.hp = Math.min(p.hp, nd.maxHp); if (p.cls === "mage") p.mana = Math.min(p.mana, nd.maxMana);
      L(g, "sys", p.name + " equips " + it.name + ".", { who: p.id });
      return;
    }
    case "UNEQ": {
      const key = a.d.k; if (!p.eq[key]) return;
      if (!invSpace(p)) return;
      p.inv.push({ id: p.eq[key], n: 1 }); delete p.eq[key];
      const nd = derive(p); p.hp = Math.min(p.hp, nd.maxHp);
      return;
    }
    case "DROP": {
      const slot = p.inv[a.d.i]; if (!slot) return;
      L(g, "sys", p.name + " discards " + ITEMS[slot.id].name + ".", { who: p.id });
      takeSlot(p, a.d.i);
      return;
    }
    case "BUY": {
      const s = g.area && g.area.shop; if (!s) return;
      const it = s.items[a.d.i]; if (!it || it.stock <= 0) return;
      const price = shopPrice(s, it, p.id);
      if (p.gold < price) return;
      const def = ITEMS[it.id];
      if (def.cls !== "any" && def.cls !== p.cls) return;
      if (!addItem(p, it.id)) return;
      p.gold -= price; it.stock--;
      L(g, "loot", p.name + " buys " + def.name + " for " + price + " gold. (" + it.stock + " left)", { who: p.id });
      return;
    }
    case "SELL": {
      if (!(g.area && g.area.shop)) return;
      const slot = p.inv[a.d.i]; if (!slot) return;
      const val = Math.max(4, Math.round((ITEMS[slot.id].price || 20) * 0.4));
      p.gold += val; takeSlot(p, a.d.i);
      L(g, "loot", p.name + " sells " + ITEMS[slot.id].name + " for " + val + " gold.", { who: p.id });
      return;
    }
    case "HAGGLE": {
      const s = g.area && g.area.shop; if (!s || s.hag[p.id]) return;
      doHaggle(g, p);
      return;
    }
    case "CHEST": {
      const c = g.area && g.area.chest; if (!c || c.taken[p.id]) return;
      const offers = chestOffers(g, p); if (!offers) return;
      const id = offers[a.d.i]; if (!id) return;
      if (!addItem(p, id)) return;
      c.taken[p.id] = id; p.tot.items++;
      L(g, "loot", p.name + " takes " + ITEMS[id].name + " from the chest.", { who: p.id });
      return;
    }
    case "EVENT": {
      const e = g.area && g.area.event; if (!e || e.done[p.id]) return;
      const o = e.o[a.d.i]; if (!o) return;
      e.done[p.id] = 1;
      L(g, "talk", p.name + ": " + o.l, { who: p.id });
      eventFx(g, p, o.fx);
      return;
    }
    case "RESTART": {
      if (p.id !== g.hostId) return;
      if (g.phase !== "victory" && g.phase !== "defeat") return;
      const s = g.settings, keep = g.players, ord = g.order, code = g.code, host = g.hostId;
      const ng = newGame(code, host, (Math.random() * 1e9) | 0);
      ng.settings = s; ng.players = keep; ng.order = ord;
      Object.keys(keep).forEach((id) => {
        const q = keep[id];
        if (q.cls) { setClass(q, q.cls); q.level = 1; q.exp = 0; q.pts = 0; q.gold = 60; q.tot = { dmg: 0, heal: 0, kills: 0, gold: 0, items: 0, deaths: 0 }; q.dead = false; q.ready = false; }
      });
      Object.assign(g, ng);
      L(g, "big", "A new adventure begins.");
      return;
    }
    case "LEAVE": {
      p.conn = false; p.seen = 0;
      return;
    }
    default: return;
  }
}

/* ---- enemy AI + world tick ---- */
function enemyAct(g, e, t) {
  const targets = alive(g);
  if (!targets.length) return;
  const weighted = [];
  targets.forEach((p) => { const n = p.defUntil > t ? 1 : 3; for (let i = 0; i < n; i++) weighted.push(p); });
  const p = pick(Math.random, weighted);
  const mul = hasSt(e, "rage") ? 1.4 : 1;
  const abil = e.abil || [];
  const useAb = abil.length && Math.random() < 0.3;
  const ab = useAb ? pick(Math.random, abil) : null;
  const base = e.dmg * mul * (0.85 + Math.random() * 0.3);
  if (ab === "heal") {
    const hurt = liveEnemies(g).filter((x) => x.hp < x.maxHp);
    const tgt = hurt.length ? pick(Math.random, hurt) : e;
    e.heals = (e.heals || 0) + 1;
    const amt = Math.round((e.maxHp * 0.11) / (1 + (e.heals - 1) * 0.7));
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
    L(g, "mons", e.name + (e.heals > 3 ? " mends " : " mends ") + (tgt === e ? "itself" : tgt.name) + " for " + amt + ".");
  } else if (ab === "shield" && !hasSt(e, "shield") && now() >= (e.shieldAt || 0)) {
    e.shieldAt = now() + 16000;
    addSt(e, "shield", 6, 0); L(g, "mons", e.name + " hardens its guard.");
  } else if (ab === "rage") {
    addSt(e, "rage", 9, 0); L(g, "mons", e.name + " works itself into a fury!");
  } else if (ab === "summon" && liveEnemies(g).length < 6) {
    const bi = curBiome(g);
    const nm = mkEnemy(g, pick(Math.random, monPool(g).mons), Math.random, {});
    nm.hp = Math.round(nm.hp * 0.6); nm.maxHp = nm.hp;
    g.enemies.push(nm);
    L(g, "mons", e.name + " calls " + nm.name + " out of the dark!");
  } else if (ab === "aoe") {
    L(g, "mons", e.name + " strikes the whole party!");
    targets.forEach((q) => {
      const dealt = playerTakes(q, base * 0.62, {});
      q.hp -= dealt;
      L(g, "hurt", q.name + " takes " + dealt + ".", { who: q.id, n: dealt });
      if (q.hp <= 0) playerDies(g, q);
    });
  } else {
    const dealt = playerTakes(p, base, { pierce: false });
    p.hp -= dealt;
    p.tot.taken = (p.tot.taken || 0) + dealt;
    L(g, "hurt", e.name + " hits " + p.name + " for " + dealt + (p.defUntil > t ? " (guarded)" : "") + ".", { who: p.id, n: dealt });
    if (ab === "poison") { addSt(p, "poison", 9, dotVal(g, "poison")); L(g, "hurt", p.name + " is poisoned."); }
    if (ab === "burn") { addSt(p, "burn", 6, dotVal(g, "burn")); L(g, "hurt", p.name + " is burning."); }
    if (ab === "bleed") addSt(p, "bleed", 8, dotVal(g, "bleed"));
    if (ab === "stun" && Math.random() < 0.5) { addSt(p, "stun", 2, 0); L(g, "hurt", p.name + " is stunned."); }
    if (ab === "slow") addSt(p, "slow", 7, 0);
    if (ab === "confuse") addSt(p, "confuse", 8, 0);
    if (ab === "sleep" && Math.random() < 0.4) addSt(p, "sleep", 5, 0);
    if (ab === "drain") { const h = Math.round(dealt * 0.6); e.hp = Math.min(e.maxHp, e.hp + h); L(g, "mons", e.name + " drinks the wound."); }
    if (p.hp <= 0) playerDies(g, p);
  }
  let cd = e.cd * 1000 * (hasSt(e, "slow") ? 1.7 : 1) * (0.85 + Math.random() * 0.3);
  e.next = t + cd;
}
function tickUnitStatus(g, u, isPlayer) {
  const t = now();
  if (!u.st || !u.st.length) return;
  u.st = u.st.filter((s) => s.until > t);
  u.st.forEach((s) => {
    if (t < s.next) return;
    s.next = t + 1800;
    if (s.k === "poison" || s.k === "burn" || s.k === "bleed") {
      const v = Math.max(1, s.v || 4);
      u.hp -= v;
      if (isPlayer) { L(g, "hurt", u.name + " suffers " + v + " from " + STATUS[s.k].name.toLowerCase() + ".", { who: u.id, n: v }); if (u.hp <= 0) playerDies(g, u); }
      else if (u.hp <= 0) killEnemy(g, u, null);
    } else if (s.k === "regen" && isPlayer) {
      const d = derive(u); const h = Math.min(d.maxHp - u.hp, Math.round(d.maxHp * 0.04));
      if (h > 0) { u.hp += h; }
    }
  });
}
function tick(g) {
  const t = now();
  const dt = Math.min(4000, t - (g.lt || t));
  g.lt = t; g.t = t;
  g.order.forEach((id) => {
    const p = g.players[id]; if (!p) return;
    p.conn = t - (p.seen || 0) < 16000;
    if (!p.cls) return;
    if (p.dead) {
      if (g.phase !== "wipe" && t >= p.respawnAt) {
        const d = derive(p);
        p.dead = false; p.hp = Math.round(d.maxHp * 0.6); p.st = []; p.respawnAt = 0;
        p.atkAt = t + 800; p.defAt = t + 800;
        L(g, "good", p.name + " returns to the party.", { who: p.id });
      }
      return;
    }
    tickUnitStatus(g, p, true);
    if (p.defUntil && p.defUntil <= t) p.defUntil = 0;
    if (p.cls === "mage") {
      const d = derive(p);
      p.mana = Math.min(d.maxMana, p.mana + (dt / 1000) * (2 + p.level * 0.15));
    }
  });
  if (g.phase === "play") {
    liveEnemies(g).forEach((e) => tickUnitStatus(g, e, false));
    if (g.enemies.length && g.enemies[0].boss) {
      const b = g.enemies[0];
      const def = BOSSES.find((x) => x.id === b.id);
      if (def && b.hp > 0) {
        const pct = b.hp / b.maxHp;
        let ph = 0;
        def.phases.forEach((x, i) => { if (pct <= x.at) ph = i; });
        if (ph > (b.ph || 0)) {
          b.ph = ph; b.abil = def.phases[ph].abil.slice();
          b.cd = Math.max(1.3, def.cd - ph * 0.35);
          L(g, "big", "— " + def.phases[ph].name + " —");
          L(g, "mons", def.phases[ph].line);
        }
      }
    }
    const alv = alive(g);
    if (alv.length) {
      liveEnemies(g).forEach((e) => {
        if (hasSt(e, "freeze") || hasSt(e, "sleep") || hasSt(e, "stun")) { e.next = Math.max(e.next, t + 700); return; }
        if (t >= e.next) enemyAct(g, e, t);
      });
    }
    if (g.area && !g.area.cleared && liveEnemies(g).length === 0) {
      g.area.cleared = true;
      L(g, "big", "The way is clear.");
      startReady(g);
    }
    if (g.area && g.area.cleared) {
      const act = active(g).filter((p) => p.conn);
      const allReady = act.length > 0 && act.every((p) => p.ready || p.dead);
      if (allReady || (g.readyAt && t >= g.readyAt)) toVote(g);
    }
  } else if (g.phase === "vote") {
    const v = g.vote;
    if (v) {
      const act = active(g).filter((p) => p.conn && !p.dead);
      const allVoted = act.length > 0 && act.every((p) => v.votes[p.id] !== undefined);
      if (allVoted || t >= v.deadline) resolveVote(g);
    }
  } else if (g.phase === "wipe") {
    if (t >= g.wipeAt) applyWipe(g);
  }
}

export {
  clamp, now, uid, cap, CODE_CHARS, makeCode, rngFrom, hashStr, pick, pickN, ri, fmtT, RAR, ITEMS, defItems, WK, AK, CK, UK, CLS_WEAPON, CLASSES, POOLS, STATUS, MONS, M, BIOMES, DUNGEON, BOSSES, TALK_OPTS, AFF, LINES, FACTS, DEFAULTS, DIFF_LABEL, FREQ_LABEL, LOSS_LABEL, WIPE_LABEL, expNeed, poolFor, rarityRoll, rollItem, statusBonus, derive, critChance, playerTakes, enemyTakes, hasSt, addSt, invSpace, addItem, takeSlot, itemPower, newGame, newPlayer, setClass, L, alive, active, liveEnemies, curBiome, tierOf, monPool, mkEnemy, mkBoss, ADJ, NOUN, areaName, SHOPKEEPERS, EVENTS, NPCS, genArea, areaWeights, rollType, DANGER, REWARD, genDestinations, startReady, toVote, resolveVote, travel, grantExp, killEnemy, victory, loseItems, playerDies, applyWipe, dotVal, applyWeaponFx, hitEnemy, doAttack, doTalk, pacify, eventFx, chestOffers, doHaggle, shopPrice, processAction, enemyAct, tickUnitStatus, tick,
};
