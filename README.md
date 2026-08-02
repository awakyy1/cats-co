# Cats&Co

An authenticated real-time chat experiment with three rooms and small browser games. Express serves the application, MongoDB stores accounts and sessions, and Socket.IO delivers room-scoped messages.

## Security notice

An earlier revision contained a MongoDB Atlas connection string with credentials. Treat those credentials as compromised: rotate the database password, restrict Atlas network access, and review access logs. Removing the value from the current source does not remove it from Git history.

## Run locally

Requirements: Node.js 20 or newer and a MongoDB deployment.

```sh
npm install
cp .env.example .env
```

Set a new `MONGODB_URI` and a random `SESSION_SECRET` of at least 32 characters, then load the environment and run:

```sh
npm start
```

The app is available at `http://localhost:3000` by default.

## Test

```sh
npm test
```

Tests use an in-memory session store and a fake user repository, so they do not require MongoDB.

## Implemented safeguards

- Passwords hashed with bcrypt and never returned to the browser
- Unique normalized nicknames and email addresses
- Atomic account insertion instead of destructive collection rewrites
- Server-owned chat identity and room membership
- Authenticated private pages and sockets
- Length and format validation for accounts and messages
- HTTP hardening, same-origin checks, request size limits, and authentication rate limits
- Server-side MongoDB session storage outside tests

## Production considerations

Use TLS behind a trusted reverse proxy, set `NODE_ENV=production`, configure proxy trust explicitly, enforce a deployment-specific Content Security Policy, add structured logging and moderation, and run integration tests against a disposable MongoDB database.
