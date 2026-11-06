# Security policy

This policy covers the current YourDramaList beta. Security fixes target the latest published source. No independent security audit or response-time guarantee is claimed.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/palmajay-coder/yourdramalist/security/advisories/new). Include the affected version, impact and reproduction steps using test data.

Do not post API keys, install URLs, browser storage, OAuth cookies, sensitive screenshots or exploit details in a public issue. If private reporting is unavailable, open an issue asking for a private channel without sensitive details.

For ordinary bugs, use [Issues](https://github.com/palmajay-coder/yourdramalist/issues).

Revoke leaked provider keys at the provider. A leaked manifest encryption secret must be replaced by the deployment operator, who must then issue new install links.

See [privacy and key handling](PRIVACY.md) and [self-hosting](DEPLOYMENT.md). Never use another person's live credentials to reproduce an issue.
