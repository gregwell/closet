---
project: "Closet App"
version: 1
status: draft
created: 2026-09-09
updated: 2026-09-09
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: first-order-tracker-mvp
milestone_seq: 1
milestone_status: open
---

# Roadmap: Closet App

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: First usable order/return tracker** — Status: open

- **Intent:** Ship the smallest complete order/return tracker that proves automatic status computation beats manual Excel tracking, end-to-end from login to marking a return as shipped.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001–FR-008, US-01, both PRD NFRs, Access Control section.

## Vision recap

Ktoś zamawiający ubrania online w zamówieniach z wieloma produktami traci orientację w tym, co zatrzymuje, a co zwraca — dziś śledzi to ręcznie w Excelu. Kluczowa obserwacja: status zamówienia powinien być wyliczany automatycznie ze statusów jego produktów, nie ustawiany ręcznie.

## North star

**S-02: User can create an order and see its status computed automatically** — to jest jedyny User Story w PRD i dokładnie ta reguła, która odróżnia appkę od arkusza Excel; udowadnia to głównemu celowi (`speed`), że warto było to zbudować.

> "Gwiazda przewodnia" (north star) oznacza tu: najmniejszy kompletny przepływ, którego udane dostarczenie dowodzi głównej hipotezy produktu — umieszczony tak wcześnie, jak pozwalają na to jego zależności, bo reszta ma znaczenie tylko wtedy, gdy to działa.

## At a glance

| ID   | Change ID                  | Outcome (user can …)                                                              | Prerequisites | PRD refs                  | Status   |
| ---- | --------------------------- | ----------------------------------------------------------------------------------- | -------------- | -------------------------- | -------- |
| F-01 | order-data-schema           | (foundation) schemat danych zamówień/produktów istnieje z RLS per właściciel        | —              | NFR (prywatność), Access Control | in-progress |
| S-01 | user-login                  | loguje się i trafia do swojej przestrzeni w appce                                    | —              | FR-001                     | ready    |
| S-02 | order-status-computation    | tworzy zamówienie z produktami i widzi status wyliczany automatycznie przy decyzjach | F-01           | FR-002, FR-005, FR-006, US-01 | proposed |
| S-03 | mark-return-shipped         | oznacza produkt jako "zwrot wysłany" (z możliwością cofnięcia)                       | S-02           | FR-007                     | proposed |
| S-04 | delete-order                | usuwa zamówienie, którego już nie chce śledzić                                       | S-02           | FR-004                     | proposed |

## Streams

Pomoc nawigacyjna — grupuje elementy dzielące ten sam łańcuch zależności. Kanoniczna kolejność nadal żyje w grafie zależności poniżej.

| Stream | Theme                          | Chain                      | Note                                                              |
| ------ | ------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| A      | Śledzenie zamówień (główna ścieżka) | `F-01` → `S-02` → `S-03`, `S-04` | `S-03` i `S-04` to dwie równoległe gałęzie po `S-02` — obie zależą tylko od niego, nie od siebie nawzajem. |
| B      | Dostęp                          | `S-01`                      | Samodzielny, może iść równolegle do Stream A — brak wspólnych zależności. |

## Baseline

Stan repo na `2026-09-09` (auto-zbadane w sesji bootstrapu + potwierdzone przez użytkownika). Fundamenty poniżej zakładają, że to jest obecny stan, i go nie odtwarzają.

- **Frontend:** present — Astro 6 + React 19 islands, Tailwind 4 (`astro.config.mjs`, `src/components/`).
- **Backend / API:** present — endpointy auth (`src/pages/api/auth/{signin,signup,signout}.ts`).
- **Data:** absent — brak `supabase/migrations/`; istnieje tylko wbudowana tabela `auth.users`, żadnej tabeli domenowej (zamówienia/produkty).
- **Auth:** present — Supabase SSR client (`src/lib/supabase.ts`), `src/middleware.ts` z `PROTECTED_ROUTES`, gotowe strony signin/signup/confirm-email.
- **Deploy / infra:** present — `wrangler.jsonc`, `.github/workflows/ci.yml` (lint + build na push/PR).
- **Observability:** absent — brak Sentry/logowania/metryk; PRD nie wymaga tego jako NFR, więc nie tworzymy fundamentu.

## Foundations

### F-01: Schemat danych zamówień/produktów + RLS

- **Outcome:** (foundation) w bazie istnieje minimalny schemat tabel zamówień i produktów, z RLS ograniczającym dostęp do wierszy należących do zalogowanego użytkownika.
- **Change ID:** order-data-schema
- **PRD refs:** NFR ("dane zamówienia są widoczne wyłącznie dla użytkownika, który je utworzył"), `## Access Control`
- **Unlocks:** S-02, S-03, S-04
- **Prerequisites:** —
- **Parallel with:** S-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Bez RLS od początku, domklejenie prywatności później ryzykowałoby wyciek danych między kontami, gdyby kiedyś doszedł drugi użytkownik; minimalny schemat teraz unika przeprojektowania, zanim pierwszy slice zweryfikuje, że kształt danych jest właściwy.
- **Status:** in-progress

## Slices

### S-01: Użytkownik może się zalogować

- **Outcome:** użytkownik loguje się e-mailem i hasłem i trafia do swojej przestrzeni w appce.
- **Change ID:** user-login
- **PRD refs:** FR-001
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** W dużej mierze gotowe dzięki starterowi (strony i middleware auth już istnieją) — głównym ryzykiem jest dopięcie przekierowań do właściwych stron tej appki, nie budowa auth od zera.
- **Status:** ready

### S-02: Użytkownik tworzy zamówienie i widzi status wyliczany automatycznie

- **Outcome:** użytkownik tworzy zamówienie z produktami i widzi status zamówienia przeliczający się automatycznie w miarę ustawiania statusu każdego produktu ("zatrzymany" / "do zwrotu", z możliwością zawrócenia decyzji).
- **Change ID:** order-status-computation
- **PRD refs:** FR-002, FR-005, FR-006, US-01
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** To jest główna hipoteza całego produktu — jeśli reguła wyliczania statusu nie sprawdzi się w realnym użyciu, kolejne slice'y (wysłanie zwrotu, usuwanie) też wymagałyby przeróbki, więc zweryfikowanie tego najpierw jest najbardziej dźwigniowym ruchem pod `speed`.
- **Status:** proposed

### S-03: Użytkownik oznacza produkt jako wysłany do zwrotu

- **Outcome:** użytkownik oznacza produkt ze statusem "do zwrotu" jako "zwrot wysłany", z możliwością cofnięcia tego oznaczenia.
- **Change ID:** mark-return-shipped
- **PRD refs:** FR-007
- **Prerequisites:** S-02
- **Parallel with:** S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Zależy tylko od istnienia pola statusu z S-02; poza tym niskie ryzyko, to dodatkowa tranzycja statusu, nie nowa logika.
- **Status:** proposed

### S-04: Użytkownik usuwa zamówienie

- **Outcome:** użytkownik usuwa zamówienie, którego nie chce już śledzić.
- **Change ID:** delete-order
- **PRD refs:** FR-004
- **Prerequisites:** S-02
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Akcja nieodwracalna bez potwierdzenia, zgodnie ze świadomą decyzją z PRD o prostocie dla jednoosobowego narzędzia — niskie ryzyko przy tej skali.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                | Suggested issue title                                      | Ready for `/10x-plan` | Notes |
| ---------- | -------------------------- | -------------------------------------------------------------- | ---------------------- | ----- |
| F-01       | order-data-schema           | Add order/product schema with per-user RLS                     | yes                    | — |
| S-01       | user-login                  | Wire login flow to app-specific redirect targets                | yes                    | — |
| S-02       | order-status-computation    | Create order + auto-computed status from product decisions      | no                      | Czeka na F-01 |
| S-03       | mark-return-shipped         | Mark product return as shipped (reversible)                     | no                      | Czeka na S-02 |
| S-04       | delete-order                | Delete an order                                                  | no                      | Czeka na S-02 |

## Open Roadmap Questions

Brak — PRD nie ma otwartych pytań, a wywiad nie ujawnił nowych kwestii przekrojowych.

## Parked

- **FR-003 (edycja zamówienia/produktów po utworzeniu)** — Why parked: nice-to-have; wymóg CRUD "Update" jest już spełniony przez zmiany statusu (S-02/S-03), a pełna edycja to wygoda, nie wymóg — odłożone pod `speed`.
- **FR-008 (oznaczenie "zwrot otrzymany")** — Why parked: Secondary success criterion w PRD, jawnie niższy priorytet niż Primary — odłożone pod `speed`.
- **Brak integracji z kurierem/sklepem** — Why parked: PRD `## Non-Goals` — statusy ręczne, zero integracji zewnętrznych.
- **Statystyki i wykresy (per kategoria/marka/miesiąc)** — Why parked: PRD `## Non-Goals` — celowo poza zakresem.
- **Wielu użytkowników / rejestracja** — Why parked: PRD `## Non-Goals` — jeden, stały użytkownik.

## Milestone History

(puste — to pierwszy milestone)

## Done

(puste — nic jeszcze nie zostało zarchiwizowane)
