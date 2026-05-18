# Home Dashboard

A personal homelab dashboard built with **Nuxt 4** and **Vue 3**. Displays services, bookmarks, weather, and Google Calendar \- all configured through YAML files, with a full in-browser edit mode and Docker deployment.

---

## Features

### Services panel

Each service shows as a card with:

- **Icon** \- any URL (works great with [Dashboard Icons](https://dashboardicons.com/))
- **Status dot** \- green/yellow/red based on Docker container health or HTTP ping
- **Widget data** \- live stats fetched from the service's own API (see [Supported widgets](#supported-widgets))
- **Click-through** \- the card links directly to the service URL

Services are grouped into sections (e.g. Media, System, Tools). Groups and their order are fully configurable.

### Bookmarks panel

A grid of quick-access links with icons. Supports configurable layout (justify, gap, mobile overrides).

### Weather

Auto-detects location via IP geolocation (`ip-api.com`) then fetches from [Open-Meteo](https://open-meteo.com/) (free, no key required). Shows:

- Current temperature, feels-like, humidity, wind
- Hourly forecast for the rest of the day
- Tomorrow's summary

Cached for 30 minutes server-side.

### Google Calendar

Shows today's events (all-day and timed) and tomorrow's events. Uses Google OAuth with a stored refresh token \- no re-login needed after initial setup. Configured entirely in `settings.yaml`.

### Background image

Daily rotating background from [Unsplash](https://unsplash.com/). Configured with a search query (e.g. `digital art 3d render fantasy`). Loads a low-res thumbnail first, then crossfades to the full image. Resets at midnight.

### Edit mode

A full in-browser edit mode \- no config file editing needed for day-to-day changes:

- Add, edit, and delete services and bookmarks
- Drag-and-drop reorder services within a group and reorder groups
- Add and remove service groups
- All changes are saved back to the YAML files on disk
- Password-protected (set `ADMIN_TOKEN` in your `.env`)

---

## Supported widgets

| Widget | What it shows |
|---|---|
| **Sonarr** | Wanted, missing, queue count |
| **Radarr** | Wanted, missing, queue count |
| **Readarr** | Wanted, missing, queue count |
| **Prowlarr** | Indexers, active grabs |
| **Bazarr** | Missing subtitles (movies + episodes) |
| **qBittorrent** | Active downloads, seeds, speed |
| **Plex** | Active streams |
| **Tdarr** | Transcoding queue, workers |
| **Overseerr** | Pending requests |
| **Audiobookshelf** | Currently reading |
| **Home Assistant** | Any entity state |
| **Pi-hole** | Queries today, blocked, block rate |
| **Portainer** | Container running/stopped counts |
| **Traefik** | Routers and services |
| **Duplicati** | Last backup status |
| **Unraid** | CPU, RAM, array status |

Widget credentials are read from the service entry in `services.yaml` and support `${ENV_VAR}` substitution.

---

## Configuration

All config lives in a single directory (default `./config`, override with `CONFIG_DIR` env var).

```
config/
  settings.yaml        # title, background, Google OAuth, section order
  services.yaml        # service groups and services
  bookmarks.yaml       # bookmark groups
  docker.yaml          # Docker socket connections (per server)
  widget-fields.yaml   # which fields each widget shows (auto-managed)
  .env                 # secrets injected into YAML via ${VAR}
```

### settings.yaml

```yaml
title: My Dashboard

background:
  provider: unsplash
  unsplashApiKey: YOUR_KEY
  query: nature landscape

google:
  clientId: YOUR_CLIENT_ID
  clientSecret: YOUR_CLIENT_SECRET
  refreshToken: YOUR_REFRESH_TOKEN

sectionOrder:
  - type: bookmark
    name: Links
  - type: service
    name: Media
```

### services.yaml

```yaml
- name: Media
  services:
    - name: Sonarr
      url: http://10.0.1.2:8989/
      description: Series collection manager
      icon: https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/webp/sonarr.webp
      type: sonarr
      apiKey: ${SONARR_API_KEY}
      server: nas          # matches a key in docker.yaml
      container: sonarr    # container name to watch on that server
```

Credentials can be set directly or via `${VAR}` references resolved from `config/.env` at runtime.

### docker.yaml

```yaml
nas:
  socketPath: /var/run/docker.sock   # if co-located
  # or
  host: 10.0.1.2
  port: 2375
```

---

## Deployment

### Docker (recommended)

```yaml
services:
  dashboard:
    image: nsignori/home-dashboard:latest
    container_name: home-dashboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /path/to/config:/config
    environment:
      - CONFIG_DIR=/config
      - ALLOWED_HOSTS=dashboard.yourdomain.com
      - ADMIN_TOKEN=your-password
      # Secrets referenced as ${VAR} in YAML files:
      - SONARR_API_KEY=abc123
      - RADARR_API_KEY=abc123
      # ... other service credentials
```

The image is published to Docker Hub on every version tag via GitHub Actions CI.

### Environment variables

| Variable | Description | Default |
|---|---|---|
| `CONFIG_DIR` | Path to config directory | `./config` |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames, or `*` | `*` |
| `ADMIN_TOKEN` | Password required to enter edit mode | *(none \- edit disabled)* |
| `PUID` / `PGID` | User/group for config file writes | `1000` / `1000` |
| `PORT` | Port the server listens on | `3000` |

### Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # run test suite
pnpm build      # production build
```

Requires Node 24 and pnpm 9.

---

## Architecture

- **Nuxt 4** with `app/` srcDir, SSR disabled on the admin page, client-side SPA for the dashboard
- **Nitro** server handles all API routes: config read/write, Docker socket queries, widget API calls, weather, calendar, background
- **Server-side caching** for all external calls \- refresh data (30s TTL), weather (30 min), background (until midnight), OAuth tokens
- **YAML + dotenv** config: files are read on each request from `CONFIG_DIR`, with `${VAR}` interpolated from the `.env` file in the same directory or from process environment
- **Widget registry** is auto-generated at build time from `shared/widgetDefinitions/` \- adding a new widget means adding one `.ts` file with the API call and field definitions
- **`shallowRef`** used for refresh data to avoid Vue walking large nested objects on every poll
- **Tailwind CSS v4** with a fixed dark-mode color palette defined as CSS custom properties

---

## CI/CD

GitHub Actions builds and pushes the Docker image to Docker Hub on every `v*` tag.

Required repository secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Building this with Claude Code

This project was a test building an app using [Claude Code](https://claude.ai/code).

### How it went

The process was a good back and forth for new features and creating the base application. I got into some more problematic responses/useless interventions from the AI the bigger the application got. At the point I asked it to do the widget system it was really hard to keep it in track and it cost a LOT of token just to create that feature. It's not fundamentally complex, but I hit a wall there.

For simple everyday requests, there is no problems and using the AI makes the process faster and more enjoyable. As soon as we get into system architecture, that's the part where it's struggling a lot.

Adding tests helped a lot in the back and forth I needed to have with it. I've told it to always run tests before finishing a task, it helped a lot to catch regression errors.