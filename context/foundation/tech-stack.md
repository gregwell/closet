---
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
---

## Why this stack

A solo user building a personal order/returns tracker in 1 week of after-hours work needs auth and persistent data out of the box, with minimal setup friction. 10x-astro-starter is the recommended default for `(web, js)` and ships Supabase (Postgres + auth) and Cloudflare edge deploy as one pinned, agent-friendly stack — it clears all four agent-friendly gates (typed, convention-based, popular in training data, well-documented), and its bootstrapper confidence is first-class. `has_auth` is set per FR-001 (login); payments, realtime, AI, and background jobs are all out of scope per the PRD's Non-Goals. Deployment defaults to cloudflare-pages, the starter's own default. CI runs on GitHub Actions with auto-deploy-on-merge, matching the solo/after-hours profile.
