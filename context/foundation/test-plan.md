---
project: "Closet App"
version: 1
status: active
created: 2026-09-11
---

# Test Plan: Closet App

> Cel tego dokumentu: nazwać konkretne ryzyka, które testy automatyczne w tym projekcie mają adresować, i wprost wskazać, który test pokrywa które ryzyko. Nie jest to ogólny opis strategii testowania — to mapowanie 1:1 ryzyko → test.

## Kontekst

Rdzeniem produktu (patrz `context/foundation/prd.md`, `## Business Logic`) jest to, że status zamówienia **nigdy nie jest ustawiany ręcznie** — jest zawsze wyliczany automatycznie na podstawie statusów poszczególnych produktów w zamówieniu (`src/lib/services/order-status.ts`). To jedyna rzecz, która odróżnia tę aplikację od arkusza Excel, który użytkownik prowadził wcześniej: w Excelu stan zamówienia trzeba było aktualizować ręcznie i łatwo było o pomyłkę. Jeśli ta reguła wyliczania jest zaimplementowana błędnie, produkt nie spełnia swojej głównej obietnicy — dlatego to właśnie ta logika jest przedmiotem tego test planu.

## Ryzyko 1: Błędna kolejność priorytetu w `computeOrderStatus` maskuje zamówienie wymagające uwagi

**Opis ryzyka**: `computeOrderStatus` wylicza jeden status zamówienia z listy statusów jego produktów, według ustalonego priorytetu (`in_transit` > `awaiting_decision` > `to_be_returned` > reszta = `completed`). Jeśli ta kolejność priorytetu jest błędna lub niekompletna, zamówienie które faktycznie wymaga uwagi użytkownika (np. jeden produkt wciąż jest w drodze, albo czeka na decyzję "zatrzymuję/zwracam") mogłoby zostać pokazane jako `completed` i zniknąć z sekcji "Active" na liście zamówień. Użytkownik przestałby je śledzić, mimo że sprawa nie jest zamknięta — dokładnie ten scenariusz, przed którym miał chronić przejście z arkusza Excel na tę aplikację.

**Testy adresujące to ryzyko**: `src/lib/services/order-status.test.ts`, blok `describe("computeOrderStatus", ...)` (linie 5-26), 5 testów:

- `returns completed for an empty item list` — przypadek brzegowy (brak produktów).
- `returns completed when every item is kept or return_shipped` — stan faktycznie zakończony.
- `returns ready_for_return when any item is to_be_returned` — pojedynczy produkt do zwrotu podnosi status całego zamówienia.
- `returns awaiting_decision when any item is awaiting_decision, even alongside to_be_returned` — weryfikuje kolejność priorytetu między dwoma niezakończonymi stanami.
- `returns awaiting_delivery when any item is in_transit, overriding every other status` — weryfikuje najwyższy priorytet (produkt w drodze nadpisuje wszystkie inne statusy, łącznie z `to_be_returned` i `awaiting_decision` w tym samym zamówieniu).

## Ryzyko 2: Niedozwolone przejście statusu produktu psuje spójność cyklu życia produktu (i przez to wyliczony status zamówienia)

**Opis ryzyka**: Status produktu zmienia się przez `updateItemStatus`, które akceptuje zmianę tylko jeśli `isValidTransition` zwróci `true`. Gdyby ta funkcja błędnie pozwalała na przejścia pomijające krok cyklu życia (np. `kept -> return_shipped` bez przejścia przez `to_be_returned`) albo na cofnięcie się ze stanu, który powinien być końcowy (np. `return_received -> kept`), dane produktu przestałyby odzwierciedlać realny stan fizycznej przesyłki. Ponieważ status zamówienia jest wyliczany właśnie z tych statusów (Ryzyko 1), zepsuty stan produktu prowadzi wprost do błędnego, mylącego statusu całego zamówienia.

**Testy adresujące to ryzyko**: `src/lib/services/order-status.test.ts`, blok `describe("isValidTransition", ...)` (linie 28-50), 8 testów:

- 5 przypadków sparametryzowanych (`it.each`) potwierdzających każde dozwolone przejście: `awaiting_decision -> kept`, `awaiting_decision -> to_be_returned`, `kept -> to_be_returned`, `to_be_returned -> return_shipped`, `return_shipped -> to_be_returned` (cofnięcie decyzji o wysłanym zwrocie, zgodnie z FR-007).
- `rejects skipping a step (kept -> return_shipped)` — pilnuje, że nie da się pominąć kroku cyklu życia.
- `rejects moving out of a terminal-ish state (return_received -> kept)` — pilnuje, że stan "zwrot otrzymany" jest faktycznie końcowy.
- `rejects any transition out of in_transit (no FR reaches it in this slice)` — pilnuje, że produkt w drodze nie może zmienić statusu z pominięciem procesu dostawy.

## Co świadomie NIE jest tu pokryte

- Warstwa RLS/autoryzacji (`updateItemStatus`, `deleteOrder` w `src/lib/services/orders.ts`) nie ma dedykowanych testów jednostkowych — polega na Postgresowych politykach RLS (`supabase/migrations/`) zweryfikowanych manualnie podczas implementacji (S-02 impl-review, finding F1) oraz na jawnym sprawdzeniu właściciela w kodzie aplikacji. Uznane za akceptowalne ryzyko dla narzędzia jednoosobowego w skali MVP.
- Warstwa UI (formularze, przyciski) nie ma testów automatycznych — weryfikowana manualnie przy każdej fazie implementacji (patrz `context/archive/*/plan.md`, sekcje Manual Verification).

## Jak uruchomić

```bash
npm test -- --run
```

13/13 testów, `src/lib/services/order-status.test.ts` — jedyny plik testowy w projekcie, w całości adresujący Ryzyko 1 i Ryzyko 2 powyżej.
