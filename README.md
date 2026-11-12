# Agmi – wersja webowa (PWA)

Ta sama gra co wersja w Swifcie, ale działa w przeglądarce. Na iPhonie dodajesz ją do ekranu początkowego i uruchamiasz jak zwykłą aplikację – bez Xcode, bez trybu dewelopera i bez odnawiania co 7 dni.

## Pliki

| Plik | Co robi |
|---|---|
| `index.html` | strona gry |
| `logic.js` | zasady, klocki, szukanie rozwiązań, poziom trudności, zapis |
| `audio.js` | dźwięki i muzyka (generowane w kodzie) |
| `game.js` | ekran, przeciąganie, animacje, postacie, menu |
| `manifest.json`, `sw.js` | ikona na ekranie i działanie offline |
| `icons/`, `characters/` | ikona gry i postacie (Kenney „Toon Characters 1”, CC0) |

## Publikacja na GitHub Pages (za darmo)

1. Załóż konto na **github.com** (jeśli nie masz).
2. Kliknij **+** (prawy górny róg) → **New repository**. Nazwa: `agmi`, zaznacz **Public**, kliknij **Create repository**.
3. Na stronie nowego repozytorium kliknij link **uploading an existing file**.
4. Przeciągnij **całą zawartość** folderu `agmi-web` (pliki i foldery `icons`, `characters`) do okna przeglądarki. Poczekaj, aż się wgrają, i kliknij **Commit changes**.
5. Wejdź w **Settings → Pages**. W „Build and deployment” wybierz **Source: Deploy from a branch**, gałąź **main**, folder **/ (root)** i kliknij **Save**.
6. Po ok. minucie na górze tej strony pojawi się adres gry, np. `https://TWOJ-LOGIN.github.io/agmi/`.

## Instalacja na iPhonie

1. Otwórz adres gry w **Safari**.
2. Stuknij **Udostępnij** (kwadrat ze strzałką) → **Do ekranu początkowego** → **Dodaj**.
3. Uruchamiaj grę z ikony. Działa też bez internetu.

## Aktualizacja gry

1. Wgraj zmienione pliki do repozytorium tak samo jak w kroku 3–4 (te same nazwy zastąpią stare).
2. W pliku `sw.js` zmień `VERSION` (np. `agmi-v1` → `agmi-v2`), żeby telefon na pewno pobrał nową wersję.
3. Na iPhonie otwórz grę z internetem – nowa wersja wczyta się sama (czasem po drugim uruchomieniu).

Rekord i zapis gry są w pamięci telefonu i zostają po aktualizacji.
