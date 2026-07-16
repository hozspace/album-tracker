# album-tracker

Self-hosted album diary + recommendations.

## Dev

```sh
npm install
npm run dev
```

Client on http://localhost:5173, API on http://localhost:4180.

## Deploy (Docker)

Copy `.env.example` to `.env` and fill in real values first.

```sh
docker compose up -d --build
```

Serves everything on http://localhost:4180. All state — the SQLite database
and cached cover art — lives in `./data` on the host, bind-mounted into the
container at `/data`. Nothing else is persistent.

**Updating** after a code change:

```sh
git pull
docker compose up -d --build
```

**Accessing over Tailscale**: with the host on your tailnet, open
`http://<mac-name>:4180` from any other tailnet device (phone, laptop) — no
port forwarding or extra config needed. `<mac-name>` is whatever the Mac
shows as in the Tailscale admin console/app.

**OrbStack**: set OrbStack to start on login (OrbStack → Settings → General)
so the container comes back up automatically after a reboot — `restart:
unless-stopped` in `docker-compose.yml` then takes it from there.

**Moving to a Raspberry Pi**: the only state that matters is the repo, `.env`,
and the `data/` folder — copy those three across and you're done. The
Dockerfile has no Mac-specific assumptions (multi-stage build, prebuilt
native modules resolved per-platform at build time), so `docker compose up -d
--build` run directly on the Pi builds a correct arm64 image there; no
cross-compilation step needed.
