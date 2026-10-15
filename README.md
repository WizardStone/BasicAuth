# BasicAuth

Simple Express.js HTTPS API with SQLite-backed users, bcrypt password hashing, and JWT auth.

## Features

- HTTPS server (`https://localhost:8443` by default)
- HTTP endpoints for register/login/profile
- Password hashing using bcrypt
- SQLite user storage
- Sliding JWT session (refresh token returned on authenticated requests)

## Run

```bash
npm install
npm start
```

The server starts with:

- `PORT` (default: `8443`)
- `DB_FILE` (default: `./data.sqlite`)
- `JWT_SECRET` (default: `dev-only-secret-change-me`)
- `JWT_EXPIRY_SECONDS` (default: `900`)
- Optional certificate files:
  - `HTTPS_KEY_PATH`
  - `HTTPS_CERT_PATH`

If `HTTPS_KEY_PATH` and `HTTPS_CERT_PATH` are not provided, a self-signed certificate is generated at runtime.

## API

- `POST /users/register`
  - body: `{ "username": "alice", "password": "password123" }`
- `POST /auth/login`
  - body: `{ "username": "alice", "password": "password123" }`
  - returns JWT token
- `GET /auth/me`
  - header: Authorization using the ****** and your JWT token
  - returns user and a refreshed JWT (`token` and `X-Refresh-Token` header)

Store the returned JWT client-side (for example in browser localStorage) and send it in the authorization header on each request.
