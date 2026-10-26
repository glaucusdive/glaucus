# Applying Supabase Migrations

## Repository Policy

- Commit intentional, reviewed migrations in `supabase/migrations`.
- Do not run `supabase db pull` as a prerequisite to applying a migration. It captures the remote schema into a new local migration; it is not an apply command.
- Generated `*_remote_schema.sql` snapshots, including `*__remote_schema.sql`, are local-only and ignored by Git. Do not commit or replay them as feature migrations.
- Git ignore rules do **not** exclude SQL from Supabase CLI discovery. Move unwanted snapshots out of `supabase/migrations` before pushing. Ignored files left there may still be applied.
- Never delete records, reset a remote database, or broadly repair migration history to make an error disappear. History must match schema changes that actually happened.

## First-Time Setup

Run commands from the repository root. Use the project's existing Supabase account; this repository normally uses the default CLI profile, not `--profile glaucus`.

```sh
supabase --version
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Get the project reference from the intended project's Supabase Dashboard. Verify whether you are targeting development, staging, or production before linking. A local link does not automatically follow your Git branch or Netlify deploy context; relink explicitly when changing environments.

Enter credentials only in the terminal when prompted. Do not put access tokens, database passwords, or connection strings in commands, documentation, commits, or chat. `supabase login` does not replace a requested database password.

If the CLI reports that `supabase/config.toml` already exists, do not reinitialize or overwrite it; the repository is already initialized.

## Normal Apply Workflow

1. Review your intentional migration and confirm the project link in the Dashboard and CLI output.
2. Check history and look for unwanted snapshots:

   ```sh
   supabase migration list --linked
   find supabase/migrations -maxdepth 1 -type f -name '*_remote_schema.sql' -print
   ```

   If snapshots are listed, follow the next section before continuing. If history contains unexplained differences, stop and investigate rather than pulling a new snapshot.

3. Preview the pending changes:

   ```sh
   supabase db push --linked --dry-run --skip-vault
   ```

   Review **every** migration listed. Push applies pending migrations in order, not just the latest file. Stop if the list includes a remote-schema snapshot, an unexpected migration, or changes for the wrong environment. Do not add `--include-all`, `--include-seed`, `--include-roles`, or `--yes` just to bypass a warning.

4. Once the preview contains only reviewed changes, apply:

   ```sh
   supabase db push --linked --skip-vault
   ```

   Keep confirmation prompts enabled and read them. `--skip-vault` avoids unrelated Vault updates; these instructions are for SQL migrations, not Vault configuration. This flag is supported by the installed CLI version checked for this guide (2.121.0); check `supabase db push --help` if another version rejects it.

5. Confirm history:

   ```sh
   supabase migration list --linked
   ```

   The intended timestamp should now appear in both Local and Remote. Verify the feature in the app. Apply required migrations before deploying application code that depends on them.

Repeat the project verification, preview, apply, and verification steps separately for each environment.

## Unwanted Remote-Schema Snapshots

If `db pull` creates a file such as `YYYYMMDDHHMMSS_remote_schema.sql` or `YYYYMMDDHHMMSS__remote_schema.sql`, do not apply or stage it. Preserve it outside the migration directory if you need it for local reference:

```sh
mkdir -p supabase/.local/schema-snapshots
mv supabase/migrations/ACTUAL_TIMESTAMP_remote_schema.sql supabase/.local/schema-snapshots/
```

Replace the example filename with the actual file; do not run the example literally. Move only the unwanted snapshot, not intentional feature migrations. If you have already removed the snapshot, skip this step. The destination is ignored by Git and is outside CLI migration discovery.

The rules in [supabase/.gitignore](../supabase/.gitignore) cover both naming forms. Check a candidate path without creating a file:

```sh
git check-ignore supabase/migrations/20990101000000_remote_schema.sql
git check-ignore supabase/migrations/20990101000000__remote_schema.sql
```

Ignore rules do not remove files already tracked by Git. Review any tracked snapshot separately; do not bulk untrack migrations or undo someone else's staged changes. Snapshots may include sensitive schema definitions or embedded configuration: do not paste their contents into chat or logs.

If `db pull` asks to update remote migration history, that is a remote state change, not merely downloading SQL. Do not approve it for a snapshot you intend to discard. If it already happened, moving or ignoring the file will not remove its remote history entry; use the history guidance below.

## Migration History Problems

### SQL Already Applied Manually

If you applied an exact reviewed migration in the Dashboard SQL Editor, its schema changes may exist while CLI history still shows it as pending. Verify the complete migration succeeded, including grants and policies, on the correct project before marking it applied:

```sh
supabase migration repair ACTUAL_TIMESTAMP --status applied --linked
supabase migration list --linked
supabase db push --linked --dry-run --skip-vault
```

Replace `ACTUAL_TIMESTAMP` with the migration's numeric prefix, without its descriptive suffix or `.sql`. Repair changes the history table only; it does not execute, validate, or roll back SQL. Never mark unrelated or unexecuted migrations applied.

### Remote-Only Snapshot Version

If an unwanted pull snapshot is recorded remotely but absent locally, `db push` may stop with a history mismatch. Do not repeatedly run `db pull` or reintroduce a snapshot just to replay it. Compare the exact version with the team's migration baseline first.

Only after confirming that a particular history entry was created solely by an unwanted pull and that removing its record will not hide a real migration, an authorized developer can deliberately mark **that one version** reverted:

```sh
supabase migration repair ACTUAL_SNAPSHOT_TIMESTAMP --status reverted --linked
```

This modifies remote migration history; it does **not** revert the database schema. It is not the default workflow and is not safe as a bulk fix. If the remote schema includes legitimate manual changes missing from committed migrations, reconcile those changes with reviewed incremental migrations before proceeding.

### Other Failures

- Wrong project or credentials: verify the intended project and relink; enter any requested secret directly into the terminal.
- Missing older versions: compare Local and Remote with the team; do not use `--include-all` blindly.
- Failed or partially applied SQL: inspect the actual schema and migration transaction outcome before retrying or repairing history. Use a reviewed corrective migration when needed.
- Local reset: `supabase db reset` rebuilds a local database and can erase local data. It is not a prerequisite for deploying to an existing hosted project. Do not use reset commands against remote projects as migration troubleshooting.
- Keep any required production backup/recovery procedure and approvals in place. A dry run previews the migration list; it does not prove that all SQL will execute successfully.

## DivePros Example

For [20261025120000_divemaster_directory.sql](../supabase/migrations/20261025120000_divemaster_directory.sql), follow the normal workflow above. The function is callable only by the server's service role, not the browser's anonymous key.

After applying, verify in the intended project's SQL Editor:

```sql
SELECT to_regprocedure('public.list_public_divemasters(text,integer)');
```

The result should be the function signature, not `NULL`. Retry `/for-dive-pros`; no application redeploy is needed when the matching code is already running. If the exact SQL was already applied manually, verify it first and use `migration repair 20261025120000 --status applied --linked` instead of blindly replaying it.

## References

- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [CLI reference](https://supabase.com/docs/reference/cli/introduction): check `db push`, `db pull`, `migration list`, and `migration repair` for your installed version.