You are running the daily automated security and quality audit for F1846/vinyl-marketplace-production.

Your goal is to find and fix the single highest-value, lowest-risk issue in the codebase today. You have full read/write access to the working tree.

## What to audit

Go deep. Inspect every layer:

### Security
- Auth: session handling, cookie flags, timing-safe comparisons, bypass conditions
- API routes: missing auth guards, missing rate limiting, unauthenticated writes
- Input validation: missing schema checks, unsanitized user input reaching DB or HTML
- Secrets: any hardcoded keys, tokens, or credentials in source files
- File uploads: MIME type validation, extension allowlisting, magic byte checks
- Checkout and payment: price tampering, order forgery, webhook signature verification
- Headers: missing CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- SQL: parameterized queries enforced, no string interpolation of user input
- XSS: any dangerouslySetInnerHTML, unescaped output in templates
- Dependencies: run `npm audit` and flag any HIGH or CRITICAL CVEs

### Code quality
- Dead code: unused exports, unreachable branches, obsolete imports
- Logic bugs: off-by-one errors, incorrect status transitions, missing null checks
- Type safety: `any` casts, unsafe non-null assertions (`!`) in critical paths
- Error handling: swallowed errors, missing try/catch on external calls
- Performance: N+1 DB queries, missing indexes for frequent query patterns

### Infrastructure
- CI/CD workflows: pinned action versions, least-privilege permissions, secret usage
- Environment variables: missing from .env.example, undocumented variables
- Database migrations: schema/migration divergence, missing constraints

## Rules

- Implement at most ONE fix per run. Choose the highest severity, most confident fix.
- Prefer targeted, surgical changes. No broad refactors.
- If you fix something, add or update a focused test for it if one is reasonably possible.
- Run offline validation after `npm ci`: prefer `npm run typecheck`, then focused tests.
- Do NOT commit, push, or open PRs. Leave changes in the working tree only.
- Do NOT modify `.github/workflows/**` or `.github/codex/**`.
- Do NOT require production secrets, live payment credentials, or network access.
- Remove all temporary files and debug output before finishing.
- If no safe fix exists today, leave the tree unchanged and report findings only.

## Output format

Return JSON matching the provided schema exactly.

- `result`: one of `fix_applied`, `report_only`, `no_action`
- `branch_topic`: stable kebab-case slug, e.g. `admin-cookie-path` or `checkout-rate-limit`. Reuse the same slug if the same issue recurs.
- `commit_message`: imperative, terse, no prefix
- `pr_title`: must start with `[claude]`
- `pr_body`: full GitHub PR description including:
  - What changed (or why no change was made)
  - The top 5 findings ranked by severity, with: severity level, affected file(s), why it matters, recommended fix
  - Validation performed
  - Explicit review note for Federico (F1846)
- `findings_summary`: 3-8 bullet points of today's most important findings
- `validation_summary`: what was run to validate the fix
- `review_status`: reviewer status string
