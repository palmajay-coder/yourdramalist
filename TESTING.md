# Testing YourDramaList

The production environment is Val Town's Deno runtime. Existing `*.test.ts` files are executable assertion suites, not `Deno.test()` registrations.

## Offline public suite

Install Deno 2 from its official distribution, then run from the repository root:

```sh
deno run --no-check --allow-read --allow-env --import-map=tests/import_map.json tests/run-tests.ts
```

Module dependencies are downloaded by Deno. Test execution does not receive general network access. The import map replaces Val Town blob/OAuth/asset utilities with test-only adapters so tests can execute outside the hosting platform. It is **not** a production import map. OAuth and asset/hosting integration require separate live verification.

The suite checks parser behavior, source restrictions, caching, concurrency limits, preferences/credential whitelists, encrypted configuration round trips, catalog order/filtering, original review payloads, and browser-script syntax. Public fixtures are synthetic and inert. Never add a full browser Save Page capture or a real install link to a fixture.

GitHub Actions runs the same command for YourDramaList changes. Runtime tests use `--no-check` because the inherited JavaScript-style modules are not all strictly type-checked; a green check is not a claim of full TypeScript or security verification.

## Live verification already performed during development

- Preferences/Confirm browser interactions, Copy/Copied, source selection preservation, light/dark themes and mobile layout.
- Live manifest HTTP 200 and resource declarations.
- Direct-list, Japan country catalog and actor/director catalog endpoints returned mapped titles.
- Goblin returned the rating card, viewer verdict and five reviews.
- Classic Blue icon endpoint returned PNG, with a 256×256 source asset.

An actual Nuvio installation/playback and real ERDB output with a valid visitor key pair were not performed in this release review. No production API key, OAuth session or configuration-token secret is supplied to CI.

Drama-search tests use synthetic responses and a fake clock to check input validation, parsing, cache reuse/expiry, request coalescing, concurrency and minute quotas, upstream cooldowns, response-size limits, failure recovery, and the dismissible floating retry notice. Browser preview checks can force a 429 on a temporary test endpoint without generating excess MDL requests; no forced-error switch is deployed to the main app.
