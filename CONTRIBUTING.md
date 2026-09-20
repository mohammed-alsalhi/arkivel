# contributing

1. Create a focused branch.
2. Reuse the existing route, helper, or UI primitive before adding code.
3. Keep changes inside the core boundary described in [README.md](README.md).
4. Add the smallest test that proves non-trivial behavior.
5. Update affected docs and version metadata.
6. Run lint, tests, build, and the docs-sync check.

Never include secrets or production data. Never use destructive Prisma commands against an existing database. Schema removals must first be application-only; physical deletion requires a verified backup and restore rehearsal.

Commit messages and pull requests should be concise, detailed, and lowercase.
