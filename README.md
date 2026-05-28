# Nura Weather Alerts

React + Node.js app where users log in, pick a city, and watch live weather alongside real-time alerts scoped to that city via Socket.IO rooms.

---

## What it does

| Feature | Detail |
| --- | --- |
| **Auth** | JWT login, bcrypt-hashed passwords, auto-redirect on token expiry |
| **Weather** | OpenWeatherMap One Call 3.0 — current conditions, UV, pressure, visibility, 24 h hourly, 8-day forecast |
| **City search** | Debounced autocomplete backed by Open-Meteo Geocoding (no API key needed, cached 10 min) |
| **Geolocation** | Browser Geolocation → Nominatim reverse geocoding → suburb/city name |
| **Live alerts** | Socket.IO rooms — Melbourne clients only get Melbourne alerts |
| **Severity levels** | `info` / `warning` / `critical`, colour-coded toast notifications |
| **Alert history** | Last 10 alerts per city replayed when you join a room |
| **Weather alert push** | If a recent weather lookup cached alerts for that city, they are replayed as `warning` alerts on room join |
| **Admin panel** | In-app form to send a test alert to any city, shows live delivery count |
| **Security headers** | Helmet (X-Frame-Options, HSTS, X-Content-Type-Options, etc.) |
| **Rate limiting** | 10 pushes/min on `POST /api/messages`, 60 req/min on `/api/locations` |
| **Validation** | Zod on message + location inputs, returns 400 with a concise error |
| **Tests** | 12 Vitest + Supertest tests — login, wrong credentials, health check, message auth, Zod validation, zero-subscriber delivery, room isolation |
| **Docker** | Multi-stage Dockerfiles, `docker compose up --build` runs everything |
| **CI** | GitHub Actions — type-check + test on push and PR |

---

## Demo credentials

```
username: demo     password: password
username: admin    password: admin123
```

### Demo roles

- `demo / password` — regular user. Can log in, select a city, view weather, and receive city-scoped live alerts.
- `admin / admin123` — admin user. Can also open the Admin panel, send live alerts, and see live watcher counts per city. `POST /api/messages` is gated by an `authorizeAdmin` middleware that returns 403 for non-admins.

---

## Live demo

URL: https://nura-client.salmonhill-24fd1b47.australiaeast.azurecontainerapps.io

The hosted demo runs the React client, Node API, and Socket.IO server together.

---

## Deployment

Deployed on **Azure Container Apps** via **Bicep IaC** and **GitHub Actions with OIDC** — no long-lived service-principal secrets stored in CI.

```
GitHub Actions (OIDC) ──► Azure
   │
   ├─ docker build × 2 ──► Azure Container Registry
   └─ az deployment group create ──► Bicep
                                       │
                                       ├─ Log Analytics
                                       ├─ Container Apps Environment
                                       ├─ nura-client  (public ingress, nginx)
                                       └─ nura-server  (internal-only, Node + Socket.IO)
```

**Choices worth calling out:**

- **Internal-only API.** The Node server has no public URL — its ingress is `external: false`. The client's nginx is the only public surface and reverse-proxies `/api` and `/socket.io` over ACA's internal DNS. Smaller attack surface.
- **WebSocket-safe scaling.** `minReplicas: 1` keeps Socket.IO connections alive across the scale floor; ACA's `transport: 'auto'` preserves the `Upgrade` handshake end-to-end.
- **OIDC instead of service-principal secrets.** A federated credential trusts GitHub's OIDC token for the `main` branch — nothing rotates, nothing leaks.
- **User-assigned managed identity with `AcrPull`.** Container Apps pulls images without registry passwords.

See [infra/main.bicep](infra/main.bicep) and [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

<details>
<summary>Deploy your own copy</summary>

Requires Azure CLI and a GitHub repo you own.

```bash
SUFFIX=<your-suffix>          # e.g. initials + 4 digits
LOC=australiaeast
RG=rg-nura-$SUFFIX
ACR=acrnura$SUFFIX            # lowercase alphanumeric, globally unique

az login
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.ManagedIdentity

az group create -n $RG -l $LOC
az acr create -n $ACR -g $RG --sku Basic --admin-enabled false

APP_ID=$(az ad app create --display-name "gh-nura-$SUFFIX" --query appId -o tsv)
az ad sp create --id $APP_ID
SUB=$(az account show --query id -o tsv)
az role assignment create --assignee $APP_ID --role Contributor \
  --scope /subscriptions/$SUB/resourceGroups/$RG
az role assignment create --assignee $APP_ID --role AcrPush \
  --scope /subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.ContainerRegistry/registries/$ACR

# Federate GitHub OIDC — replace <owner>/<repo>
az ad app federated-credential create --id $APP_ID --parameters '{
  "name":"gh-main","issuer":"https://token.actions.githubusercontent.com",
  "subject":"repo:<owner>/<repo>:ref:refs/heads/main",
  "audiences":["api://AzureADTokenExchange"]
}'
```

Then add these five **GitHub repo secrets**: `AZURE_CLIENT_ID` (= `$APP_ID`), `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `JWT_SECRET`, `OWM_API_KEY`. Update `SUFFIX`/`RG`/`ACR` at the top of [.github/workflows/deploy.yml](.github/workflows/deploy.yml) to match what you used, then push to `main`. The workflow prints the public URL in its run summary.

</details>

---

## Quick review path

1. Log in as `admin / admin123`.
2. Open the app in two browser tabs.
3. Select **Melbourne** in both tabs.
4. Open the Admin panel from the right-side drawer.
5. Send a `warning` alert to Melbourne.
6. Both Melbourne tabs should receive the real-time toast.
7. Change one tab to **Sydney** and send another Melbourne alert to confirm city-room isolation.

---

## Running locally

```bash
# clone and install
git clone <repo>
cd nura-space
npm install          # installs client + server via workspaces

# configure
cp server/.env.example server/.env
# edit server/.env and add your OWM_API_KEY

# start
npm run dev          # client → http://localhost:5173  |  server → http://localhost:3001
```

---

## Running with Docker

```bash
cp .env.example .env     # add your OWM_API_KEY
docker compose up --build
```

App is at `http://localhost:5173`.

---

## API reference

### Auth

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"password"}'
```

### Weather

```bash
curl "http://localhost:3001/api/weather?city=Melbourne" \
  -H "Authorization: Bearer <token>"
```

### City search

```bash
# autocomplete — returns up to 6 results, cached 10 min
curl "http://localhost:3001/api/locations/search?q=Mel" \
  -H "Authorization: Bearer <token>"

# reverse geocode coordinates to a suburb/city name via Nominatim, cached 10 min
curl "http://localhost:3001/api/locations/nearby?lat=-37.8&lon=144.9" \
  -H "Authorization: Bearer <token>"
```

### Push a live alert

```bash
# get a token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# send the alert (open the app on Melbourne first to see the toast)
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"city":"Melbourne","message":"Severe weather alert near Southbank","severity":"warning"}'
```

`severity` accepts `info` | `warning` | `critical`.

> The in-app Admin panel (slide-in drawer from the right side of the home page) does the same thing without any curl setup.

### Health check

```bash
curl http://localhost:3001/api/health
# {"status":"ok","ts":1234567890}
```

---

## Architecture

```
client/                         server/
  src/                            src/
    pages/                          routes/       # thin Express handlers
    components/                     services/     # weather, location, message logic
      auth/                         socket/       # Socket.IO rooms + broadcasting
      layout/                       middleware/   # JWT verification
      weather/                      types/
      messages/                     __tests__/    # Vitest + Supertest
    context/                        index.ts
      AuthContext.tsx
      WebSocketContext.tsx
      ToastContext.tsx
    hooks/
    services/api.ts
    types/
```

**Real-time flow:**

1. Client connects to Socket.IO with `{ auth: { token } }`
2. `io.use()` verifies the JWT before the connection is accepted
3. Selecting a city emits `city:join` → server joins the new room first, then leaves any previous city room (race-safe), and emits `city:joined` back to the client
4. Server replays the last 10 stored messages for that city to the joining socket
5. If there are cached weather alerts for that city, they are pushed as `warning` messages to the joining socket
6. `POST /api/messages` validates the payload with Zod, stores it in history, then calls `io.to('melbourne').emit('city:message', payload)`
7. Only sockets in that room receive the event

---

## Tests

```bash
cd server && npm test
```

Covers: login validation, wrong credentials, health endpoint, message push auth, Zod schema enforcement (city/message/severity), delivery count when no subscribers, and Socket.IO room isolation to confirm Melbourne messages do not leak to other city rooms.

---

## Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | _(insecure fallback)_ | Set this in production |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS allowed origin |
| `OWM_API_KEY` | — | OpenWeatherMap One Call 3.0 — required for live weather data |
| `SERVER_HOST` | _(set by compose / Bicep)_ | **Client-side.** nginx upstream for `/api` and `/socket.io`. `server:3001` locally, `nura-server` on Azure. |

`OWM_API_KEY` is required for live weather data. The app will still start without it, but `GET /api/weather` returns a `NO_API_KEY` configuration error. Login, Socket.IO, and the admin alert flow can still be reviewed without it.

---

## Security notes

JWT auth covers both REST endpoints and the Socket.IO connection. All inputs are validated with Zod before hitting the service layer. Helmet sets the standard security headers; the message endpoint is rate-limited to 10/min and the location endpoint to 60/min. Passwords are hashed with bcrypt, CORS is restricted to `CLIENT_ORIGIN`, and error responses never include stack traces.

Presence data (per-city watcher counts and the cross-city overview) is admin-only at the socket layer — both the `presence:update` overview and `city:presence` per-room count are scoped to admin sockets via dedicated rooms, so non-admin clients never receive the data over the wire.

Geolocation only fires after the user grants browser permission. Coordinates are sent to `GET /api/locations/nearby`, which calls Nominatim (OpenStreetMap) to resolve a suburb or city name. They are not stored.

Nominatim calls are proxied through the backend, cached for 10 minutes, and sent with an application-identifying `User-Agent` per the OSM usage policy. Location lookup is user-triggered only.

---

## Assumptions

- Storage is in-memory as the brief allows. Routes and socket logic call into `services/`, so swapping in a real database is isolated to that layer.
- City autocomplete uses Open-Meteo Geocoding — no API key needed, results cached 10 min per query.
- Geolocation uses Nominatim reverse geocoding. The resolved name is passed to the weather API, so accuracy depends on what Nominatim returns.
- No refresh token or registration flow; auth is intentionally simplified for the challenge scope.
