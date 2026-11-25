# Restricted Docker Operations Broker — Future Design

## Context

The current ops-agent (`worker/ops-agent.mjs`) registers `restart_container`
and `get_container_logs` but returns `OPERATION_UNAVAILABLE` for both. The
worker image does not contain the `docker` CLI and the `nextjs` user cannot
read `/var/run/docker.sock` (owned `root:docker`, mode `srw-rw----`).

This document describes the planned design for a narrowly scoped Docker
operations broker that can be deployed as a separate container without
granting unrestricted Docker API access to the web or worker containers.

## Option A: Narrowly Scoped Docker API Proxy (Preferred)

A dedicated `docker-broker` container:

```yaml
docker-broker:
  image: node:20-alpine
  user: root  # needed to talk to the socket; no other privileges
  cap_drop: [ALL]
  security_opt:
    - no-new-privileges:true
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
  environment:
    - BROKER_SECRET=${DOCKER_BROKER_SECRET}
  # No host port mapping — reachable only via Docker network
  networks:
    - gate-net
```

The broker exposes a minimal HTTP API on `127.0.0.1:3003` (Docker-internal):

| Endpoint | Method | Allowed |
|---|---|---|
| `/containers/:name/restart` | POST | `gate_web`, `gate_worker`, `gate_postgres`, `gate_redis`, `gate_caddy` |
| `/containers/:name/logs` | GET | same allowlist, `?lines=N` capped at 500 |
| `/health` | GET | open (no auth) |

Security properties:

- **Container allowlist** is hardcoded in the broker source, not configurable
  at runtime.
- **No arbitrary container creation** — only `POST /restart` and
  `GET /logs` are implemented. No `POST /containers/create`, no
  `POST /containers/:id/exec`.
- **No host filesystem mounting** — the broker has no volume mounts other
  than the Docker socket (read-only).
- **No privileged execution** — `cap_drop: [ALL]` + `no-new-privileges`.
- **Authentication** — Bearer token (`DOCKER_BROKER_SECRET`), injected
  only into the broker and web/worker containers.
- **Audit logging** — every request is written to `audit_logs` in the
  database with actor, container name, operation, timestamp, and result.
- **Rate limiting** — 10 req/min per token.
- **Timeouts** — 30 s per operation.

The web container's `/api/sysadmin/operations` endpoint proxies to the
broker (not the worker) for `restart_container` and `get_container_logs`.
The worker's ops-agent continues to handle all non-Docker operations.

## Option B: Host-Side Helper with Restricted IPC

A host-side systemd service (`docker-broker.service`) that:

1. Binds to `127.0.0.1:3003` on the host.
2. Accepts only `restart` and `logs` for a hardcoded container allowlist.
3. Authenticates via a shared secret.
4. Writes to a shared volume (`/usr/share/status`) for audit records.

The Docker network is configured with `extra_hosts:
- "host.docker.internal:host-gateway"` so the web container can reach
`host.docker.internal:3003`.

This option avoids adding a new container but requires a host-level
systemd unit and a network routing change.

## Migration Path

1. Deploy `docker-broker` as a new compose service (Option A).
2. Add `restart_container` and `get_container_logs` to the broker's
   allowlist.
3. Update the web's `/api/sysadmin/operations` route to proxy Docker
   operations to the broker instead of the worker.
4. Remove the `OPERATION_UNAVAILABLE` handlers from the worker's
   ops-agent (or keep them as a fallback with a clear "use broker"
   message).
5. Add `DOCKER_BROKER_SECRET` to `.env` and scope it to web + worker +
   broker.

## What This Design Does NOT Do

- No arbitrary shell access inside any container.
- No `docker exec` (privileged execution).
- No `docker create` / `docker run` (arbitrary container creation).
- No host filesystem mounting from the broker.
- No unrestricted Docker API endpoints.
- No public port exposure.
