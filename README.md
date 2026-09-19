# Community DMIT Platform

Full-stack community platform with DMIT fingerprint analysis, counselling appointments, member hierarchy, and a dynamic admin panel. Built with React.js, Node.js, Express.js, and MongoDB.

This is the community + DMIT application from my work: member registration, fingerprint (DMIT / SBI Pro) analysis, counselling sessions, and role-based admin operations.

## What’s included

| App | Stack | Role |
| --- | --- | --- |
| `client` | React + Vite | Public site and member portal |
| `admin` | React + Vite | Dynamic admin / counsellor operations |
| `server` | Node.js + Express + MongoDB | REST API, auth, appointments, DMIT sessions |

### Community & DMIT workflows

- Member registration, member IDs, and referral hierarchy
- DMIT / fingerprint analysis sessions (SBI Pro)
- Counselling appointments and slot management
- Teams, ranks, designations, and commissions
- Wallet, e-pins, and role-based admin

## Run locally

```bash
cp .env.example .env
# fill in MongoDB, JWT secrets, and optional email / storage keys
```

```bash
cd server && npm install && npm run server
cd client && npm install && npm run dev
cd admin && npm install && npm run dev
```

Or with Docker Compose:

```bash
docker compose up --build
```

Default ports: API `5000`, client `3000`, admin `3001`.

Seed a local admin (development only):

```bash
cd server
SEED_ADMIN_PASSWORD='your-strong-password' node seeds/loadAdmin.js
SEED_ROOT_PASSWORD='your-strong-password' node seeds/createRootUser.js
```

## Security

Secrets live in `.env` (see `.env.example`). Do not commit real API keys, database URIs, or production hosts.
