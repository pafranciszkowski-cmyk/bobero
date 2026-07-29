# BOBERO — jak wgrać stronę do internetu (krok po kroku)

Masz przed sobą kompletny projekt strony. Niczego nie musisz w nim zmieniać.
Trzy etapy: **GitHub → Vercel → (potem) domena**. Wszystko klikane, bez terminala.

---

## Etap 1: wgraj kod na GitHub (15 min)

1. Zaloguj się na **github.com**
2. Kliknij zielony przycisk **New** (albo plusik ➕ w prawym górnym rogu → **New repository**)
3. W polu *Repository name* wpisz: **bobero**
4. Zostaw zaznaczone **Public**, nic więcej nie zmieniaj → kliknij **Create repository**
5. Na następnej stronie kliknij link **uploading an existing file**
6. Rozpakuj ZIP na komputerze i **przeciągnij na stronę GitHuba całą zawartość folderu bobero** (pliki: package.json, vite.config.js, index.html, .gitignore + folder src)
   - ⚠️ przeciągasz ZAWARTOŚĆ folderu, nie sam folder
   - jeśli robisz to z telefonu: łatwiej będzie z komputera — GitHub na telefonie słabo przyjmuje foldery
7. Na dole strony kliknij zielony przycisk **Commit changes**

Gotowe — kod jest w chmurze.

## Etap 2: uruchom stronę na Vercel (10 min)

1. Wejdź na **vercel.com** → kliknij **Sign Up** → wybierz **Continue with GitHub** (bez nowego hasła!)
2. Po zalogowaniu kliknij **Add New…** → **Project**
3. Na liście zobaczysz repozytorium **bobero** → kliknij przy nim **Import**
4. Vercel sam wykryje, że to projekt Vite — **niczego nie zmieniaj** → kliknij **Deploy**
5. Poczekaj ~1 minutę. Konfetti 🎉 = strona działa
6. Kliknij **Visit** — dostajesz adres typu **bobero.vercel.app**. Otwórz go na telefonie i przetestuj (mapa i GPS tutaj już działają!)

## Etap 3 (po zakupie domeny): podepnij bobero.pl

1. W Vercel: twój projekt → **Settings** → **Domains** → wpisz **bobero.pl** → **Add**
2. Vercel pokaże 2 rekordy DNS (A oraz CNAME)
3. W panelu OVH/home.pl: znajdź **Strefa DNS** swojej domeny i przepisz te 2 rekordy
4. Po 5 min – 24 h strona działa pod bobero.pl

---

## Aktualizacje strony w przyszłości

Nową wersję pliku App.jsx (ode mnie z czatu) wgrywasz tak:
GitHub → repozytorium bobero → folder **src** → klik na **App.jsx** → ikona ołówka ✏️ →
wklej nową zawartość → **Commit changes**. Vercel sam przebuduje stronę w ~1 min.

## Co jest w środku

- `index.html` — strona startowa (tytuł, opis dla Google)
- `src/App.jsx` — cała aplikacja BOBERO
- `src/main.jsx` — uruchamia aplikację
- `package.json`, `vite.config.js` — konfiguracja (nie ruszać)
- Dane użytkowników zapisują się w przeglądarce (localStorage) — do czasu podpięcia Supabase
