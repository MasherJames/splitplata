# Splitplata

Offline-first, no-auth expense splitting. One shared domain core powers a React
web app and an Expo (React Native) mobile app.

## Layout

```
splitplata/
├─ packages/
│  └─ core/        @splitplata/core — framework-free domain logic
│                  (model, balances, debt simplification, money, share codec)
├─ apps/
│  ├─ web/         @splitplata/web    — Vite + React
│  └─ mobile/      @splitplata/mobile — Expo + expo-router
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

The apps hold **only UI**. All business logic — splitting an expense, computing
net balances, simplifying who-owes-who to the fewest transfers, and the
URL-shareable state codec — lives in `@splitplata/core` and is unit-tested there.

### Money

Every amount is an **integer in the currency's minor unit** (cents). Arithmetic
stays exact; format to decimals only at the UI edge with `formatMoney`.

### Sync without a backend

`encodeGroup(group)` produces a versioned, URL-safe token that round-trips
through `decodeGroup`. Drop it in a share link — no server, no accounts.

## Getting started

Requires Node ≥ 20 and pnpm.

```bash
pnpm install        # install all workspaces (hoisted layout — see .npmrc)
pnpm build:core     # compile @splitplata/core to dist/ (apps consume the build)
pnpm test           # run the core unit tests
```

> The apps import the **compiled** core (`packages/core/dist`). When changing
> core, run `pnpm dev:core` (tsc --watch) alongside an app's dev server.

### Web

```bash
pnpm dev:core       # in one terminal: watch-compile core
pnpm dev:web        # in another: Vite dev server → http://localhost:5173
```

### Mobile

```bash
pnpm dev:core       # watch-compile core
pnpm dev:mobile     # expo start — scan the QR with Expo Go, or press i / a
```

## Scripts (root)

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `pnpm build:core`  | Compile the shared core package               |
| `pnpm dev:core`    | Watch-compile the shared core                 |
| `pnpm dev:web`     | Run the web app (Vite)                        |
| `pnpm dev:mobile`  | Run the mobile app (Expo)                     |
| `pnpm test`        | Run core unit tests (Vitest)                  |
| `pnpm typecheck`   | Typecheck every workspace                     |
