---
project: "Closet App"
version: 1
status: draft
created: 2026-09-08
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 1
  hard_deadline: "2026-09-14"
  after_hours_only: true
---

## Vision & Problem Statement

Osoba zamawiająca ubrania online, często w zamówieniach zawierających kilka produktów naraz, traci orientację w tym, co zamówiła, co zatrzymuje, a co i kiedy zwraca. Dziś śledzi to ręcznie w arkuszu Excel — jest to męczące i podatne na pomyłki, bo arkusz nie odzwierciedla samodzielnie bieżącego stanu poszczególnych produktów ani całego zamówienia, zwłaszcza gdy decyzja o jednym z produktów zmienia się w czasie (np. najpierw "zatrzymuję", później "jednak oddaję").

Kluczowa obserwacja: status zamówienia nie powinien być polem ustawianym ręcznie, tylko wyliczanym na bieżąco ze statusów poszczególnych produktów, które do niego należą. To coś, czego zwykły arkusz nie robi sam z siebie — trzeba by to ręcznie przeliczać i pilnować przy każdej zmianie, co jest właśnie źródłem męczącej, podatnej na błędy pracy dzisiaj.

## User & Persona

Pojedynczy nazwany użytkownik — sam autor projektu, jedyna osoba korzystająca z aplikacji, jedno konto. Sięga po produkt po tym, jak przyjdzie zamówienie z wieloma produktami i trzeba zacząć podejmować decyzje "zatrzymuję / oddaję" per produkt, a potem pamiętać, na jakim etapie jest każda z tych decyzji i całe zamówienie.

## Success Criteria

### Primary
- Kompletny przepływ od zera do wartości: użytkownik loguje się → dodaje zamówienie z listą produktów (sklep, data, marka, typ, cena, opis, kategoria per produkt) → widzi listę zamówień ze statusem wyliczonym automatycznie z produktów → zmienia status pojedynczego produktu ("zatrzymuję" / "do zwrotu") → status zamówienia przelicza się sam → oznacza produkt jako "zwrot wysłany", gdy fizycznie nada paczkę. Ten przepływ, działający od początku do końca, dowodzi że produkt spełnia swoją rolę.

### Secondary
- Dodatkowy status produktu "zwrot otrzymany" (potwierdzenie przez sklep / zwrot pieniędzy) — rozszerza model danych ponad status "zwrot wysłany", ale nie jest częścią głównego, dowodzącego wartość przepływu. Niższy priorytet niż Primary.

### Guardrails
- Dane zamówień nigdy nie znikają ani nie gubią się przy zmianie statusu produktu.
- Hasło / dane logowania nie są przechowywane jawnie.

## User Stories

### US-01: Użytkownik decyduje o produktach z zamówienia i status zamówienia przelicza się automatycznie

- **Given** zalogowany użytkownik ma zamówienie z kilkoma produktami, każdy w statusie "oczekuje decyzji"
- **When** użytkownik ustawia jeden produkt na "zatrzymany", a drugi na "do zwrotu"
- **Then** status zamówienia automatycznie zmienia się na "gotowe do wysłania zwrotu" (bez ręcznego ustawiania)

#### Acceptance Criteria
- Status zamówienia nigdy nie jest ustawiany ręcznie — zawsze wyliczany z produktów
- Zmiana statusu pojedynczego produktu natychmiast aktualizuje wyświetlany status zamówienia
- Produkt oznaczony jako "zatrzymany" można później zmienić na "do zwrotu" (zawrócenie decyzji)

## Functional Requirements

- FR-001: User can log in with email and password. Priority: must-have
  > Socratic: Counter-argument considered: "single-user app — login is an unnecessary layer since only one person ever uses it." Resolution: kept; login stays as the visible access-control mechanism, a deliberate choice, not a technical necessity for a single user.
- FR-002: User can create a new order with a store, a date, and one or more products (each with brand, type, and price required; description and category optional at creation, editable later). Priority: must-have
  > Socratic: Counter-argument considered: "requiring all fields upfront is too rigid — description/category aren't always known yet." Resolution: revised; description and category are optional at creation and can be filled in later, reducing friction when adding an order.
- FR-003: User can edit an existing order and its products. Priority: nice-to-have
  > Socratic: Counter-argument considered: "this overlaps FR-006/007/008 — status changes already exercise Update for CRUD purposes, making full edit redundant scope for MVP." Resolution: revised; demoted to nice-to-have. CRUD's Update requirement is satisfied by product status changes; editing brand/price/category after creation is a convenience addition, not a certification requirement.
- FR-004: User can delete an order. Priority: must-have
  > Socratic: Counter-argument considered: "deleting without confirmation could lose data that future statistics would need later." Resolution: kept; statistics are out of this MVP's scope entirely, so losing that data isn't a live blocker. No confirmation step added — deliberate simplicity for a single-user tool.
- FR-005: User can view a list of all orders, each showing a status computed automatically from its products' statuses, grouped/sorted so unresolved orders surface before finished ones. Priority: must-have
  > Socratic: Counter-argument considered: "without sorting/filtering by status, the list becomes unreadable as orders accumulate." Resolution: revised; the list groups/sorts unresolved orders first — a cheap default-ordering addition, not a new filtering feature.
- FR-006: User can set a product's status to "kept" or "to be returned" (reversible: kept → to be returned). Priority: must-have
  > Socratic: Counter-argument considered: "unlimited reversal of the decision could mask mistakes instead of surfacing them." Resolution: kept; unrestricted reversal is a deliberate requirement — the user explicitly changes their mind sometimes, and no audit trail is needed for this MVP.
- FR-007: User can mark a product's status as "return shipped", reversible back to "to be returned". Priority: must-have
  > Socratic: Counter-argument considered: "without an undo path, an accidental mark leaves the product stuck in the wrong state." Resolution: revised; added a reverse transition (return shipped → to be returned) symmetric to the one already allowed for "kept" — one more allowed edge in the state machine.
- FR-008: User can mark a product's status as "return received". Priority: nice-to-have
  > Socratic: Counter-argument considered: "no counter-argument; it stands as written." Resolution: kept as nice-to-have, unchanged.

## Non-Functional Requirements

- Dane zamówienia są widoczne wyłącznie dla użytkownika, który je utworzył — żadne inne konto ani dostęp publiczny nie ma do nich wglądu.
- Dane zamówień nie są nigdy automatycznie usuwane — pozostają bezterminowo, dopóki użytkownik sam ich nie skasuje.

## Business Logic

Status zamówienia nigdy nie jest ustawiany bezpośrednio — jest zawsze wyliczany z bieżących statusów jego produktów, na nowo przy każdym odczycie.

Input: bieżący status każdego produktu należącego do zamówienia (w transporcie / oczekuje decyzji / zatrzymany / do zwrotu / zwrot wysłany / zwrot otrzymany).

Output: jedna etykieta statusu na poziomie zamówienia (oczekujące na dostawę / oczekujące na decyzję / gotowe do wysłania zwrotu / zakończone), wybrana wg stałej reguły pierwszeństwa nad statusami produktów.

Spotkanie z użytkownikiem: widoczny na liście zamówień i w widoku szczegółów, aktualizuje się natychmiast po każdej zmianie statusu produktu (także po cofnięciu decyzji), bez ręcznej ingerencji w status zamówienia.

## Access Control

Logowanie przez e-mail i hasło. Jeden użytkownik, model płaski — brak ról ani zróżnicowanych uprawnień. Wszystkie zasoby (zamówienia, produkty) są dostępne wyłącznie po zalogowaniu; brak trybu bez uwierzytelnienia.

## Non-Goals

- Brak integracji z kurierem/sklepem — statusy są ręcznie oznaczane przez użytkownika, aplikacja nie łączy się z żadnym zewnętrznym API sklepu ani firmy kurierskiej.
- Brak statystyk i wykresów (per kategoria/marka/miesiąc) — celowo odłożone poza ten zakres.
- Brak wielu użytkowników / rejestracji — jeden, stały użytkownik zgodnie z ustaloną personą; brak systemu zakładania kont.

## Open Questions

Brak otwartych pytań — sesja `/10x-shape` zamknęła się ze statusem `accepted`, bez zidentyfikowanych luk w żadnym z sześciu obszarów kontrolnych (kontrola dostępu, logika biznesowa, artefakty projektu, koszt harmonogramu, non-goals).
