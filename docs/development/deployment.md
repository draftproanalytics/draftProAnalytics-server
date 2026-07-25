# Deployment Guide

## Environments

### Development

- Client: Vite, commonly port `5173`
- Server: Express, commonly port `5000`
- Database: MySQL 8

### Production

- Nginx serves the client SPA.
- Nginx proxies `/api` to the server.
- PM2 manages the server process.
- Production domain: `draftproanalytics.com`

## Client deployment outline

1. Confirm branch and working tree.
2. Pull with fast-forward only.
3. Select the approved Node version.
4. Install dependencies with the repository-approved command.
5. Run the production build.
6. Deploy generated assets to the Nginx-served directory.
7. Validate Nginx configuration.
8. Reload Nginx.
9. Smoke-test SPA routes and API calls.

Example validation commands:

```bash
git status
git pull --ff-only origin main
npm install
npm run build
sudo nginx -t
sudo systemctl reload nginx
```

Adapt paths and privileges to the VPS.

## Server deployment outline

1. Confirm branch and working tree.
2. Back up environment and database when required.
3. Pull with fast-forward only.
4. Select the approved Node version.
5. Install dependencies.
6. Synchronize Prisma schema with approved database changes.
7. Generate Prisma client.
8. Build.
9. Restart the PM2 process.
10. Inspect logs.
11. Smoke-test health and feature endpoints.

Example:

```bash
git status
git pull --ff-only origin main
npm install
npx prisma validate
npx prisma generate
npm run build
pm2 restart draftproanalytics-server
pm2 logs draftproanalytics-server --lines 100
```

Use the actual PM2 process name.

## Logs

### Nginx

Common locations:

```text
/var/log/nginx/access.log
/var/log/nginx/error.log
```

### PM2

Use:

```bash
pm2 list
pm2 logs <process-name>
pm2 describe <process-name>
```

PM2 log files are commonly under:

```text
~/.pm2/logs/
```

## CORS

Production and development origins must be environment-driven.

When debugging:

- Log the parsed allow-list safely.
- Trim comma-separated origins.
- Confirm scheme, host, and port.
- Do not add wildcard production CORS to hide a parsing problem.

## Module aliases

TypeScript path aliases must be resolved in built JavaScript.

A successful TypeScript compile does not guarantee Node can resolve `@/...` at runtime.

Use the repository's approved alias-rewrite/runtime solution and validate the built `dist` output.

## Database deployment

Follow `docs/architecture/database-policy.md`.

Do not:

- Run Prisma migration commands by assumption
- Restore a backup without confirming the target database
- Apply schema changes before reviewing DDL
- Restart the app midway through an incomplete schema update

## Rollback

Before deployment, identify:

- Previous Git commit
- Previous client build
- Database backup
- Environment backup
- PM2 process configuration

A deployment is not complete until rollback is possible and the smoke test passes.
