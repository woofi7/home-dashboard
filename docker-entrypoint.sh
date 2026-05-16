#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Adjust config dir ownership if running as root
if [ "$(id -u)" = "0" ]; then
  chown -R "${PUID}:${PGID}" "${CONFIG_DIR}" 2>/dev/null || true
  exec su-exec "${PUID}:${PGID}" "$@"
else
  exec "$@"
fi
