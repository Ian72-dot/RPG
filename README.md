# Embervow

A real-time cooperative fantasy RPG for **1–15 players**, played in a browser. Mobile-first, no accounts, no installs — one player hosts a game, shares a five-character code, and everyone else types it in.

All content is original: 50 monsters across 10 biomes, 4 multi-phase final bosses, ~70 items, procedurally drawn scenery and creatures, and synthesised audio. No external art or sound assets, no third-party IP.

---

## Quick start (run it on your own machine)

You need **Node.js 18 or newer** ([nodejs.org](https://nodejs.org)).

```bash
npm install      # installs deps and builds the client
npm start        # serves on http://localhost:8080
```

Open `http://localhost:8080`. To let friends on your home Wi-Fi join, give them your machine's LAN address instead — something like `http://192.168.1.24:8080`. For anyone outside your network, deploy it somewhere public using one of the recipes below.

**Useful commands**

| Command | What it does |
| --- | --- |
| `npm run build` | Rebuilds `public/bundle.js` from the client source |
| `npm start` | Builds the client, then runs the server (respects the `PORT` env var) |
| `npm run dev` | Build, then run |

---

## Deploying it publicly

The whole thing is one Node process that serves the static client *and* holds the WebSocket connections. That means **your host must support WebSockets and long-running processes.** Anything that only serves static files or short-lived serverless functions (plain GitHub Pages, Netlify, Vercel's default functions, S3) will load the page but never connect a game.

### Render — the least fiddly free option

1. Push this folder to a GitHub repository.
2. On [render.com](https://render.com): **New → Web Service**, connect the repo.
3. Settings: Environment `Node`, Build Command `npm install && npm run build`, Start Command `npm start`.
4. Deploy. You get a URL like `https://embervow.onrender.com`.

WebSockets work on Render's free tier. The free tier does sleep after inactivity, so the first visitor waits ~30 seconds for a cold start, and a sleeping server forgets any games in progress.

### Railway

1. Push to GitHub.
2. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo**.
3. Railway detects Node and runs `npm install` then `npm start` on its own — `npm start` builds the client before booting, so no extra configuration is needed. Under **Settings → Networking**, click *Generate Domain*.

### Fly.io

```bash
fly launch --no-deploy      # accept the detected Dockerfile
fly deploy
```

The included `Dockerfile` builds and runs everything. Fly's proxy handles WebSockets without extra configuration.

### Any VPS (DigitalOcean, Hetzner, Linode, a Raspberry Pi)

```bash
git clone <your repo> && cd embervow
npm install
sudo npm install -g pm2
pm2 start server/server.js --name embervow
pm2 save && pm2 startup     # survives reboots
```

Then put a reverse proxy in front for HTTPS. Caddy is the shortest path — a two-line `Caddyfile` and it handles certificates automatically:

```
embervow.example.com {
    reverse_proxy localhost:8080
}
```

If you prefer nginx, remember the WebSocket upgrade headers or `/ws` will fail:

```nginx
server {
    server_name embervow.example.com;
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
```

### Docker anywhere

```bash
docker build -t embervow .
docker run -p 8080:8080 embervow
```

---

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8080` | Port to listen on. Most hosts set this for you. |
| `MAX_ROOMS` | `400` | Concurrent games before new ones are refused. |

`GET /healthz` returns `{"ok":true,"rooms":N,"players":N}` — useful for uptime checks.

---

## How it fits together

```
shared/engine.js    the entire game: items, monsters, combat, actions, world tick
server/server.js    authority — owns every game object, validates every action
client/App.jsx      React UI, art, audio; renders whatever the server reports
```

`shared/engine.js` is imported **unmodified** by both the server and the browser bundle, so there is exactly one rule set.

The server is the only thing that decides anything. Clients send intents (`ATK`, `VOTE`, `BUY`) and the server runs them through `processAction`, which re-checks every precondition: whether your cooldown has elapsed, whether you can afford the item, whether you're the host, whether you're even alive. It steps the world 10 times a second and broadcasts state 5 times a second. A modified client can send whatever it likes and gain nothing — the worst it can do is send actions the server ignores.

Cooldowns travel as absolute timestamps, and each client measures its clock offset against the server, so the cooldown rings animate smoothly at full frame rate between updates rather than stepping at the network rate.

Players are identified by a random ID kept in `localStorage`. Close the tab mid-fight and reopen the page and you rejoin the same character. Drop off Wi-Fi and the party sees you greyed out as offline; your character stays in the world and the server holds the room for 15 minutes after the last person leaves.

---

## Playing

The host creates a game, adjusts settings, and shares the code. Everyone picks Swordfighter, Archer, or Mage, then the host starts.

Combat is **real-time — there are no turns.** FIGHT and DEFEND each run their own cooldown: your weapon sets the attack cooldown, your armour sets the defend cooldown, and Speed shortens both without ever reaching zero. You cannot attack while your guard is up, so the fight is a rhythm of committing and covering.

TALK is a genuine alternative to killing things. Every monster has a personality and reacts differently to compliments, jokes, questions, threats, and offers of mercy; fill the meter and it stands down, which pays experience without a fight. Charisma drives that, and haggling in shops.

Clear the area, press READY, and the party votes between three destinations. When it's time to move to a new biome, that biome simply appears as one of the three choices — it is never a separate vote. After the last biome comes the sealed dungeon and a final boss chosen at random from four, never voted on.

The host controls how long the adventure is, how punishing it is, respawn timing, what you drop when you die, and what happens if the whole party falls.

---

## Tuning it yourself

Everything is data at the top of `shared/engine.js`: `ITEMS`, `MONS`, `BIOMES`, `BOSSES`, `CLASSES`, `DEFAULTS`. Add a monster by copying one `M(...)` line and adding its id to a biome's `mons` array. Run `npm run build` afterwards so the browser bundle picks up the change — the server reads the source directly and only needs a restart.
