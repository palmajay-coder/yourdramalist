# Security policy

This policy covers the YourDramaList V3 public beta in `v3/`. The beta is under active development; security fixes target the latest published V3 source. No independent security audit or response-time guarantee is claimed.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/palmajay-coder/yourdramalist/security/advisories/new). Include the affected version, a description of the issue, impact and reproduction steps using test data.

Do not post API keys, manifest/install URLs, browser storage, OAuth cookies, sensitive screenshots or exploit details in a public issue. If the private report form is unavailable, open an issue asking for a private reporting channel without including sensitive details.

For ordinary bugs, use [Issues](https://github.com/palmajay-coder/yourdramalist/issues).

If a provider API key may have leaked, revoke/rotate that key at the provider. If a self-hosted deployment's manifest encryption secret leaks, its operator must replace it and issue new install links; rotation invalidates existing encrypted links.

See [V3 privacy and key handling](v3/PRIVACY.md) and [self-hosting](v3/DEPLOYMENT.md). Never use another person's live credentials to reproduce an issue.
