You are running the scheduled "Continuous Repo Check" audit for F1846/vinyl-marketplace-production.

Audit the current checkout for supported security, privacy, broken-logic, and high-value code-quality risks. Inspect auth, admin actions, API routes, checkout/order/payment flows, DB and ORM usage, input validation, uploads, secrets, logging, email flows, integrations, headers, dependency risk, and build/deploy config.

Operating rules:
- Implement at most one fix, and only if it is the safest high-value change you can complete confidently in this run.
- Prefer targeted, low-blast-radius fixes over broad refactors.
- Add or update focused tests when you implement a fix.
- Run relevant local validation that works offline after `npm ci`. Prefer `npm run typecheck`, focused tests, or targeted script invocations.
- Do not commit, push, or open pull requests. Leave changes in the working tree only.
- Do not modify `.github/workflows/**` or `.github/codex/**` from this automation. Report workflow or deploy findings in the PR body instead of self-editing the automation.
- Avoid changes that require production secrets, live payment credentials, real email delivery, or outbound network access.
- Remove temporary files, generated artifacts, and debug output before finishing.
- If there is no safe fix to apply, leave the working tree unchanged and report findings only.

Output requirements:
Return JSON that matches the provided schema exactly.

- `result` must be one of `fix_applied`, `report_only`, or `no_action`.
- `branch_topic` must be a stable kebab-case topic such as `order-number-entropy` or `email-html-escaping`. Reuse the same topic if the same underlying issue is addressed again.
- `commit_message` must be a terse commit summary without a `[codex]` prefix.
- `pr_title` must start with `[codex]`.
- `pr_body` must be ready to paste into a GitHub PR description and include:
  - what changed, or why no code change was made
  - ranked findings with severity, confidence, affected files, why they matter, and recommended fixes
  - validation performed, or why validation was limited
  - explicit review status for Federico (`F1846`)
