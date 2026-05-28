# Nura Weather Alerts

React + Node.js app where users log in, pick a city, and watch live weather alongside real-time alerts scoped to that city via Socket.IO rooms.

---

## What it does

| Feature | Detail |
| --- | --- |
| **Auth** | JWT login, bcrypt-hashed passwords, auto-redirect on token expiry |
| **Weather** | OpenWeatherMap One Call 3.0 — current conditions, UV, pressure, visibility, 24 h hourly, 8-day forecast |
| **City search** | Debounced autocomplete backed by Open-Meteo Geocoding (no API key needed, cached 10 min) |
| **Geolocation** | Browser Geolocation → Haversine distance → nearest supported city |
| **Live alerts** | Socket.IO rooms — Melbourne clients only get Melbourne messages |
| **Severity levels** | `info` / `warning` / `critical`, colour-coded toast notifications |
| **Message history** | Last 10 messages per city replayed when you join a room |
| **Weather alert push** | Cached OWM alerts for the city are auto-sent as messages on room join |
| **Admin panel** | In-app form to push a test message to any city, shows live delivery count |
| **Security headers** | Helmet (X-Frame-Options, HSTS, X-Content-Type-Options, etc.) |
| **Rate limiting** | 10 pushes/min on `POST /api/messages`, 60 req/min on `/api/locations` |
| **Validation** | Zod on all inputs, 400 errors with field-level messages |
| **Tests** | 10 Vitest + Supertest tests — login, wrong credentials, health check, message auth, Zod validation, zero-subscriber delivery |
| **Docker** | Multi-stage Dockerfiles, `docker compose up --build` runs everything |
| **CI** | GitHub Actions — type-check + test on push and PR |

---

## Demo credentials

```
username: demo     password: password
username: admin    password: admin123
```

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

# nearest supported city from coordinates
curl "http://localhost:3001/api/locations/nearby?lat=-37.8&lon=144.9" \
  -H "Authorization: Bearer <token>"
```

### Push a live alert

```bash
# get a token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# push the message (open the app on Melbourne first to see the toast)
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"city":"Melbourne","message":"Severe weather alert near Southbank","severity":"warning"}'
```

`severity` accepts `info` | `warning` | `critical`.

> The in-app Admin panel (collapsible, right side of the home page) does the same thing without any curl setup.

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
```

**Real-time flow:**

1. Client connects to Socket.IO with `{ auth: { token } }`
2. `io.use()` verifies the JWT before the connection is accepted
3. Selecting a city emits `join-city` → server leaves any previous city room, calls `socket.join('melbourne')`, and emits `city-joined` back to the client
4. Server replays the last 10 stored messages for that city to the joining socket
5. If there are cached weather alerts for that city, they are pushed as `warning` messages to the joining socket
6. `POST /api/messages` validates the payload with Zod, stores it in history, then calls `io.to('melbourne').emit('city-message', payload)`
7. Only sockets in that room receive the event

---

## Tests

```bash
cd server && npm test
```

Covers: login validation, wrong credentials, health endpoint, message push auth, Zod schema enforcement (city/message/severity), delivery count when no subscribers.

---

## Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | _(insecure fallback)_ | Set this in production |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS allowed origin |
| `OWM_API_KEY` | — | OpenWeatherMap One Call 3.0 |

---

## Security notes

JWT authentication covers both REST endpoints and Socket.IO connections. All inputs are validated with Zod before hitting the service layer. Helmet sets the standard security headers and rate limiting is on the message and location endpoints.

The geolocation feature only fires after the user grants browser permission. Coordinates go to `GET /api/locations/nearby`, are used server-side for a Haversine calculation against 12 known cities, and are not stored.

```
✓ Zod validation on all inputs
✓ JWT required on all authenticated routes
✓ JWT required on Socket.IO connection
✓ Message endpoint rate-limited (10/min)
✓ Location endpoint rate-limited (60/min)
✓ CORS restricted to CLIENT_ORIGIN
✓ Helmet security headers
✓ Passwords hashed with bcrypt
✓ No secrets in source — .env.example provided
✓ No stack traces in error responses
```

---

## Assumptions

- Storage is in-memory as the brief allows. The service layer is already separated from routes and socket logic, so swapping in a real database would be isolated to `services/`.
- City autocomplete uses Open-Meteo Geocoding — no API key needed, results cached 10 min per query.
- Geolocation snaps to one of 12 hardcoded cities; it does not support arbitrary coordinates.
- No refresh token or registration flow; auth is simplified for the scope of this challenge.

---

## If this went to production

- **Database** — PostgreSQL or Azure Cosmos DB. Only `weatherService.ts` would need to change; routes and socket contracts stay the same.
- **Redis adapter** — Socket.IO's Redis adapter handles room membership across multiple Node instances without any changes to the application logic.
- **Refresh tokens** — short-lived access tokens with rotation-based refresh in HttpOnly cookies.
- **Azure** — App Service for the API, Static Web Apps for the React client, Azure Cache for Redis.
- **Message log** — persist every pushed message with sender, city, severity, and timestamp.
- **Per-user rate limiting** — current limit is IP-based; a Redis-backed per-user counter is more accurate behind a load balancer.
- **Observability** — Application Insights for request traces, error rates, and Socket.IO connection counts.
