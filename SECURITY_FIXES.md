# Security Audit & Fixes — home-dashboard

A security review of this Nuxt 4 / Nitro self-hosted dashboard was performed across
four dimensions (auth/access-control, injection/SSRF/file-handling,
secrets/infra/supply-chain, client-side/XSS). All findings were then fixed as 13
focused commits, each with a clear *why* and *how*.

- **Test status:** full suite green after every commit — **1578 tests pass** (94 files), up from the 1535 baseline (+43 new security tests).
- **Branch:** all commits local on `master`, nothing pushed.

---

## Threat-model notes that shaped the fixes

Two product facts mattered:

1. **The dashboard is intentionally public** — widgets load without login (via
   `/api/refresh` and `/api/widget/*`). So auth could not simply be slapped on
   the widget endpoints without breaking the product.
2. **It is a homelab tool that legitimately fetches private IPs** (sonarr,
   pihole, unraid on the LAN). So a blanket "block private IP ranges" SSRF guard
   would have broken the core feature; the fix instead restricts fetches to
   hosts already present in the saved config.

---

## Findings & fixes

### Critical

#### C1 — Anonymous admin takeover via unauthenticated admin routes + leaked token
- **Root cause:** `server/middleware/editAuth.ts` only required auth on
  `/api/admin/*` for non-GET methods (`method !== 'GET'`), so every admin GET was
  public. The worst offender, `server/api/admin/settings.get.ts`, stripped
  credentials and then re-attached the raw token:
  `return { ...stripCredentials(config), adminToken: config.adminToken ?? '' }`.
  Since the session cookie was derived from that token, anyone could
  `curl /api/admin/settings`, read it, and forge an admin session. Same gap
  exposed `/api/admin/backup`, `/api/admin/auto-backup-preview`,
  `/api/admin/docker`, etc.
- **Fix (commit `f5046ec`):** `editAuth.ts` now requires auth for **all**
  `/api/admin/*` and `/api/edit/*` (every method). `settings.get.ts` returns only
  `adminTokenSet: boolean`. The settings form treats the token field as
  write-only (blank = keep existing), enforced server-side in
  `edit/settings.post.ts`. The public `colorPalette` plugin was repointed from
  `/api/admin/settings` to the credential-stripped public `/api/config`.

### High

#### H1 — Unauthenticated SSRF in widget proxy endpoints
- **Root cause:** every `/api/widget/*` endpoint reads a client-supplied `url`
  and fetches it server-side with no validation, e.g.
  `GET /api/widget/sonarr?url=http://169.254.169.254/latest/meta-data&apiKey=x`.
  Error classification also leaked an internal port-scan oracle.
- **Fix (commit `1fa520c`):** new `server/utils/widgetHostAllowlist.ts` builds the
  set of hosts in `services.yaml`/`widgets.yaml`; `widgetEndpoint()` (the single
  choke point) rejects any `url` whose host isn't configured. LAN hosts keep
  working; metadata/arbitrary hosts are refused.

#### H2 — `javascript://` stored XSS in external links
- **Root cause:** `shared/externalUrl.ts` returned any URL unchanged when
  `hasScheme()` matched, and the scheme regex accepted any scheme followed by
  `//` — so `javascript://%0aalert(document.cookie)` reached the `:href` of
  bookmarks/service cards.
- **Fix (commit `c265701`):** `externalUrl()` now reads the scheme the way a
  browser does (stripping whitespace/control chars) and neutralizes
  `javascript:`/`data:`/`vbscript:` to `#`. Normal schemes unaffected.

#### H3 — Predictable, non-expiring, non-Secure session cookie
- **Root cause:** session value was `sha256(adminToken + ':hm_session')` — pure
  function of the token, no independent secret, no server-enforced expiry, no
  revocation, no `Secure` flag.
- **Fix (commit `bba77e4`):** cookies are signed with a random 32-byte key
  independent of the token (`config/session.key`, overridable via `SESSION_KEY`),
  embed an issue time + HMAC (server-enforced 30-day expiry, constant-time
  verify, rejects tampered/future/wrong-token), and are marked `Secure` only when
  the request is actually HTTPS (so plain-HTTP LAN still works).

### Medium

#### M1 — `${VAR}` substitution could exfiltrate the admin token
- **Fix (commit `38741c5`):** `config.ts` denylists `ADMIN_TOKEN` / `SESSION_KEY`
  from `${VAR}` expansion (those values are served through public endpoints).
  Ordinary `${VAR}` references still work.

#### M2 — Google OAuth flow unauthenticated + no CSRF state
- **Fix (commit `2139429`):** `/api/auth/google` requires admin auth and sets a
  random `state` cookie (sameSite=lax); the callback validates `state` before
  exchanging the code or writing the refresh token.

#### M3 — Upload extension taken from spoofable filename/MIME
- **Fix (commit `9c9cacb`):** `background-upload.post.ts` ignores filename/MIME and
  sniffs magic bytes (JPEG/PNG/GIF/WEBP); the on-disk extension comes from the
  detected type, and non-images are rejected.

#### M4 — No login rate limiting
- **Fix (commit `7702a25`):** new `server/utils/loginRateLimit.ts` throttles per
  socket IP (5 free attempts, then exponential backoff 30s→…capped 15min, resets
  after 15min idle, cleared on success). `login.post.ts` returns 429 +
  `Retry-After`. Uses socket IP (not spoofable `X-Forwarded-For`).

#### M5 — `ALLOWED_HOSTS=*` default + permissive CSP
- **Fix (commit `f1e5737`):** dropped `'unsafe-eval'` from `script-src`
  (`'unsafe-inline'` kept — Nuxt inline hydration needs it without a nonce
  setup), and documented `ALLOWED_HOSTS` + an `ADMIN_TOKEN` example in
  `docker-compose.example.yml`.

### Low

- **L1 (commit `a33df57`):** `/api/config` now strips credential-like keys from
  the `widgets` array too (defense-in-depth).
- **L2 (commit `aa0a3d6`):** remote calendar/background author links routed
  through the `externalUrl` scheme guard.
- **L3 (commit `b3a4b8f`):** `/api/calendar/task` now requires admin auth
  (completing a task writes to the connected Google account).
  **Behavior change:** task completion requires being logged in; revert this
  commit to keep it public.
- **L4 (commit `0983a41`):** `/api/admin/calendar` no longer returns the Google
  `clientSecret` (now `hasClientSecret: boolean`); the admin form treats it as
  write-only.

---

## Commit list

| # | Commit | Sev | Summary |
|---|--------|-----|---------|
| 1 | `f5046ec` | Critical | require auth on all admin routes and stop leaking the admin token |
| 2 | `1fa520c` | High | block SSRF in the public widget proxy endpoints |
| 3 | `c265701` | High | reject script-executing URL schemes in external links |
| 4 | `bba77e4` | High | make session cookies unpredictable, expiring, and Secure-aware |
| 5 | `38741c5` | Medium | never expand the admin token / session key in ${VAR} substitution |
| 6 | `2139429` | Medium | authenticate the Google OAuth flow and add CSRF state |
| 7 | `9c9cacb` | Medium | derive uploaded background extension from content, not the client |
| 8 | `7702a25` | Medium | rate-limit failed admin login attempts |
| 9 | `f1e5737` | Medium | drop 'unsafe-eval' from CSP and document ALLOWED_HOSTS |
| 10 | `a33df57` | Low | strip credential-like keys from widgets in /api/config |
| 11 | `aa0a3d6` | Low | run remote calendar/background links through the scheme guard |
| 12 | `b3a4b8f` | Low | require auth to complete a Google task (behavior change) |
| 13 | `0983a41` | Low | stop returning the Google client secret; make it write-only |

---

## Things already done well (confirmed during the audit)

- Login uses constant-time HMAC comparison; session cookie is `httpOnly` +
  `sameSite=strict`.
- Zip-slip is correctly mitigated in restore (basename + `..`/`/` rejection +
  extension allowlist).
- Setup correctly refuses re-registration once a token exists.
- `js-yaml` v4 safe loader; prototype-pollution keys blocked on config writes.
- No `v-html`/`eval`/`innerHTML` in the client; widget data renders through
  auto-escaped interpolation.
- No hardcoded secrets in source or git history (`.env`/`config/` gitignored and
  dockerignored).
- CI is clean (tag-triggered only, `contents: read`, no `pull_request_target`,
  no script injection).

---

## Follow-ups / caveats

- **CSP change (commit 9) is config-only and not covered by unit tests** — do a
  quick browser smoke-test of the running app to confirm nothing relied on
  `eval`. Tightening `'unsafe-inline'` further would require a nonce/hash-based
  CSP (larger change, tracked separately).
- **Dependency vulnerability scan not run** — `pnpm audit` needs registry access,
  unavailable in the audit environment. Run it on a networked machine to complete
  the supply-chain picture. (Source-level supply-chain review was clean.)
- **Task-completion auth (commit 12)** is a deliberate behavior change; revert if
  you want the public dashboard to keep completing tasks without login.
- **Sessions reset on restart** if `config/session.key` is not writable (falls
  back to an ephemeral in-memory key). Persisting the config dir keeps sessions
  across restarts.
