# Homepage Vue — Architecture Document

Rewrite of [gethomepage/homepage](https://github.com/gethomepage/homepage) in Nuxt 3 / Vue 3.
Scope decisions finalized 2026-05-19.

---

## Goals

- Single dark theme, no theming system
- English only, no i18n
- Visual edit mode that works well on desktop and mobile
- Reliable drag-and-drop reordering
- Runtime-extensible widget system — no rebuild to add new widgets
- YAML config files with simple `${VAR}` env substitution
- Clean Nuxt 3 codebase, no legacy Next.js/React surface

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Nuxt 3 (latest) | SSR, file-based API routes, replaces Next.js |
| UI | Vue 3 Composition API | Ships with Nuxt 3 |
| Styling | Tailwind CSS v4 | Single hardcoded dark theme, no runtime switching |
| Drag & drop | `vue-draggable-plus` | Wraps SortableJS — native DOM, no virtual DOM conflicts |
| YAML | `js-yaml` | Server-side config parsing |
| HTTP | `ofetch` | Built into Nuxt/Nitro, used for service proxy |
| Node | 26 Current | Docker runtime (becomes LTS Oct 2026) |

---

## Project Structure

```
homepage-vue/
├── server/
│   ├── api/
│   │   ├── proxy.get.ts               # Credential-stripping service proxy
│   │   ├── widget/[type].get.ts       # Generic widget data fetcher
│   │   ├── docker/
│   │   │   ├── status.get.ts
│   │   │   └── stats.get.ts
│   │   ├── kubernetes/
│   │   │   ├── status.get.ts
│   │   │   └── stats.get.ts
│   │   ├── proxmox/[...node].get.ts
│   │   ├── search/suggest.get.ts
│   │   ├── monitor/ping.get.ts
│   │   ├── healthcheck.get.ts
│   │   └── edit/
│   │       ├── services.ts            # CRUD: add/update/delete/reorder/move
│   │       ├── bookmarks.ts           # CRUD: add/update/delete/reorder
│   │       └── widget-test.post.ts    # Live connectivity test for a widget config
│   ├── utils/
│   │   ├── config.ts                  # YAML loader + ${VAR} substitution engine
│   │   ├── auth.ts                    # 30+ auth pattern handlers (Basic, Bearer, header, etc.)
│   │   └── widget-registry.ts        # Loads + merges widget definitions at runtime
│   └── middleware/
│       └── allowlist.ts               # ALLOWED_HOSTS enforcement
├── components/
│   ├── layout/
│   │   ├── TabBar.vue
│   │   ├── ServiceGroup.vue           # Sortable group shell + header
│   │   └── BookmarkGroup.vue
│   ├── widget/
│   │   └── GenericWidget.vue          # The single widget render component
│   ├── edit/
│   │   ├── EditToggle.vue             # Edit / Save / Rollback controls
│   │   ├── ServiceModal.vue           # Add/edit service form + widget test button
│   │   ├── BookmarkModal.vue
│   │   └── IconPicker.vue
│   └── search/
│       └── SearchBar.vue
├── pages/
│   └── index.vue                      # Dashboard root, drag-and-drop orchestration
├── widget-registry/                   # Ships with the app — YAML widget definitions
│   ├── sonarr.yaml
│   ├── radarr.yaml
│   ├── jellyfin.yaml
│   └── ...                            # One file per widget type (~162 total)
├── scripts/
│   └── sync-widgets.ts                # Pulls new widget defs from gethomepage upstream
├── Dockerfile
├── docker-compose.example.yml
└── config/                            # NOT committed — mounted as Docker volume at runtime
    ├── settings.yaml
    ├── services.yaml
    ├── bookmarks.yaml
    ├── widgets.yaml
    ├── docker.yaml
    ├── kubernetes.yaml
    ├── proxmox.yaml
    ├── .env                           # Optional — loaded before environment vars
    └── custom-widgets/                # User-defined widget definitions (YAML)
        └── my-widget.yaml
```

---

## Widget System

### How It Works

Every widget is a YAML definition file. The app ships with ~162 definitions in `widget-registry/`.
At startup, `widget-registry.ts` loads all definitions from:

1. `widget-registry/` (bundled)
2. `/config/custom-widgets/` (user-defined, takes precedence over bundled)

No rebuild is needed to add or override a widget — drop a YAML file and restart the container.

### Widget Definition Format

```yaml
# widget-registry/sonarr.yaml
name: Sonarr
auth:
  type: header       # header | basic | bearer | query | none
  header: X-Api-Key
  field: apiKey      # maps to the service config field name
endpoints:
  wanted:
    path: /api/v3/wanted/missing
    method: GET
  queue:
    path: /api/v3/queue
    method: GET
display:
  - label: Wanted
    value: "$.wanted.totalRecords"
  - label: Queue
    value: "$.queue.totalRecords"
```

`display[].value` uses JSONPath expressions against the merged response object.
Keys in `endpoints` become top-level keys in the response object before JSONPath resolution.

### GenericWidget.vue

The single Vue component for all widgets. It:

1. Reads the widget definition for its `type` from the registry
2. Calls `GET /api/widget/[type]?url=...` — server fetches all endpoints and merges responses
3. Renders each `display` entry as a label/value stat
4. Standard card shell: icon + service name + stat rows

No per-widget Vue components. New widgets need only a YAML definition.

### Syncing New Widgets from Upstream

```
pnpm run sync-widgets
```

`scripts/sync-widgets.ts` fetches widget JS files from the gethomepage GitHub repo,
extracts endpoint and auth info, and writes/updates YAML files in `widget-registry/`.
Run manually or in CI. No app rebuild required after the YAML files are updated —
restart the container and the new definitions are live.

---

## Configuration System

### Files (Docker volume at `/config`)

| File | Purpose |
|---|---|
| `settings.yaml` | Global: title, layout, search provider, columns |
| `services.yaml` | Service groups, items, widget assignments |
| `bookmarks.yaml` | Bookmark groups and links |
| `widgets.yaml` | Standalone top-of-page widgets |
| `docker.yaml` | Docker host connections |
| `kubernetes.yaml` | Kubernetes cluster connections |
| `proxmox.yaml` | Proxmox node credentials |
| `.env` | Optional env file (loaded first, overridden by process env) |
| `custom-widgets/` | User widget definitions (YAML, runtime-loaded) |

### Env Var Substitution

Any YAML value can reference an environment variable:

```yaml
services:
  - name: Sonarr
    url: ${SONARR_URL}
    apiKey: ${SONARR_KEY}
```

Resolution order (first match wins):
1. Process environment (Docker `-e` flags)
2. `/config/.env` file

No prefix required — bare `${VAR_NAME}` anywhere in any YAML value.

### Removed Config

- `custom.css` / `custom.js` — no custom injection
- Theme/language fields in `settings.yaml` — ignored if present (single dark theme, English only)
- `{{HOMEPAGE_VAR_*}}` / `{{HOMEPAGE_FILE_*}}` syntax — replaced by `${VAR}`

---

## Edit Mode

### UX Model

- **Edit button** — fixed position, always visible. Clicking enters edit mode.
- **In edit mode** — drag handles appear on all items and groups; pencil + trash icons appear on hover.
- **Explicit save** — "Save" and "Rollback" buttons replace the Edit button while in edit mode.
- **Save** — writes all pending changes to YAML files on disk atomically.
- **Rollback** — discards all in-memory changes and reverts to the last saved state (re-reads YAML from disk).
- **Mobile** — long-press on an item to begin drag; tap pencil icon to open edit modal.

### Drag & Drop

Uses `vue-draggable-plus` (SortableJS wrapper). Handles:

- Services within a group
- Service groups (reorder groups)
- Bookmarks within a group
- Bookmark groups

All drag state is held in a local copy of the config. Nothing is written to disk until Save is pressed.

### Edit Capabilities

- Add / Edit / Delete services
- Add / Edit / Delete service groups
- Add / Edit / Delete bookmarks
- Add / Edit / Delete bookmark groups
- Reorder everything via drag & drop
- Widget test button in service modal (live connectivity check via the same proxy infrastructure)
- Icon picker with search

---

## API Routes (Nuxt server/api/)

| Route | Method | Purpose |
|---|---|---|
| `/api/proxy` | GET | Forward request to service, inject auth, strip credentials from response |
| `/api/widget/[type]` | GET | Fetch all widget endpoints, merge, return sanitized data |
| `/api/docker/status` | GET | Container status for all configured Docker hosts |
| `/api/docker/stats` | GET | Container CPU/memory stats |
| `/api/kubernetes/status` | GET | Pod/deployment status |
| `/api/kubernetes/stats` | GET | Node resource usage |
| `/api/proxmox/[...node]` | GET | VM/LXC status and resource usage |
| `/api/search/suggest` | GET | Autocomplete from configured search provider |
| `/api/monitor/ping` | GET | HTTP check for configured services |
| `/api/healthcheck` | GET | App liveness probe (used by Docker) |
| `/api/edit/services` | GET/POST | CRUD + reorder for services and groups |
| `/api/edit/bookmarks` | GET/POST | CRUD + reorder for bookmarks and groups |
| `/api/edit/widget-test` | POST | Test widget connectivity using proxy auth logic |

---

## Security

- **Host allowlist** — `server/middleware/allowlist.ts` checks `Host` header against `ALLOWED_HOSTS` env var (comma-separated or `*`).
- **Credential stripping** — API keys and auth headers are injected server-side and never returned to the client.
- **Auth patterns** — `server/utils/auth.ts` handles: Basic, Bearer, API key header, query param, Proxmox ticket, and cloud provider patterns.
- **No built-in login** — dashboard assumes private network or reverse proxy auth (e.g. Authelia, Authentik).

---

## Docker / Deployment

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `CONFIG_DIR` | `/config` | Path to YAML config directory |
| `PORT` | `3000` | HTTP port |
| `HOSTNAME` | `::` | Bind address (IPv6, falls back to 0.0.0.0) |
| `PUID` | `1000` | File ownership UID for config directory |
| `PGID` | `1000` | File ownership GID for config directory |
| `ALLOWED_HOSTS` | `*` | Comma-separated allowed hostnames |

### Dockerfile (multi-stage)

```
Stage 1 — builder:  node:26-slim, install pnpm, build Nuxt app
Stage 2 — runtime:  node:26-alpine, copy .output/, run node .output/server/index.mjs
```

Health check hits `GET /api/healthcheck` every 10s.

### Dev Server

```bash
CONFIG_DIR=/mnt/roger/appdata/homepage PORT=3456 pnpm run dev
```

### Production Build + Docker Push

```bash
pnpm run build
docker build -t nsignori/homepage-vue:latest .
docker push nsignori/homepage-vue:latest
```

### NAS Deploy

```bash
docker compose pull && docker compose up -d
```

---

## What Was Cut

| Feature | Reason |
|---|---|
| Light mode + 30 color themes | Single dark theme only |
| Theme switching logic | Removed entirely |
| `custom.css` / `custom.js` injection | Removed |
| i18n (46 languages, next-i18next) | English only, hardcoded |
| `{{HOMEPAGE_VAR_*}}` / `{{HOMEPAGE_FILE_*}}` syntax | Replaced by `${VAR}` |
| ISR revalidation route | Nuxt handles caching differently |
| All React / Next.js dependencies | Replaced by Vue / Nuxt 3 |
| Per-widget Vue components | Single `GenericWidget.vue` |
| Language picker in settings | Removed |

---

## Implementation Order (Suggested)

1. Nuxt 3 project scaffold + Tailwind dark theme
2. YAML config loader + `${VAR}` substitution engine
3. Widget registry loader (bundled + custom-widgets)
4. Generic widget proxy API + `GenericWidget.vue`
5. Dashboard layout — tabs, service groups, bookmarks
6. Drag & drop (vue-draggable-plus, all levels)
7. Edit mode — modals, CRUD API routes, icon picker
8. Save / Rollback flow
9. Search bar
10. Docker/Kubernetes/Proxmox stat routes
11. Site monitor / ping
12. Sync script for upstream widget definitions
13. Dockerfile + docker-compose.example.yml
14. Port ~162 widget definitions to YAML registry
