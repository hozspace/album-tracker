# ---- Build stage: compile client + server workspaces ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY client/package.json client/
COPY server/package.json server/
# Deliberately `npm install` (no lockfile) rather than `npm ci` here: this
# repo's lockfile was generated on macOS, and `npm ci` against it
# unreliably resolves (or entirely skips) the linux/musl-arm64 optional
# native bindings that rolldown/oxlint need to build the client
# (npm/cli#4828 — "Cannot find native binding"). A fresh `npm install`
# inside this build-only layer picks the right binaries for whatever
# platform is building the image; it never touches the committed
# package-lock.json used for host/dev installs.
RUN npm install
COPY . .
RUN npm run build

# ---- Runtime stage: server + built client only ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# Alpine ships no IANA zoneinfo database, so a bare TZ env var is silently
# ignored (date/cron still run in UTC). tzdata provides it; the 08:00 email
# cron (server/src/lib/emailScheduler.ts) needs this to fire at UK time.
RUN apk add --no-cache tzdata
ENV TZ=Europe/London
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
# better-sqlite3 is a native module. `npm ci` here (not copied from the
# build stage) fetches a prebuilt binding for the runtime image's own
# platform via prebuild-install; no compiler toolchain is needed as long as
# a prebuild exists for the target arch/libc (verified for linux-musl
# x64/arm64), so none is installed in this image.
RUN npm ci --omit=dev -w server && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/migrations server/migrations
COPY --from=build /app/client/dist client/dist
ENV PORT=4180
ENV DATA_DIR=/data
ENV STATIC_DIR=/app/client/dist
EXPOSE 4180
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4180)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/index.js"]
