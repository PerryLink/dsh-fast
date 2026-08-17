# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately through GitHub's private vulnerability reporting:

**https://github.com/YOUR_ORG/dsh-fast/security/advisories/new**

That flow keeps the report confidential while we triage, and it is the channel we watch first.

## Before you report

- **Redact sensitive data** from any logs or session excerpts you attach: tokens, API keys, secrets, Authorization/request headers, personal paths, and account identifiers.
- Include, when possible: the plugin version, the harness (`dsh`) version, Node and OS versions, and the minimal steps to reproduce.

## What to expect

- **Acknowledgment**: within 5 business days.
- **Triage**: within 10 business days we confirm the issue and assess severity, or ask for more details.
- **Fix**: security fixes are prepared in a private fork, released as a patch version, and announced in the release notes.

## Disclosure and credit

- We follow coordinated disclosure: a public advisory (and CVE request where appropriate) is published once a fix ships.
- Reporters are credited in the advisory unless they ask to remain anonymous. There is no bug bounty program at this time.

## Scope

This plugin is a read-only diagnostic. Its guarantees are:

- **Read-only over the session log** — it never mutates model requests, tool results, or the session surface, and it adds no work to the model hot path (folding is O(1) per event; sampling runs on a timer).
- **No network or credentials** — it performs no outbound requests and stores no secrets.
- **Sanitized display and durable data** — control characters are stripped and strings are budgeted; the session working directory is off by default and path-truncated when enabled.
- **Fail-loud configuration** — every tunable is validated at mount.

Vulnerabilities in the harness itself should be reported to the official harness maintainers instead.
