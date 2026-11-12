# Agmi – wersja webowa (PWA)

Gra: https://plokijro.github.io/agmi-game/

## Pliki

| Plik | Co robi |
|---|---|
| `index.html` | strona gry |
| `logic.js` | zasady, klocki, szukanie rozwiązań, poziom trudności, zapis |
| `audio.js` | dźwięki i muzyka (generowane w kodzie) |
| `game.js` | ekran, przeciąganie, animacje, postacie, menu |
| `manifest.json`, `sw.js` | ikona na ekranie i działanie offline |
| `icons/`, `characters/` | ikona gry i postacie (Kenney „Toon Characters 1”, CC0) |

## Instalacja na iPhonie

1. Otwórz adres gry w **Safari**.
2. Stuknij **Udostępnij** (kwadrat ze strzałką) → **Do ekranu początkowego** → **Dodaj**.
3. Uruchamiaj grę z ikony. Działa też bez internetu.

## Aktualizacja gry

1. Wgraj zmienione pliki do repozytorium (**Add file → Upload files**) – pliki o tych samych nazwach zastąpią stare.
2. W pliku `sw.js` zmień `VERSION` (np. `agmi-v1` → `agmi-v2`), żeby telefon na pewno pobrał nową wersję.
3. Na iPhonie otwórz grę z internetem – nowa wersja wczyta się sama (czasem po drugim uruchomieniu).

Rekord i zapis gry są w pamięci telefonu i zostają po aktualizacji.
