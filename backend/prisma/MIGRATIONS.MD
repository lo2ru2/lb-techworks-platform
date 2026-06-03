## Prisma Migration Notes (No-Reset Workflow)

This project currently runs with production-like data in local
development, so the migration workflow is optimized to avoid data loss.

### Current safe status

- `prisma migrate status` reports database schema is up to date.
- The latest schema snapshot is stored in `prisma/backups/`.
- App builds pass for both backend and frontend.

### Commands to use

- `npm run prisma:status`    - Check migration state.
- `npm run prisma:generate`  - Regenerate Prisma client after schema changes.
- `npm run prisma:deploy`    - Apply committed migrations without destructive resets.
- `npm run prisma:snapshot`  - Refresh schema snapshot SQL backup.

### Commands to avoid on non-empty databases

- `prisma migrate reset`
- `prisma migrate dev` when drift is detected and you need to preserve data

If `migrate dev` asks for reset but data must be preserved,
use a non-destructive path:

1. Back up schema (`npm run prisma:snapshot`).
2. Apply intended SQL change with `prisma db execute`.
3. Record migration state with `prisma migrate resolve --applied <migration_id>`.
4. Verify with `npm run prisma:status`.

This keeps products, stock, orders, and customer data intact.
