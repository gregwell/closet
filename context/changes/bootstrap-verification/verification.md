---
bootstrapped_at: 2026-09-08T11:21:02Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: closet
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: closet
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

**Why this stack**: A solo user building a personal order/returns tracker in 1 week of after-hours work needs auth and persistent data out of the box, with minimal setup friction. 10x-astro-starter is the recommended default for `(web, js)` and ships Supabase (Postgres + auth) and Cloudflare edge deploy as one pinned, agent-friendly stack — it clears all four agent-friendly gates, and its bootstrapper confidence is first-class. `has_auth` is set per FR-001 (login); payments, realtime, AI, and background jobs are all out of scope per the PRD's Non-Goals. Deployment defaults to cloudflare-pages, the starter's own default. CI runs on GitHub Actions with auto-deploy-on-merge, matching the solo/after-hours profile.

## Pre-scaffold verification

| Signal             | Value                              | Severity | Notes                              |
| ------------------ | ----------------------------------- | -------- | ----------------------------------- |
| npm package        | not run                             | n/a      | `cmd_template` starts with `git clone` — no npm package to resolve |
| GitHub repo        | not run                             | n/a      | `gh` CLI not available on this machine — recency check unavailable |

Heads-up (separate from recency): local Node is `v20.19.4`; several packages in this starter (astro@6.3.1, wrangler@4.90.0, @astrojs/react, @cloudflare/kv-asset-handler) declare `engines` requiring Node ≥22. `npm install` completed anyway (exit code 0, `EBADENGINE` warnings only) — flagging for follow-up before running `npm run dev` / `build`.

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 18 top-level entries (`.env.example`, `.github/`, `.husky/`, `.nvmrc`, `.prettierrc.json`, `.vscode/`, `README.md`, `astro.config.mjs`, `components.json`, `eslint.config.js`, `node_modules/`, `package-lock.json`, `package.json`, `public/`, `src/`, `supabase/`, `tsconfig.json`, `wrangler.jsonc`)
**Conflicts (.scaffold siblings)**: `CLAUDE.md.scaffold` (existing `CLAUDE.md` from the 10x-cli lesson packages was kept)
**.gitignore handling**: append-merged (cwd's 3 lines kept first, scaffold's patterns de-duped and appended under a `# from 10x-astro-starter` comment)
**.bootstrap-scaffold cleanup**: deleted (including cloned `.git/`, removed before move-up per git-clone strategy)

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 1 CRITICAL, 14 HIGH, 7 MODERATE, 3 LOW
**Direct vs transitive**: not distinguished per-severity by this tool's summary; overall 3 of 25 affected packages are direct dependencies, 22 transitive. All 25 findings report a fix available (`npm audit fix`).

#### CRITICAL findings

- `tar` (transitive, range `<=7.5.20`) — multiple advisories: PAX header parsing differential (file smuggling), process crash via numeric path type confusion, decompression DoS, infinite loop via negative entry size, NUL-byte uncaught exception, uncontrolled recursion stack-overflow DoS. Fix available.

#### HIGH findings

- `astro` (direct, `<=7.0.9`) — multiple XSS advisories (unescaped spread attribute names, `transition:*` directive values, View Transition animation properties, unescaped slot name) and a Host-header SSRF in the prerendered error page fetch. Fix available.
- `brace-expansion` (transitive, `<=1.1.17 || 3.0.0-5.0.8`) — exponential-time / unbounded-memory DoS via crafted `{}` groups. Fix available.
- `browserslist` (transitive, `<=4.28.6`) — unbounded memory growth (no cache eviction); crash/prototype-write via untrusted stats file. Fix available.
- `devalue` (transitive, `5.6.3-5.8.0`) — DoS via sparse array deserialization. Fix available.
- `fast-uri` (transitive, `3.0.0-3.1.5`) — host confusion / SSRF via malformed authority and IPv6/percent-decoding handling. Fix available.
- `js-yaml` (transitive, `4.0.0-4.3.0`) — quadratic-complexity DoS via merge-key/alias chains and `!!omap` resolution. Fix available.
- `miniflare` (transitive) — inherits `sharp`/`undici`/`ws` advisories below. Fix available.
- `nanoid` (transitive, `<=3.3.17`) — non-secure generator can loop indefinitely on negative/zero size. Fix available.
- `postcss` (transitive, `<=8.5.22`) — path traversal / arbitrary `.map` file disclosure via `sourceMappingURL`. Fix available.
- `sharp` (transitive, `<0.35.0`) — inherited libvips CVEs. Fix available.
- `svgo` (transitive, `4.0.0-4.0.1`) — `removeScripts` plugin leaves some executable scripts intact. Fix available.
- `undici` (transitive, `7.0.0-7.28.0`) — TLS validation bypass via SOCKS5 proxy, header-injection, cache/cookie desync issues (11 related advisories). Fix available.
- `vite` (transitive, `7.0.0-7.3.3`) — `server.fs.deny` bypass on Windows; NTLMv2 hash disclosure via `launch-editor`. Fix available.
- `ws` (transitive, `8.0.0-8.20.1`) — uninitialized memory disclosure; memory-exhaustion DoS via tiny fragments. Fix available.

#### MODERATE findings

7 findings, log-only per policy — full detail available via `npm audit` in the project directory. Notable: `@astrojs/language-server` (dev-only, IDE tooling), `@cloudflare/vite-plugin` (dev-only).

#### LOW / INFO findings

3 findings, log-only per policy — `@babel/core` among them (arbitrary file read via `sourceMappingURL`, dev-time only). Full detail via `npm audit`.

## Hints recorded but not acted on

| Hint                       | Value                              |
| --------------------------- | ----------------------------------- |
| bootstrapper_confidence    | first-class                        |
| quality_override           | false                               |
| path_taken                 | standard                           |
| self_check_answers         | null                                |
| team_size                  | solo                                |
| deployment_target          | cloudflare-pages                   |
| ci_provider                | github-actions                     |
| ci_default_flow            | auto-deploy-on-merge               |
| has_auth                   | true                                |
| has_payments                | false                               |
| has_realtime                | false                               |
| has_ai                      | false                               |
| has_background_jobs         | false                               |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- Upgrade local Node to ≥22 before running `npm run dev` / `build` (several packages declare this as a hard `engines` requirement).
- Review `CLAUDE.md.scaffold` and decide what (if anything) to merge into the existing `CLAUDE.md`.
- Run `npm audit fix` and re-check — all 25 findings report a fix available.
- Address the remaining audit findings per your risk tolerance; the full breakdown is in this log.
