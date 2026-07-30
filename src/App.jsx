import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

/* ---------------- Supabase (prawdziwe logowanie/rejestracja) ---------------- */
const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   );

/* ==================================================================
   BOBERO v2 — porównywarka materiałów budowlanych (afiliacja)
   - Prawdziwe produkty i ceny z Castorama / Leroy Merlin / OBI
     (zebrane 01.07.2026 — ceny orientacyjne, mogą się zmienić)
   - Panel administratora: sieci afiliacyjne, produkty, oferty,
     generator linków, dziennik kliknięć, statystyki prowizji
   - Dane trwałe przez window.storage (jeśli dostępne)
   ================================================================== */

/* ---------------- konfiguracja domyślna sieci afiliacyjnych ---------------- */
const DEFAULT_NETWORKS = {
  Castorama: {
    network: "Tradedoubler",
    programId: "",
    affiliateId: "",
    template: "https://clk.tradedoubler.com/click?p={programId}&a={affiliateId}&url={url}",
    commission: 4.0,
    active: true,
  },
  "Leroy Merlin": {
    network: "Admitad",
    programId: "",
    affiliateId: "",
    template: "https://ad.admitad.com/g/{programId}/?ulp={url}&subid={affiliateId}",
    commission: 4.0,
    active: true,
  },
  OBI: {
    network: "Awin",
    programId: "",
    affiliateId: "",
    template: "https://www.awin1.com/cread.php?awinmid={programId}&awinaffid={affiliateId}&ued={url}",
    commission: 3.5,
    active: true,
  },
};

const STORE_LOCATORS = {
  'Castorama': 'https://www.castorama.pl/sklepy',
  'Leroy Merlin': 'https://www.leroymerlin.pl/sklepy',
  'OBI': 'https://www.obi.pl/sklepy',
  'Bauhaus': 'https://www.bauhaus.pl/sklepy',
  'Hornbach': 'https://www.hornbach.pl/sklepy',
  'Bricomarche': 'https://www.bricomarche.pl/sklepy',
  'Hutte': 'https://www.hutte.pl/sklepy',
  'praktiker': 'https://www.praktiker.pl/sklepy',
};


/* ---------------- prawdziwe produkty (zebrane 01.07.2026) ----------------
   Każda oferta ma prawdziwy adres strony produktu w sklepie.
   Cena null = cena niepotwierdzona; uzupełnisz w panelu admina.        */
const REAL_PRODUCTS = [
  {
    id: "atlas-geoflex-225", name: "Wysokoelastyczny klej żelowy Atlas Geoflex C2TE 22,5 kg",
    cat: "Kleje do płytek", brand: "Atlas", unit: "szt", rating: 4.1, reviews: 31,
    features: ["C2TE", "Żelowy", "Ogrzewanie podłogowe", "Wewnątrz i na zewnątrz"],
    badge: "Bestseller",
    desc: "Wysokoelastyczny klej żelowy klasy C2TE. Formuła żelowa ułatwia rozprowadzanie i pozwala kleić „na świeżo\" bez osuwania płytek ze ścian. Do gresu, terakoty i klinkieru.",
    uses: ["Ściany i podłogi wewnątrz i na zewnątrz", "Ogrzewanie podłogowe", "Balkony i tarasy", "Płytki gresowe i klinkierowe"],
    specs: ["Klasa: C2TE", "Waga: 22,5 kg", "Zużycie: ok. 1,5 kg/m² na 1 mm warstwy", "Czas otwarty: ok. 30 min", "Fugowanie: po ok. 24 h"],
    offers: [
      { s: "Castorama", p: 49.98, url: "https://www.castorama.pl/wysokoelastyczny-klej-zelowy-atlas-geoflex-c2te-22-5-kg/5905400358414_CAPL.prd" },
    ],
  },
  {
    id: "atlas-zaprawa-225", name: "Zaprawa klejowa uelastyczniona Atlas 22,5 kg",
    cat: "Kleje do płytek", brand: "Atlas", unit: "szt", rating: 4.4, reviews: 14,
    features: ["Uelastyczniona", "Ściany i podłogi"],
    desc: "Uelastyczniona zaprawa klejowa do płytek ceramicznych na stabilne podłoża mineralne. Ekonomiczny wybór do standardowych formatów wewnątrz budynku.",
    uses: ["Ściany i podłogi wewnątrz", "Płytki ceramiczne i terakota", "Podłoża betonowe i jastrychy"],
    specs: ["Waga: 22,5 kg", "Zużycie: ok. 1,4 kg/m²/mm", "Fugowanie: po ok. 24 h"],
    offers: [
      { s: "Castorama", p: 31.98, url: "https://www.castorama.pl/plytki-i-podlogi/akcesoria-do-plytek/kleje-do-plytek.cat" },
    ],
  },
  {
    id: "atlas-geoflex-ultra", name: "Klej do płytek Atlas Geoflex Ultra 22,5 kg",
    cat: "Kleje do płytek", brand: "Atlas", unit: "szt", rating: 4.3, reviews: 13,
    features: ["Żelowy", "Duże formaty", "S1"],
    desc: "Żelowy klej odkształcalny (S1) do najbardziej wymagających zastosowań: wielkie formaty, płyta na płytę, tarasy. Wydłużony czas otwarty ułatwia korektę.",
    uses: ["Duże formaty i płyty gresowe", "Klejenie płytka na płytkę", "Tarasy i balkony", "Ogrzewanie podłogowe"],
    specs: ["Klasa: C2TE S1", "Waga: 22,5 kg", "Zużycie: ok. 1,5 kg/m²/mm", "Odkształcalność: S1"],
    offers: [
      { s: "Castorama", p: 69.98, url: "https://www.castorama.pl/plytki-i-podlogi/akcesoria-do-plytek/kleje-do-plytek.cat" },
      { s: "Leroy Merlin", p: 69.99, note: "wariant 22,5+2,5 kg", url: "https://www.leroymerlin.pl/produkty/zaprawa-klejowa-plus-atlas-45157175.html" },
    ],
  },
  {
    id: "atlas-plus-20", name: "Klej Atlas Plus Nowy 20 kg",
    cat: "Kleje do płytek", brand: "Atlas", unit: "szt", rating: 4.8, reviews: 10,
    features: ["Wysokoelastyczny", "Odkształcalny", "Ogrzewanie podłogowe"],
    badge: "Najwyżej oceniany",
    desc: "Wysokoelastyczny klej odkształcalny o podwyższonej przyczepności. Do trudnych podłoży i miejsc narażonych na odkształcenia.",
    uses: ["Ogrzewanie podłogowe", "Stare płytki i trudne podłoża", "Wewnątrz i na zewnątrz"],
    specs: ["Klasa: C2TE S1", "Waga: 20 kg", "Zużycie: ok. 1,5 kg/m²/mm"],
    offers: [
      { s: "Castorama", p: 64.98, url: "https://www.castorama.pl/klej-atlas-plus-nowy-20-kg/5905400488562_CAPL.prd" },
    ],
  },
  {
    id: "atlas-plus-25", name: "Zaprawa klejowa Atlas Plus 25 kg (odkształcalna)",
    cat: "Kleje do płytek", brand: "Atlas", unit: "szt", rating: 4.7, reviews: 17,
    features: ["C2TE", "S1", "Na OSB i stare płytki", "Tarasy i balkony"],
    desc: "Flagowa odkształcalna zaprawa klejowa Atlas (C2TE S1). Klei niemal każdą okładzinę na niemal każdym podłożu — także na OSB, starych płytkach i ogrzewaniu podłogowym.",
    uses: ["Płyty OSB i podłoża krytyczne", "Klejenie na starych płytkach", "Tarasy i balkony", "Ogrzewanie podłogowe"],
    specs: ["Klasa: C2TE S1", "Waga: 25 kg", "Zużycie: ok. 1,5 kg/m²/mm", "Przyczepność: ≥ 1 N/mm²"],
    offers: [
      { s: "Castorama", p: 63.98, url: "https://www.castorama.pl/klej-wysokoelastyczny-atlas-plus-odksztalcalny-25-kg/5905400658866_CAPL.prd" },
      { s: "Leroy Merlin", p: 63.99, url: "https://www.leroymerlin.pl/produkty/zaprawa-klejowa-plus-25-kg-atlas-45634631.html" },
    ],
  },
  {
    id: "gres-lapis-60", name: "Gres szkliwiony Lapis 60×60 Greenline Tiles",
    cat: "Płytki gres", brand: "Greenline Tiles", unit: "m²", rating: 4.5, reviews: 34,
    features: ["60×60", "Szkliwiony", "Promocja"],
    badge: "Promocja −43%",
    desc: "Gres szkliwiony w formacie 60×60 cm o kamiennym wzorze. Uniwersalny format do salonów, kuchni i łazienek.",
    uses: ["Podłogi wewnątrz", "Salon i kuchnia", "Łazienka"],
    specs: ["Format: 60×60 cm", "Wykończenie: szkliwione", "Antypoślizgowość: R9"],
    offers: [
      { s: "Leroy Merlin", p: 39.97, oldP: 69.99, url: "https://www.leroymerlin.pl/produkty/wykonczenie-wnetrz/plytki-scienne-i-podlogowe/plytki-podlogowe/gres/gres-szkliwiony/plytki-60-x-60-p.html" },
    ],
  },
  {
    id: "gres-calacatta-silver", name: "Gres szkliwiony Calacatta Silver 60×60 Artens",
    cat: "Płytki gres", brand: "Artens", unit: "m²", rating: 4.5, reviews: 85,
    features: ["60×60", "Imitacja marmuru", "Do łazienki"],
    badge: "Bestseller",
    desc: "Gres imitujący biały marmur Calacatta z delikatnym szarym żyłowaniem. Elegancki efekt kamienia w przystępnej cenie.",
    uses: ["Podłogi i ściany wewnątrz", "Łazienka i salon w stylu marmuru"],
    specs: ["Format: 60×60 cm", "Wykończenie: szkliwione, satynowe", "Rektyfikacja: tak"],
    offers: [
      { s: "Leroy Merlin", p: 59.99, url: "https://www.leroymerlin.pl/produkty/wykonczenie-wnetrz/plytki-scienne-i-podlogowe/plytki-podlogowe/gres/gres-szkliwiony/plytki-60-x-60-p.html" },
    ],
  },
  {
    id: "gres-samos-white", name: "Gres szkliwiony Samos White Poler 60×60 Artens",
    cat: "Płytki gres", brand: "Artens", unit: "m²", rating: 4.4, reviews: 10,
    features: ["60×60", "Poler", "Do łazienki"],
    badge: "Promocja −25%",
    desc: "Polerowany biały gres o wysokim połysku. Optycznie powiększa i rozświetla wnętrza.",
    uses: ["Podłogi i ściany wewnątrz", "Reprezentacyjne salony i łazienki"],
    specs: ["Format: 60×60 cm", "Wykończenie: poler", "Rektyfikacja: tak"],
    offers: [
      { s: "Leroy Merlin", p: 59.97, oldP: 79.99, url: "https://www.leroymerlin.pl/produkty/wykonczenie-wnetrz/plytki-scienne-i-podlogowe/plytki-podlogowe/gres/gres-szkliwiony/plytki-60-x-60-p.html" },
    ],
  },
  {
    id: "gres-galaxy-statuario", name: "Gres szkliwiony Galaxy Statuario Carving 60×60 Egen",
    cat: "Płytki gres", brand: "Egen", unit: "m²", rating: 4.2, reviews: 6,
    features: ["60×60", "Carving", "Imitacja marmuru"],
    desc: "Gres z dekoracyjnym wzorem marmuru Statuario i strukturą carving, podkreślającą rysunek kamienia.",
    uses: ["Ściany i podłogi wewnątrz", "Strefy dekoracyjne", "Łazienka premium"],
    specs: ["Format: 60×60 cm", "Wykończenie: carving", "Rektyfikacja: tak"],
    offers: [
      { s: "Leroy Merlin", p: 119.0, url: "https://www.leroymerlin.pl/produkty/wykonczenie-wnetrz/plytki-scienne-i-podlogowe/plytki-podlogowe/gres/gres-szkliwiony/plytka-60x60-p.html" },
    ],
  },
  {
    id: "gres-medan-grigio", name: "Gres szkliwiony Medan Grigio 60×60 Ceramika Gres",
    cat: "Płytki gres", brand: "Ceramika Gres", unit: "m²", rating: 4.6, reviews: 21,
    features: ["60×60", "Imitacja betonu", "Mrozoodporny"],
    desc: "Gres w estetyce betonu (szary), matowy i mrozoodporny. Pasuje do wnętrz industrialnych i minimalistycznych.",
    uses: ["Podłogi wewnątrz i na zewnątrz", "Wnętrza industrialne", "Tarasy zadaszone"],
    specs: ["Format: 60×60 cm", "Wykończenie: mat", "Mrozoodporność: tak"],
    offers: [
      { s: "Leroy Merlin", p: 49.98, url: "https://www.leroymerlin.pl/produkty/gres-szkliwiony-medan-grigio-60-x-60-ceramika-gres-84657485.html" },
    ],
  },
  {
    id: "ceresit-cl51-5", name: "Folia izolacyjna w płynie Ceresit CL 51 – 5 kg",
    cat: "Hydroizolacja", brand: "Ceresit", unit: "szt", rating: 4.7, reviews: 40,
    features: ["Pod płytki", "Ogrzewanie podłogowe", "Gotowa do użycia", "1,1 kg/m²"],
    badge: "Bestseller",
    desc: "Gotowa do użycia elastyczna folia hydroizolacyjna w płynie („folia w płynie\"). Tworzy szczelną, bezspoinową powłokę pod płytki w strefach mokrych.",
    uses: ["Łazienki i kabiny prysznicowe", "Pod płytki ceramiczne i gres", "Ogrzewanie podłogowe wewnątrz"],
    specs: ["Waga: 5 kg", "Zużycie: ok. 1,1 kg/m² (2 warstwy)", "Czas schnięcia warstwy: ok. 2,5 h", "Aplikacja: pędzel lub wałek"],
    offers: [
      { s: "Leroy Merlin", p: 99.0, url: "https://www.leroymerlin.pl/produkty/folia-w-plynie-cl-51-ceresit-44541602.html" },
      { s: "Castorama", p: null, url: "https://www.castorama.pl/folia-izolacyjna-w-plynie-ceresit-cl-51-5-kg/5900089151042_CAPL.prd" },
      { s: "OBI", p: null, url: "https://www.obi.pl/pozostale-akcesoria-do-plytek/ceresit-folia-izolacyjna-w-plynie-cl51-5-kg/p/4741088" },
    ],
  },
  {
    id: "atlas-unigrunt-5", name: "Grunt głęboko penetrujący Atlas Uni-Grunt 5 kg",
    cat: "Grunty", brand: "Atlas", unit: "szt", rating: 3.9, reviews: 12,
    features: ["Głęboko penetrujący", "Szybkoschnący", "Do 100 m²"],
    desc: "Szybkoschnąca emulsja gruntująca głęboko penetrująca. Wzmacnia podłoże, ogranicza chłonność i poprawia przyczepność klejów oraz wylewek.",
    uses: ["Przed klejeniem płytek", "Pod wylewki i gładzie", "Podłoża chłonne: beton", "jastrych", "tynk"],
    specs: ["Pojemność: 5 kg", "Wydajność: do 100 m² (zależnie od chłonności)", "Czas schnięcia: ok. 2 h"],
    offers: [
      { s: "Castorama", p: 44.98, url: "https://www.castorama.pl/grunt-gleboko-penetrujacy-atlas-uni-grunt-5-kg/5905400520026_CAPL.prd" },
      { s: "Leroy Merlin", p: 38.49, url: "https://www.leroymerlin.pl/produkty/grunt-gleboko-penetrujacy-uni-grunt-5l-atlas-40515811.html" },
    ],
  },
  {
    id: "atlas-unigrunt-10", name: "Grunt głęboko penetrujący Atlas Uni-Grunt 10 kg/10 l",
    cat: "Grunty", brand: "Atlas", unit: "szt", rating: 4.6, reviews: 11,
    features: ["Głęboko penetrujący", "Szybkoschnący"],
    desc: "Większe opakowanie emulsji Uni-Grunt — ekonomiczne przy gruntowaniu całych mieszkań i większych metraży.",
    uses: ["Gruntowanie dużych powierzchni", "Przed klejeniem płytek i wylewkami"],
    specs: ["Pojemność: 10 kg/10 l", "Czas schnięcia: ok. 2 h"],
    offers: [
      { s: "Leroy Merlin", p: 76.99, url: "https://www.leroymerlin.pl/produkty/farby-i-lakiery/przygotowanie-gruntu/gruntowanie-przed-malowaniem/grunty/grunty-szybkoschnace/grunty-atlas-p.html" },
      { s: "Castorama", p: 81.98, url: "https://www.castorama.pl/materialy-budowlane/podklady-gruntujace/grunty-uniwersalne.cat" },
    ],
  },
  {
    id: "soudal-silikon-bialy", name: "Silikon sanitarny Soudal 280 ml biały",
    cat: "Uszczelniacze", brand: "Soudal", unit: "szt", rating: 4.6, reviews: 52,
    features: ["Grzybobójczy", "Trwale elastyczny", "Do łazienki"],
    badge: "Bestseller",
    desc: "Silikon sanitarny z fungicydem (środkiem grzybobójczym), trwale elastyczny. Do spoin narażonych na wilgoć.",
    uses: ["Uszczelnianie wanien i brodzików", "Spoiny wokół umywalek i zlewów", "Narożniki w strefach mokrych"],
    specs: ["Pojemność: 280 ml", "Kolor: biały", "Odporność: na pleśń i wilgoć"],
    offers: [
      { s: "OBI", p: 19.98, url: "https://www.obi.pl/silikony-i-akryle/soudal-silikon-sanitarny-280-ml-bialy/p/3246998" },
      { s: "Castorama", p: 19.98, url: "https://www.castorama.pl/silikon-sanitarny-soudal-280-ml-bialy/5411183157064_CAPL.prd" },
      { s: "Leroy Merlin", p: null, url: "https://www.leroymerlin.pl/produkty/silikon-sanitarny-280-ml-bialy-soudal-45987865.html" },
    ],
  },
  {
    id: "ceresit-cs25-bezowy", name: "Silikon sanitarny Ceresit CS 25 beżowy natura 280 ml",
    cat: "Uszczelniacze", brand: "Ceresit", unit: "szt", rating: 4.5, reviews: 18,
    features: ["Grzybobójczy", "Do fug"],
    desc: "Silikon sanitarny dopasowany kolorystycznie do fug Ceresit (beż natura). Formuła MicroProtect chroni przed rozwojem pleśni.",
    uses: ["Wykończenie spoin przy fugach barwionych", "Strefy mokre w łazience i kuchni"],
    specs: ["Pojemność: 280 ml", "Kolor: beżowy natura", "Ochrona: przeciwgrzybiczna"],
    offers: [
      { s: "Castorama", p: 53.98, url: "https://www.castorama.pl/strefa-marki-ceresit" },
    ],
  },
  {
    id: "ceresit-ce40-bezowa", name: "Fuga elastyczna Ceresit CE 40 Aquastatic beżowa 2 kg",
    cat: "Fugi", brand: "Ceresit", unit: "szt", rating: 4.5, reviews: 26,
    features: ["Wodoodporna", "Elastyczna", "Color Perfect"],
    desc: "Elastyczna fuga wodoodporna Aquastatic z efektem perlenia — woda spływa kroplami zamiast wsiąkać. Trwałość koloru dzięki Color Perfect.",
    uses: ["Spoiny 1–8 mm wewnątrz", "Łazienki i kuchnie", "Ogrzewanie podłogowe"],
    specs: ["Waga: 2 kg", "Szerokość spoiny: 1–8 mm", "Kolor: beżowy", "Hydrofobowość: Aquastatic"],
    offers: [
      { s: "Castorama", p: 41.98, url: "https://www.castorama.pl/strefa-marki-ceresit" },
    ],
  },
  {
    id: "ceresit-ce40-tofii", name: "Fuga elastyczna Ceresit CE 40 Aquastatic tofii 2 kg",
    cat: "Fugi", brand: "Ceresit", unit: "szt", rating: 4.4, reviews: 15,
    features: ["Wodoodporna", "Elastyczna"],
    desc: "Wariant kolorystyczny tofii elastycznej fugi Aquastatic — ciepły odcień do beżowych i drewnopodobnych płytek.",
    uses: ["Spoiny 1–8 mm wewnątrz", "Płytki drewnopodobne i beżowe"],
    specs: ["Waga: 2 kg", "Szerokość spoiny: 1–8 mm", "Kolor: tofii"],
    offers: [
      { s: "Castorama", p: 34.98, url: "https://www.castorama.pl/strefa-marki-ceresit" },
    ],
  },
];

const PRICE_DATE = "01.07.2026";
const fmt = (n) => n == null ? "—" : n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const minP = (p) => {
  const ps = p.offers.map((o) => o.p).filter((x) => x != null);
  return ps.length ? Math.min(...ps) : null;
};

/* ---------------- trwałe przechowywanie (window.storage z fallbackiem) ---------------- */
const _mem = {};
const store = {
  async get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v != null) return JSON.parse(v);
    } catch { if (key in _mem) return _mem[key]; }
    return key in _mem ? _mem[key] : fallback;
  },
  async set(key, value) {
    _mem[key] = value;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* np. tryb prywatny */ }
  },
};


/* ================================================================
   DOKUMENTY PRAWNE (projekty — przed startem do weryfikacji przez prawnika)
   ================================================================ */
const LEGAL_REGULAMIN = `REGULAMIN SERWISU BOBERO

§1. Postanowienia ogólne
1. Niniejszy Regulamin określa zasady korzystania z serwisu internetowego BOBERO („Serwis"), będącego porównywarką cen materiałów budowlanych.
2. Usługodawcą jest [imię i nazwisko / nazwa firmy, adres, NIP — do uzupełnienia po rejestracji działalności] („Usługodawca").
3. Kontakt z Usługodawcą: [adres e-mail — do uzupełnienia].

§2. Charakter Serwisu
1. Serwis prezentuje informacje o produktach i cenach pochodzące ze sklepów partnerskich (m.in. Castorama, Leroy Merlin, OBI) oraz umożliwia przejście do stron tych sklepów.
2. Serwis NIE prowadzi sprzedaży. Umowa sprzedaży zawierana jest wyłącznie pomiędzy użytkownikiem a sklepem partnerskim, na warunkach tego sklepu.
3. Linki prowadzące do sklepów partnerskich są linkami afiliacyjnymi — Usługodawca otrzymuje prowizję od sklepu, jeżeli użytkownik dokona zakupu. Prowizja nie wpływa na cenę płaconą przez użytkownika. Wszystkie takie linki są oznaczone w Serwisie.
4. Ceny prezentowane w Serwisie mają charakter informacyjny i pochodzą ze stron sklepów z datą wskazaną przy ofercie. Wiążąca jest wyłącznie cena w sklepie partnerskim w chwili zakupu. Usługodawca dokłada starań, aby ceny były aktualne, ale nie gwarantuje ich zgodności w każdym momencie.

§3. Zasady plasowania (kolejności) ofert
1. Domyślna kolejność produktów („Polecane") opiera się na popularności produktów w sklepach partnerskich. Użytkownik może zmienić sortowanie na: cena rosnąco, cena malejąco.
2. W ramach jednego produktu oferty sklepów są zawsze sortowane od najniższej potwierdzonej ceny.
3. Wysokość prowizji afiliacyjnej NIE wpływa na kolejność produktów ani ofert.

§4. Konta użytkowników
1. Rejestracja jest dobrowolna i bezpłatna. Konto może założyć osoba pełnoletnia (konto prywatne) lub przedsiębiorca (konto firmowe, z podaniem NIP).
2. Konto umożliwia: zapisywanie ulubionych, prowadzenie listy zakupowej, ustawianie alertów cenowych.
3. Użytkownik zobowiązuje się do podania prawdziwych danych i nieudostępniania hasła osobom trzecim.
4. Użytkownik może w każdej chwili usunąć konto, kontaktując się z Usługodawcą.

§5. Odpowiedzialność
1. Usługodawca nie odpowiada za: treść, dostępność i realizację ofert sklepów partnerskich, różnice cen, przebieg zakupu i reklamacje — te kieruje się do sklepu, w którym dokonano zakupu.
2. Usługodawca odpowiada za działanie Serwisu z należytą starannością.

§6. Reklamacje dotyczące Serwisu
1. Reklamacje dotyczące działania Serwisu można składać na adres e-mail Usługodawcy. Odpowiedź w terminie 14 dni.

§7. Postanowienia końcowe
1. Regulamin może ulec zmianie; o zmianach użytkownicy zostaną poinformowani w Serwisie z 14-dniowym wyprzedzeniem.
2. W sprawach nieuregulowanych stosuje się prawo polskie.

[PROJEKT DOKUMENTU — przed publikacją serwisu wymaga weryfikacji przez prawnika i uzupełnienia danych Usługodawcy.]`;

const LEGAL_PRYWATNOSC = `POLITYKA PRYWATNOŚCI SERWISU BOBERO

1. Administrator danych
Administratorem danych osobowych jest [imię i nazwisko / nazwa firmy, adres — do uzupełnienia]. Kontakt: [e-mail].

2. Jakie dane przetwarzamy i po co
a) Dane konta (imię i nazwisko, adres e-mail, hasło w postaci skrótu, a dla kont firmowych: nazwa firmy i NIP) — w celu świadczenia usługi konta, na podstawie art. 6 ust. 1 lit. b RODO (umowa).
b) Dane o korzystaniu z Serwisu (ulubione, lista zakupowa, alerty cenowe) — w celu świadczenia usług konta (art. 6 ust. 1 lit. b RODO).
c) Statystyka kliknięć w oferty (produkt, sklep, czas) — w celu rozliczeń z sieciami afiliacyjnymi i doskonalenia Serwisu, na podstawie prawnie uzasadnionego interesu (art. 6 ust. 1 lit. f RODO) — wyłącznie po wyrażeniu zgody na pliki cookies inne niż niezbędne.
d) Adres e-mail do komunikacji marketingowej — wyłącznie za odrębną, dobrowolną zgodą (art. 6 ust. 1 lit. a RODO).

3. Pliki cookies i technologie śledzące
a) Cookies niezbędne — utrzymanie sesji i podstawowych funkcji; nie wymagają zgody.
b) Cookies afiliacyjne i statystyczne — instalowane przy przejściu do sklepu partnerskiego przez link afiliacyjny; służą przypisaniu ewentualnego zakupu do Serwisu. Instalowane WYŁĄCZNIE po wyrażeniu zgody w banerze cookies.
c) Zgodę można w każdej chwili wycofać w ustawieniach Serwisu (stopka → „Ustawienia cookies").

4. Odbiorcy danych
Sieci afiliacyjne (Tradedoubler, Admitad, Awin) — w zakresie technicznych identyfikatorów kliknięć; podmioty utrzymujące infrastrukturę Serwisu.

5. Okres przechowywania
Dane konta — do czasu usunięcia konta. Statystyka kliknięć — do 24 miesięcy. Dane rozliczeniowe — zgodnie z przepisami podatkowymi.

6. Prawa użytkownika
Masz prawo do: dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia, sprzeciwu oraz skargi do Prezesa UODO. Wnioski: [e-mail].

7. Dobrowolność
Podanie danych jest dobrowolne, ale niezbędne do założenia konta.

[PROJEKT DOKUMENTU — przed publikacją serwisu wymaga weryfikacji przez prawnika i uzupełnienia danych Administratora.]`;

const LEGAL_COOKIES = `POLITYKA COOKIES

1. Serwis BOBERO używa dwóch kategorii plików cookies:
a) NIEZBĘDNE — utrzymują sesję, zapamiętują ustawienia i umożliwiają działanie konta. Działają zawsze.
b) AFILIACYJNE I STATYSTYCZNE — po kliknięciu w ofertę sklep partnerski i sieć afiliacyjna (Tradedoubler, Admitad, Awin) mogą zapisać cookie przypisujące ewentualny zakup do naszego Serwisu; my zapisujemy statystykę kliknięć. Działają wyłącznie po Twojej zgodzie.

2. Zgodę wyrażasz w banerze przy pierwszej wizycie. Możesz ją zmienić w każdej chwili: stopka → „Ustawienia cookies".

3. Brak zgody na cookies afiliacyjne nie blokuje korzystania z Serwisu — linki do sklepów nadal działają, ale bez identyfikatorów śledzących (Serwis nie otrzyma wtedy prowizji).`;

/* ---------------- konta użytkowników ---------------- */
async function hashPass(pass) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("bobero:" + pass));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // awaryjnie: prosty skrót (środowiska bez crypto.subtle)
    let h = 0; const s = "bobero:" + pass;
    for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return "x" + (h >>> 0).toString(16);
  }
}
function Tip({ text }) {
  return (
    <span className="tip" tabIndex={0} aria-label={text}>
      <span className="tip-dot">i</span>
      <span className="tip-bubble">{text}</span>
    </span>
  );
}
function PassInput({ value, onChange, onKeyDown, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pass-wrap">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} />
      <button type="button" className="pass-eye" aria-label={show ? "Ukryj hasło" : "Pokaż hasło"} onClick={() => setShow(!show)}>
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const validNip = (nip) => {
  const d = nip.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(d)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((a, wi, i) => a + wi * +d[i], 0);
  return sum % 11 === +d[9];
};

/* ---- formularz logowania / rejestracji ---- */
function AuthModal({ users, onLogin, onRegister, onClose, openLegal }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const [mode, setMode] = useState("login");
  const [type, setType] = useState("prywatne");
  const [f, setF] = useState({ name: "", email: "", pass: "", pass2: "", nip: "", company: "", consent: false, marketing: false });
  const [err, setErr] = useState("");
     const [notice, setNotice] = useState("");
     const [busy, setBusy] = useState(false);
     const [socialInfo, setSocialInfo] = useState("");
  const set = (k, v) => { setF({ ...f, [k]: v }); setErr(""); };
  const social = (provider) => setSocialInfo(`Logowanie przez ${provider} będzie aktywne po uruchomieniu serwisu na własnej domenie — wymaga rejestracji aplikacji u dostawcy (klucze OAuth) i obsługi po stronie serwera. W wersji podglądowej użyj konta z hasłem.`);
  const SocialButtons = () => (
    <div className="social-box">
      <div className="social-sep"><span>lub</span></div>
      <div className="social-btns">
        <button type="button" className="social-btn" onClick={() => social("Google")}><span className="g-ico">G</span> Kontynuuj z Google</button>
        <button type="button" className="social-btn" onClick={() => social("Facebook")}><span className="f-ico">f</span> Kontynuuj z Facebookiem</button>
        <button type="button" className="social-btn" onClick={() => social("Apple")}><span></span> Kontynuuj z Apple</button>
      </div>
      {socialInfo && <div className="warn">{socialInfo}</div>}
    </div>
  );

  const doLogin = async () => {
         setBusy(true); setErr(""); setNotice("");
         const email = f.email.trim().toLowerCase();
         // podgląd / dostęp administratora — działa lokalnie, bez Supabase (do usunięcia przed pełnym uruchomieniem produkcyjnym)
         if (email === "@" && f.pass === "@") {
                  const u = users.find((x) => x.email === "@");
                  setBusy(false);
                  if (u) onLogin(u); else setErr("Konto administratora nie zostało znalezione.");
                  return;
         }
         const { data, error } = await supabase.auth.signInWithPassword({ email, password: f.pass });
         setBusy(false);
         if (error) {
                  setErr(error.message === "Invalid login credentials" ? "Nieprawidłowy e-mail lub hasło." : error.message);
                  return;
         }
         const su = data.user;
         const meta = su.user_metadata || {};
         const existing = users.find((x) => x.email.toLowerCase() === email);
         const u = {
                  ...(existing || { favs: [], list: [], notifyEmail: true, notifySms: false, phone: "" }),
                  id: su.id,
                  name: meta.name || existing?.name || email.split("@")[0],
                  email,
                  type: meta.type || existing?.type || "prywatne",
                  company: meta.company || existing?.company || "",
                  nip: meta.nip || existing?.nip || "",
                  marketing: !!meta.marketing,
                  created: existing?.created || Date.parse(su.created_at) || Date.now(),
                  isAdmin: existing?.isAdmin || users.length === 0,
         };
         onLogin(u);
  };

     const doRegister = async () => {
            setBusy(true); setErr(""); setNotice("");
            const email = f.email.trim().toLowerCase();
            if (!f.name.trim()) { setErr("Podaj imię i nazwisko."); setBusy(false); return; }
            if (!validEmail(email)) { setErr("Nieprawidłowy adres e-mail."); setBusy(false); return; }
            if (f.pass.length < 8) { setErr("Hasło musi mieć co najmniej 8 znaków."); setBusy(false); return; }
            if (f.pass !== f.pass2) { setErr("Hasła nie są identyczne."); setBusy(false); return; }
            if (type === "firma") {
                     if (!f.company.trim()) { setErr("Podaj nazwę firmy."); setBusy(false); return; }
                     if (!validNip(f.nip)) { setErr("Nieprawidłowy NIP (sprawdź 10 cyfr i sumę kontrolną)."); setBusy(false); return; }
            }
            if (!f.consent) { setErr("Akceptacja Regulaminu jest wymagana."); setBusy(false); return; }
            const { data, error } = await supabase.auth.signUp({
                     email, password: f.pass,
                     options: { data: { name: f.name.trim(), type, company: type === "firma" ? f.company.trim() : "", nip: type === "firma" ? f.nip.replace(/[\s-]/g, "") : "", marketing: f.marketing } },
            });
            setBusy(false);
            if (error) {
                     setErr(error.message === "User already registered" ? "Konto z tym adresem już istnieje." : error.message);
                     return;
            }
            const su = data.user;
            const u = {
                     id: su.id, name: f.name.trim(), email,
                     type, company: type === "firma" ? f.company.trim() : "", nip: type === "firma" ? f.nip.replace(/[\s-]/g, "") : "",
                     marketing: f.marketing, created: Date.now(),
                     isAdmin: users.length === 0, // pierwszy zarejestrowany użytkownik zostaje administratorem
                     notifyEmail: true, notifySms: false, phone: "",
                     favs: [], list: [],
            };
            if (!data.session) {
                     setNotice("Konto założone! Sprawdź skrzynkę e-mail i kliknij link potwierdzający, aby się zalogować.");
                     return;
            }
            onRegister(u);
     };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet auth" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-back" onClick={onClose}>← Wróć</button>
        <button className="close" onClick={onClose} aria-label="Zamknij">×</button>
        <div className="auth-tabs">
          <button className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setErr(""); }}>Logowanie</button>
          <button className={mode === "register" ? "on" : ""} onClick={() => { setMode("register"); setErr(""); }}>Rejestracja</button>
        </div>

        {mode === "login" ? (
          <div className="auth-form">
            <label>E-mail<input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></label>
            <label>Hasło<PassInput value={f.pass} onChange={(e) => set("pass", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLogin()} /></label>
            {err && <div className="err">{err}</div>}
            <button className="cta" disabled={busy} onClick={doLogin}>Zaloguj się</button>
            <SocialButtons />
          </div>
        ) : (
          <div className="auth-form">
            <div className="type-toggle">
              <button className={type === "prywatne" ? "on" : ""} onClick={() => setType("prywatne")}>Konto prywatne</button>
              <button className={type === "firma" ? "on" : ""} onClick={() => setType("firma")}>Konto firmowe</button>
            </div>
            <label>Imię i nazwisko<input value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
            {type === "firma" && (
              <>
                <label>Nazwa firmy<input value={f.company} onChange={(e) => set("company", e.target.value)} /></label>
                <label>NIP<input value={f.nip} placeholder="np. 5260250274" onChange={(e) => set("nip", e.target.value)} /></label>
              </>
            )}
            <label>E-mail<input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></label>
            <label>Hasło (min. 8 znaków)<PassInput value={f.pass} onChange={(e) => set("pass", e.target.value)} /></label>
            <label>Powtórz hasło<PassInput value={f.pass2} onChange={(e) => set("pass2", e.target.value)} /></label>
            <label className="check"><input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /><span>Akceptuję <button type="button" className="inline-link" onClick={() => openLegal("regulamin")}>Regulamin</button> i <button type="button" className="inline-link" onClick={() => openLegal("prywatnosc")}>Politykę prywatności</button> (wymagane)</span></label>
            <label className="check"><input type="checkbox" checked={f.marketing} onChange={(e) => set("marketing", e.target.checked)} /><span>Chcę otrzymywać informacje o promocjach (opcjonalne)</span></label>
             {notice && <div className="warn">{notice}</div>}
             <button className="cta" disabled={busy} onClick={doRegister}>Załóż konto</button>
            <SocialButtons />
          </div>
        )}
        <p className="disclosure">Logowanie i hasło obsługuje bezpiecznie Supabase (nigdy nie widzimy Twojego hasła w postaci jawnej). Lista zakupowa i ulubione są na razie zapisywane lokalnie w tej przeglądarce.</p>
        <button className="sheet-close-bottom" onClick={onClose}>Zamknij</button>
      </div>
    </div>
  );
}

/* ---- profil użytkownika ---- */
function ProfilePanel({ user, products, networks, updateUser, onLogout, onClose, onOpenProduct, onClick, consent, isAdmin, onAdmin, section, setSection, address, setAddress, setCookieChoice, cookieConsent, openLegal, showToast, isGuest, onAuth, onDeleteAccount }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const tab = isGuest ? "lista" : section; // gość ma dostęp wyłącznie do listy
  const [delAsk, setDelAsk] = useState(false);
  const [addrLabel, setAddrLabel] = useState("");
  const [addrValue, setAddrValue] = useState("");
  const pageRef = React.useRef(null);
  useEffect(() => {
    const el = pageRef.current;
    if (el) { el.scrollTop = 0; const sh = el.querySelector(".sheet"); if (sh) sh.scrollTop = 0; }
    window.scrollTo(0, 0);
    setDelAsk(false);
  }, [tab]);
  const setTab = (t) => { if (isGuest && t !== "lista") { onAuth(); return; } setSection(t); };
  const clientNo = "BOB-" + String(100000000 + (Math.abs([...String(user.id)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7)) % 899999999)).slice(0, 9);
  /* uzupełnienie konta: 4 kroki */
  const steps = [
    { ok: true, label: "Dane konta" },
    { ok: !!(user.phone && user.phone.trim()), label: "Numer telefonu" },
    { ok: !!(address && address.trim()), label: "Adres zakupów" },
    { ok: (user.list || []).length > 0 || (user.favs || []).length > 0, label: "Pierwsza lista lub ulubione" },
  ];
  const done = steps.filter((s) => s.ok).length;
  const [f, setF] = useState({ name: user.name, phone: user.phone || "", oldPass: "", newPass: "", newPass2: "" });
  const [passMsg, setPassMsg] = useState("");
  const [storeFilter, setStoreFilter] = useState("wszystkie");
  const [anMode, setAnMode] = useState("cena"); // cena | odleglosc
  const STORES = Object.keys(networks);
  const favProducts = products.filter((p) => (user.favs || []).includes(p.id));
  const listItems = (user.list || []).map((li) => ({ ...li, p: products.find((p) => p.id === li.id) })).filter((x) => x.p);

  /* potencjalna oszczędność: ile mniej zapłacisz kupując każdą pozycję tam, gdzie jest najtaniej,
     zamiast brać wszystko po najwyższej dostępnej cenie. Liczone tylko z potwierdzonych cen. */
  const savings = listItems.reduce((acc, x) => {
    const ps = x.p.offers.map((o) => o.p).filter((v) => v != null);
    if (ps.length < 2) return acc;
    const qty = Math.max(1, Number(x.qty) || 1);
    return acc + (Math.max(...ps) - Math.min(...ps)) * qty;
  }, 0);

  /* oferta wybrana dla pozycji: sklep wskazany przez użytkownika, a domyślnie najtańszy z potwierdzoną ceną */
  const chosenOffer = (x) => {
    if (x.store) { const o = x.p.offers.find((of) => of.s === x.store); if (o) return o; }
    const conf = x.p.offers.filter((o) => o.p != null).sort((a, b) => a.p - b.p);
    return conf[0] || x.p.offers[0] || null;
  };

  const visibleItems = storeFilter === "wszystkie" ? listItems
    : storeFilter === "analizator" ? []
    : listItems.filter((x) => x.p.offers.some((o) => o.s === storeFilter));
  const chosenTotal = listItems.reduce((s, x) => { const o = chosenOffer(x); return s + (o?.p ?? 0) * x.qty; }, 0);
  const chosenUnknown = listItems.filter((x) => chosenOffer(x)?.p == null).length;

  /* porównanie: ile zapłacę w każdym sklepie za wszystko, co ten sklep ma */
  const storeCompare = STORES.map((s) => {
    const rows = listItems.map((x) => ({ x, o: x.p.offers.find((of) => of.s === s) || null }));
    const have = rows.filter((r) => r.o && r.o.p != null);
    const noPrice = rows.filter((r) => r.o && r.o.p == null);
    const missing = rows.filter((r) => !r.o);
    return {
      s, have, noPrice, missing,
      total: have.reduce((sum, r) => sum + r.o.p * r.x.qty, 0),
    };
  }).filter((sc) => sc.have.length + sc.noPrice.length > 0 || listItems.length === 0);

  /* grupowanie „przejdź do sklepów" wg wybranych ofert */
  const byStore = {};
  listItems.forEach((x) => {
    const o = chosenOffer(x);
    if (o) { (byStore[o.s] = byStore[o.s] || []).push({ ...x, offer: o }); }
  });
  const openGroup = (s, rows) => rows.forEach((r) => {
    const o = r.o || r.x?.p.offers.find((of) => of.s === s);
    if (!o) return;
    onClick({ t: Date.now(), product: (r.x || r).p?.name || r.x.p.name, store: s, price: o.p });
    window.open(buildAffLink(networks, s, o.url, consent), "_blank", "noopener");
  });
  const GroupGo = ({ s, rows }) => (
    <div className="offer-go-wrap split-go">
      <button className="offer-go" onClick={() => openGroup(s, rows)}>Otwórz oferty w {s} →</button>
      <span className="aff-label">linki afiliacyjne</span>
    </div>
  );
  const setQty = (id, qty) => updateUser({ ...user, list: qty <= 0 ? (user.list || []).filter((l) => l.id !== id) : user.list.map((l) => (l.id === id ? { ...l, qty } : l)) });
  const setItemStore = (id, storeName) => updateUser({ ...user, list: (user.list || []).map((l) => (l.id === id ? { ...l, store: storeName || undefined } : l)) });

  return (
    <div className="page-wrap" ref={pageRef}>
      <div className="sheet profile as-page">
        <button className="sheet-back" onClick={() => (tab === "menu" ? onClose() : setTab("menu"))}>← Wróć</button>
        {tab === "menu" ? (
          <div className="acc-head">
            <h2 className="profile-name big">{user.name}</h2>
            <div className="muted">{isGuest ? "Tryb gościa" : `Numer Klienta: ${clientNo}`}{user.type === "firma" && ` · ${user.company} (NIP ${user.nip})`}</div>
          </div>
        ) : (
          <h3 className="acc-sec-title">{({ lista: "Lista zakupowa", ulubione: "Ulubione i powiadomienia", dane: "Dane konta i hasło", zgody: "Zgody i cookies", kontakt: "Kontakt" })[tab] || ""}</h3>
        )}

        {tab === "menu" && (
          <>
            {savings > 0 ? (
              <div className="acc-card acc-save">
                <span className="acc-save-lbl">Na Twojej liście możesz zaoszczędzić</span>
                <b className="acc-save-v">{fmt(savings)} zł</b>
                <p className="muted">Tyle wynosi różnica między najdroższymi a najtańszymi ofertami Twoich {listItems.length} {listItems.length === 1 ? "pozycji" : "pozycji"}. Analizator pokaże, gdzie kupić, żeby ją wykorzystać.</p>
                <button className="acc-btn" onClick={() => { setStoreFilter("analizator"); setTab("lista"); }}>Zobacz jak →</button>
              </div>
            ) : (
              <div className="acc-card acc-promo">
                <b>Kupuj przez BOBERO i płać mniej</b>
                <p className="muted">Dodaj produkty do listy — policzymy, ile możesz zaoszczędzić, a Analizator rozplanuje najtańsze zakupy. Nic nie dopłacasz.</p>
                <button className="acc-btn" onClick={() => setTab("lista")}>Otwórz listę zakupową</button>
              </div>
            )}

            {done < 4 && (
              <div className="acc-card acc-progress">
                <div className="acc-ring" style={{ background: `conic-gradient(var(--ink) ${done / 4 * 360}deg, #DDE1E6 0deg)` }}><span>{done}/4</span></div>
                <div className="acc-progress-txt">
                  <b>Uzupełnij swoje konto</b>
                  <p className="muted">{steps.filter((s) => !s.ok).map((s) => s.label).join(" · ")}</p>
                </div>
                <button className="acc-btn" onClick={() => setTab("dane")}>Uzupełnij informacje</button>
              </div>
            )}

            <h4 className="acc-sec-h">Moje zakupy</h4>
            <div className="acc-tiles">
              <button className="acc-tile" onClick={() => setTab("lista")}>
                <span className="acc-tile-ico">🛒</span>Lista zakupowa{listItems.length > 0 && <span className="acc-tile-n">{listItems.length}</span>}
              </button>
              <button className="acc-tile" onClick={() => setTab("ulubione")}>
                <span className="acc-tile-ico">♥</span>Ulubione{favProducts.length > 0 && <span className="acc-tile-n">{favProducts.length}</span>}
              </button>
              <button className="acc-tile" onClick={() => { setStoreFilter("analizator"); setTab("lista"); }}>
                <span className="acc-tile-ico">⚡</span>Analizator
              </button>
            </div>

            <h4 className="acc-sec-h">Moje dane</h4>
            <div className="acc-list">
              <button className="acc-row" onClick={() => setTab("dane")}><span className="acc-row-ico">👤</span>Dane i hasło<span className="acc-row-arrow">→</span></button>
              <button className="acc-row" onClick={() => setTab("adres")}><span className="acc-row-ico">📍</span>Adres zakupów<span className="acc-row-arrow">→</span></button>
              <button className="acc-row" onClick={() => setTab("ulubione")}><span className="acc-row-ico">🔔</span>Powiadomienia o cenach<span className="acc-row-arrow">→</span></button>
              <button className="acc-row" onClick={() => setTab("zgody")}><span className="acc-row-ico">✉️</span>Zgody i cookies<span className="acc-row-arrow">→</span></button>
            </div>

            <h4 className="acc-sec-h">Pomoc</h4>
            <div className="acc-list">
              <button className="acc-row" onClick={() => setTab("kontakt")}><span className="acc-row-ico">💬</span>Kontakt<span className="acc-row-arrow">→</span></button>
              <button className="acc-row" onClick={() => openLegal("regulamin")}><span className="acc-row-ico">📄</span>Informacje prawne<span className="acc-row-arrow">→</span></button>
              {isAdmin && <button className="acc-row" onClick={onAdmin}><span className="acc-row-ico">⚙️</span>Panel administratora<span className="acc-row-arrow">→</span></button>}
            </div>

            <button className="logout-btn" onClick={onLogout}>↪ Wyloguj się</button>
            <div className="acc-ver">BOBERO — wersja podglądowa · ceny z {PRICE_DATE}</div>
          </>
        )}

        {tab === "adres" && (
          <div className="acc-card">
            <h3 className="sec-title top0">Adresy zakupów</h3>
            <p className="muted">Zapisz jeden lub kilka adresów (np. „Dom", „Budowa") — aktywny adres wybierzesz też w koszyku, a Analizator policzy dla niego dostawę i najbliższe sklepy.</p>
            {(user.addresses || []).length > 0 && (
              <div className="addr-list">
                {(user.addresses || []).map((a) => (
                  <div key={a.id} className={"addr-row" + (address === a.value ? " on" : "")}>
                    <button className="addr-pick" onClick={() => { setAddress(a.value); showToast("Aktywny adres: " + a.label); }}>
                      <span className="addr-radio">{address === a.value ? "●" : "○"}</span>
                      <span className="addr-txt"><b>{a.label}</b><span className="muted">{a.value}</span></span>
                    </button>
                    <button className="addr-del" title="Usuń adres" onClick={() => {
                      const rest = (user.addresses || []).filter((x) => x.id !== a.id);
                      updateUser({ ...user, addresses: rest });
                      if (address === a.value) setAddress(rest[0] ? rest[0].value : "");
                      showToast("Usunięto adres.");
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="addr-add">
              <label className="acc-field">Nazwa (np. Dom, Budowa)<input value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} placeholder={"Adres " + (((user.addresses || []).length) + 1)} /></label>
              <label className="acc-field">Adres lub kod pocztowy
                <div className="addr-input-row">
                  <input placeholder="np. 85-001 albo Bydgoszcz, Budowlana 5" value={addrValue} onChange={(e) => setAddrValue(e.target.value)} />
                  <button type="button" className="addr-gps" title="Użyj mojej lokalizacji (GPS)" onClick={() => {
                    if (!navigator.geolocation) { showToast("Twoja przeglądarka nie udostępnia GPS."); return; }
                    showToast("Pobieram lokalizację…");
                    navigator.geolocation.getCurrentPosition(
                      (pos) => { const c = nearestCity(pos.coords.latitude, pos.coords.longitude); setAddrValue(c); showToast("Ustawiono najbliższe miasto: " + c + ". Możesz doprecyzować ulicę."); },
                      (err) => showToast(err && err.code === 1 ? "Brak zgody na lokalizację — w podglądzie GPS może nie działać. Wpisz adres ręcznie." : "Nie udało się ustalić pozycji. Wpisz adres ręcznie."),
                      { timeout: 8000 });
                  }}>📍</button>
                </div>
              </label>
              <button className="cta small" onClick={() => {
                const v = addrValue.trim(); if (!v) { showToast("Wpisz adres albo użyj przycisku 📍."); return; }
                const label = addrLabel.trim() || ("Adres " + (((user.addresses || []).length) + 1));
                const na = { id: "a" + Date.now(), label, value: v };
                updateUser({ ...user, addresses: [...(user.addresses || []), na] });
                setAddress(v); setAddrLabel(""); setAddrValue("");
                showToast("Dodano adres „" + label + '" i ustawiono jako aktywny.');
              }}>+ Dodaj adres</button>
            </div>
          </div>
        )}

        {tab === "dane" && (
          <>
            <h3 className="sec-title">Dane i hasło</h3>
            <div className="acc-card">
              <label className="acc-field">Imię i nazwisko<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label className="acc-field">E-mail (login)<input value={user.email} disabled /></label>
              <label className="acc-field">Numer telefonu<input type="tel" placeholder="np. 600 100 200" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
              <label className="acc-field">Adres zakupów (lub kod pocztowy)<input placeholder="np. 85-001 albo Bydgoszcz, Budowlana 5" value={address} onChange={(e) => setAddress(e.target.value)} /></label>
              <button className="cta small" onClick={() => { updateUser({ ...user, name: f.name.trim() || user.name, phone: f.phone.trim() }); showToast("Zapisano dane konta."); }}>Zapisz dane</button>
            </div>
            <div className="acc-card">
              <b>Zmiana hasła</b>
              <label className="acc-field">Obecne hasło<PassInput value={f.oldPass} onChange={(e) => setF({ ...f, oldPass: e.target.value })} /></label>
              <label className="acc-field">Nowe hasło (min. 8 znaków)<PassInput value={f.newPass} onChange={(e) => setF({ ...f, newPass: e.target.value })} /></label>
              <label className="acc-field">Powtórz nowe hasło<PassInput value={f.newPass2} onChange={(e) => setF({ ...f, newPass2: e.target.value })} /></label>
              {passMsg && <div className={passMsg.startsWith("✓") ? "ok-msg" : "err"}>{passMsg}</div>}
              <button className="cta small" onClick={async () => {
                if ((await hashPass(f.oldPass)) !== user.passHash) { setPassMsg("Obecne hasło jest nieprawidłowe."); return; }
                if (f.newPass.length < 8) { setPassMsg("Nowe hasło musi mieć co najmniej 8 znaków."); return; }
                if (f.newPass !== f.newPass2) { setPassMsg("Nowe hasła różnią się od siebie."); return; }
                updateUser({ ...user, passHash: await hashPass(f.newPass) });
                setF({ ...f, oldPass: "", newPass: "", newPass2: "" }); setPassMsg("✓ Hasło zmienione.");
              }}>Zmień hasło</button>
            </div>

            <div className="acc-card">
              <b>Twoje dane (RODO)</b>
              <p className="muted">Masz prawo pobrać swoje dane i usunąć konto w każdej chwili.</p>
              <div className="rodo-btns">
                <button className="acc-btn ghost" onClick={() => {
                  const data = { konto: { imie: user.name, email: user.email, telefon: user.phone || "", adres: address || "" }, lista: listItems.map((x) => ({ produkt: x.p.name, ilosc: x.qty || 1 })), ulubione: favProducts.map((p) => p.name), zgody: user.consents || {}, wygenerowano: new Date().toISOString() };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "bobero-moje-dane.json"; a.click(); URL.revokeObjectURL(a.href);
                  showToast("Pobrano plik z Twoimi danymi.");
                }}>⬇ Pobierz moje dane</button>
                {!delAsk ? (
                  <button className="acc-btn danger" onClick={() => setDelAsk(true)}>🗑 Usuń konto</button>
                ) : (
                  <div className="del-confirm">
                    <p><b>Usunąć konto na stałe?</b> Znikną Twoja lista, ulubione i dane. Tej operacji nie da się cofnąć.</p>
                    <div className="rodo-btns">
                      <button className="acc-btn" onClick={() => setDelAsk(false)}>Zostawiam konto</button>
                      <button className="acc-btn danger" onClick={() => { onDeleteAccount(); }}>Tak, usuń konto</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "zgody" && (
          <div className="acc-card">
            <h3 className="sec-title top0">Zgody i cookies</h3>
            <b>Pliki cookies</b>
            <p className="muted">Obecny wybór: {cookieConsent === "all" ? "wszystkie (niezbędne + afiliacyjne i statystyczne)" : "tylko niezbędne"}.</p>
            <div className="acc-consent-btns">
              <button className={`pill ${cookieConsent === "all" ? "on" : ""}`} onClick={() => { setCookieChoice("all"); showToast("Zapisano: wszystkie cookies."); }}>Akceptuję wszystkie</button>
              <button className={`pill ${cookieConsent === "necessary" ? "on" : ""}`} onClick={() => { setCookieChoice("necessary"); showToast("Zapisano: tylko niezbędne."); }}>Tylko niezbędne</button>
            </div>
            <p className="muted">Bez zgody na cookies afiliacyjne linki do sklepów działają, ale bez identyfikatorów (serwis nie otrzyma prowizji). Szczegóły w Polityce cookies.</p>
            <b style={{ marginTop: 12, display: "block" }}>Komunikacja marketingowa</b>
            <label className="check"><input type="checkbox" checked={!!user.marketing} onChange={(e) => updateUser({ ...user, marketing: e.target.checked })} /><span>Chcę otrzymywać informacje o promocjach (e-mail)</span></label>
          </div>
        )}

        {tab === "kontakt" && (
          <div className="acc-card">
            <b>Skontaktuj się z nami</b>
            <p className="muted">Masz pytanie o działanie porównywarki, błędną cenę albo współpracę?</p>
            <div className="contact-rows">
              <p>✉️ <b>kontakt@bobero.pl</b> — pytania ogólne i błędne ceny</p>
              <p>🤝 <b>partnerzy@bobero.pl</b> — współpraca sklepów i hurtowni</p>
              <p>🕘 Odpowiadamy w dni robocze, zwykle w ciągu 24 h.</p>
            </div>
            <div className="company-box">
              <b>Dane usługodawcy</b>
              <p className="muted">BOBERO [forma prawna w przygotowaniu]<br/>
              [adres siedziby — zostanie uzupełniony po rejestracji działalności]<br/>
              NIP / REGON: [po rejestracji] · e-mail: kontakt@bobero.pl</p>
            </div>
            <p className="muted">Reklamacje dotyczące zakupów kieruj do sklepu, w którym dokonano zakupu — BOBERO jest porównywarką i nie prowadzi sprzedaży. Reklamacje dotyczące działania serwisu: odpowiadamy do 14 dni (§6 Regulaminu).</p>
          </div>
        )}
        {isGuest && (
          <div className="guest-bar">
            <span>Lista gościa — <b>zniknie po zamknięciu strony</b>. Zaloguj się, aby zapisać ją na stałe i dostać powiadomienia o cenach.</span>
            <button className="cta small" onClick={onAuth}>Zaloguj się</button>
          </div>
        )}
        {(tab === "lista" || tab === "ulubione") && (
          <div className="auth-tabs">
            <button className={tab === "lista" ? "on" : ""} onClick={() => setTab("lista")}>Lista zakupowa ({listItems.length})</button>
            <button className={tab === "ulubione" ? "on" : ""} onClick={() => setTab("ulubione")}>Ulubione ({favProducts.length})</button>
          </div>
        )}

        {tab === "lista" && (
          listItems.length === 0 ? <p className="muted pad">Lista jest pusta. Dodawaj produkty przyciskiem „+ Na listę" na kartach.</p> : (
            <>
              {!isGuest && (user.addresses || []).length > 0 && (
                <div className="cart-addr">
                  <span className="cart-addr-lbl">📍 Dostawa na:</span>
                  <select className="cart-addr-sel" value={address} onChange={(e) => { setAddress(e.target.value); const a = (user.addresses || []).find((x) => x.value === e.target.value); showToast("Aktywny adres: " + (a ? a.label : e.target.value)); }}>
                    {(user.addresses || []).map((a) => <option key={a.id} value={a.value}>{a.label} — {a.value}</option>)}
                    {!(user.addresses || []).some((a) => a.value === address) && address && <option value={address}>{address}</option>}
                  </select>
                  <button className="cart-addr-edit" onClick={() => setTab("adres")}>Zarządzaj</button>
                </div>
              )}
              {!isGuest && (user.addresses || []).length === 0 && (
                <div className="cart-addr">
                  <span className="muted">📍 Dodaj adres zakupów — Analizator policzy dostawę i najbliższe sklepy.</span>
                  <button className="cart-addr-edit" onClick={() => setTab("adres")}>+ Dodaj adres</button>
                </div>
              )}
              <div className="store-filter">
                <span className="muted">Pokaż: <Tip text="Filtruj listę wg sklepu. Przy nazwie sklepu widzisz od razu, ile zapłacisz w nim za dostępne pozycje z Twojej listy. Przy każdej pozycji możesz też ręcznie wybrać sklep albo zostawić „najtaniej”." /></span>
                <button className={`pill ${storeFilter === "wszystkie" ? "on" : ""}`} onClick={() => setStoreFilter("wszystkie")}>Cała lista</button>
                <button className={`pill pill-an ${storeFilter === "analizator" ? "on" : ""}`} onClick={() => setStoreFilter("analizator")}>⚡ Analizator</button>
                {storeCompare.map((sc) => (
                  <button key={sc.s} className={`pill ${storeFilter === sc.s ? "on" : ""}`} onClick={() => setStoreFilter(sc.s)}>
                    {sc.s} <b className="pill-sum">{fmt(sc.total)} zł</b>
                  </button>
                ))}
              </div>

              {storeFilter !== "wszystkie" && (() => {
                const sc = storeCompare.find((x) => x.s === storeFilter);
                if (!sc) return null;
                return (
                  <div className="cmp-card inline-cmp">
                    <div className="cmp-head"><b>{sc.s}</b><span className="cmp-total">{fmt(sc.total)} zł</span></div>
                    <div className="cmp-sub">{sc.have.length + sc.noPrice.length} z {listItems.length} produktów z Twojej listy w tym sklepie{sc.missing.length > 0 ? ` · gdzie kupić resztę podpowie ⚡ Analizator` : ""}</div>
                  </div>
                );
              })()}

              {visibleItems.length === 0 && storeFilter !== "analizator" && <p className="muted pad">Żadna pozycja z Twojej listy nie jest dostępna w tym sklepie.</p>}
              {visibleItems.map((x) => {
                const inStoreView = storeFilter !== "wszystkie" && storeFilter !== "analizator";
                /* w widoku sklepu liczymy cenę TEGO sklepu — nie najtańszą z innego */
                const o = inStoreView ? x.p.offers.find((of) => of.s === storeFilter) : chosenOffer(x);
                const options = x.p.offers.filter((of) => of.p != null);
                return (
                  <div key={x.id} className="list-row">
                    <MiniThumb p={x.p} />
                    <div className="list-main">
                      <span className="list-name" onClick={() => onOpenProduct(x.p)}>{x.p.name}</span>
                      {!inStoreView && (
                        <div className="list-sub">
                          <select className="store-sel" value={x.store || ""} onChange={(e) => setItemStore(x.id, e.target.value)}>
                            <option value="">najtaniej{options[0] ? ` — ${options.slice().sort((a, b) => a.p - b.p)[0].s}` : ""}</option>
                            {x.p.offers.map((of) => (
                              <option key={of.s} value={of.s}>{of.s}{of.p != null ? ` — ${fmt(of.p)} zł` : " — cena w sklepie"}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="qty">
                      <button onClick={() => setQty(x.id, x.qty - 1)}>−</button>
                      <span>{x.qty}</span>
                      <button onClick={() => setQty(x.id, x.qty + 1)}>+</button>
                    </div>
                    <b className="list-price">{o?.p != null ? fmt(o.p * x.qty) + " zł" : <span className="muted">cena w sklepie</span>}</b>
                  </div>
                );
              })}

              {storeFilter === "wszystkie" && (
                <div className="list-total">
                  <span>Razem (Twoje wybory{chosenUnknown > 0 ? `, ${chosenUnknown} poz. bez ceny` : ""})</span>
                  <b>{fmt(chosenTotal)} zł</b>
                </div>
              )}

              {storeFilter === "analizator" && (
                <div className="an-wrap">
                  <div className="price-matrix-wrap">
                    <h4 className="offers-h">Gdzie taniej, gdzie drożej <Tip text="Ceny każdej pozycji z Twojej listy we wszystkich sklepach partnerskich. Najniższa cena podświetlona na zielono, najwyższa na czerwono. Kreska = sklep nie ma produktu." /></h4>
                    <div className="matrix-scroll">
                      <table className="price-matrix">
                        <thead><tr><th>Produkt</th>{STORES.map((s) => <th key={s}>{s}</th>)}</tr></thead>
                        <tbody>
                          {listItems.map((x) => {
                            const prices = STORES.map((s) => x.p.offers.find((o) => o.s === s)?.p ?? null);
                            const conf = prices.filter((p) => p != null);
                            const mn = conf.length ? Math.min(...conf) : null;
                            const mx = conf.length ? Math.max(...conf) : null;
                            return (
                              <tr key={x.id}>
                                <td className="pm-name">{x.p.name}{x.qty > 1 ? ` × ${x.qty}` : ""}</td>
                                {prices.map((p, i) => (
                                  <td key={i} className={p == null ? "pm-none" : p === mn && conf.length > 1 && mn !== mx ? "pm-min" : p === mx && conf.length > 1 && mn !== mx ? "pm-max" : ""}>
                                    {p == null ? "—" : fmt(p) + " zł"}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="an-modes">
                    <span className="muted">Optymalizuj wg: <Tip text="„Najniższa cena” dzieli zakupy między sklepy tak, by suma była najmniejsza. „Najmniej jazdy” szuka planu z jak najmniejszą liczbą sklepów do odwiedzenia — czas to też pieniądz. Gdy podłączymy lokalizacje marketów i Twój adres, policzymy tu realne odległości." /></span>
                    <button className={`pill ${anMode === "cena" ? "on" : ""}`} onClick={() => setAnMode("cena")}>Najniższa cena</button>
                    <button className={`pill ${anMode === "odleglosc" ? "on" : ""}`} onClick={() => setAnMode("odleglosc")}>Najmniej jazdy</button>
                  </div>

                  {anMode === "cena" && (() => {
                    const split = {};
                    let splitTotal = 0, splitPriced = 0;
                    listItems.forEach((x) => {
                      const conf = x.p.offers.filter((o) => o.p != null).sort((a, b) => a.p - b.p);
                      const o = conf[0];
                      if (o) { (split[o.s] = split[o.s] || []).push({ x, o }); splitTotal += o.p * x.qty; splitPriced++; }
                    });
                    const bestSingle = storeCompare.filter((sc) => sc.missing.length === 0 && sc.noPrice.length === 0 && sc.have.length === listItems.length)
                      .sort((a, b) => a.total - b.total)[0];
                    const saving = bestSingle ? bestSingle.total - splitTotal : null;
                    return (
                      <div className="split">
                        {Object.entries(split).map(([s, rows]) => (
                          <div key={s} className="split-store">
                            <div className="split-head"><b>W {s} kup:</b><span className="split-sum">{fmt(rows.reduce((a, r) => a + r.o.p * r.x.qty, 0))} zł</span></div>
                            {rows.map((r) => (
                              <div key={r.x.id} className="split-row">
                                <span>{r.x.p.name}{r.x.qty > 1 ? ` × ${r.x.qty}` : ""}</span>
                                <span>{fmt(r.o.p * r.x.qty)} zł</span>
                              </div>
                            ))}
                            <GroupGo s={s} rows={rows} />
                          </div>
                        ))}
                        <div className="split-total"><span>Razem najtaniej ({splitPriced} z {listItems.length} poz. z ceną)</span><b>{fmt(splitTotal)} zł</b></div>
                        {saving != null && saving > 0.005 && (
                          <div className="split-save">Oszczędzasz {fmt(saving)} zł względem kupienia wszystkiego w jednym sklepie ({bestSingle.s}: {fmt(bestSingle.total)} zł).</div>
                        )}
                      </div>
                    );
                  })()}

                  {anMode === "odleglosc" && (() => {
                    /* plan z minimalną liczbą sklepów: najpierw pełne pokrycie w 1 sklepie,
                       potem zachłannie dokładamy sklepy pokrywające resztę */
                    const covered = (sc) => sc.have.length + sc.noPrice.length;
                    const full = storeCompare.filter((sc) => covered(sc) === listItems.length).sort((a, b) => a.total - b.total);
                    if (full.length > 0) {
                      const bestF = full[0];
                      return (
                        <div className="split">
                          <div className="split-store">
                            <div className="split-head"><b>Jeden przystanek: wszystko kupisz w {bestF.s}</b><span className="split-sum">{fmt(bestF.total)} zł</span></div>
                            {bestF.have.map((r) => (
                              <div key={r.x.id} className="split-row"><span>{r.x.p.name}{r.x.qty > 1 ? ` × ${r.x.qty}` : ""}</span><span>{fmt(r.o.p * r.x.qty)} zł</span></div>
                            ))}
                            {bestF.noPrice.map((r) => (
                              <div key={r.x.id} className="split-row"><span>{r.x.p.name}</span><span className="muted">cena w sklepie</span></div>
                            ))}
                            <GroupGo s={bestF.s} rows={[...bestF.have, ...bestF.noPrice]} />
                          </div>
                          <div className="split-total"><span>Razem w jednym sklepie{bestF.noPrice.length > 0 ? ` (+ ${bestF.noPrice.length} poz. z ceną w sklepie)` : ""}</span><b>{fmt(bestF.total)} zł</b></div>
                          {full.length > 1 && <div className="muted" style={{ marginTop: 6 }}>Alternatywa: {full[1].s} — {fmt(full[1].total)} zł.</div>}
                        </div>
                      );
                    }
                    // zachłanne pokrycie kilkoma sklepami
                    let remaining = [...listItems];
                    const plan = [];
                    const scs = [...storeCompare];
                    while (remaining.length > 0 && scs.length > 0) {
                      scs.sort((a, b) => {
                        /* najpierw pokrycie ofertami z potwierdzoną ceną, potem dowolnymi, na końcu tańszy koszyk */
                        const pa = remaining.filter((x) => x.p.offers.some((o) => o.s === a.s && o.p != null)).length;
                        const pb = remaining.filter((x) => x.p.offers.some((o) => o.s === b.s && o.p != null)).length;
                        const ca = remaining.filter((x) => x.p.offers.some((o) => o.s === a.s)).length;
                        const cb = remaining.filter((x) => x.p.offers.some((o) => o.s === b.s)).length;
                        return pb - pa || cb - ca || a.total - b.total;
                      });
                      const pick = scs.shift();
                      const items = remaining.filter((x) => x.p.offers.some((o) => o.s === pick.s));
                      if (items.length === 0) break;
                      plan.push({ s: pick.s, items });
                      remaining = remaining.filter((x) => !items.includes(x));
                    }
                    const stopSum = (st) => st.items.reduce((a, x) => { const o = x.p.offers.find((of) => of.s === st.s && of.p != null); return a + (o ? o.p * x.qty : 0); }, 0);
                    const planTotal = plan.reduce((a, st) => a + stopSum(st), 0);
                    const planPriced = plan.reduce((a, st) => a + st.items.filter((x) => x.p.offers.some((of) => of.s === st.s && of.p != null)).length, 0);
                    return (
                      <div className="split">
                        <div className="muted" style={{ marginBottom: 10 }}>Żaden pojedynczy sklep nie ma całej listy. Najkrótszy plan: {plan.length} {plan.length === 1 ? "sklep" : "sklepy"}.</div>
                        {plan.map((st, i) => (
                          <div key={st.s} className="split-store">
                            <div className="split-head"><b>Przystanek {i + 1}: {st.s}</b><span className="split-sum">{fmt(stopSum(st))} zł</span></div>
                            {st.items.map((x) => {
                              const o = x.p.offers.filter((of) => of.s === st.s)[0];
                              return <div key={x.id} className="split-row"><span>{x.p.name}{x.qty > 1 ? ` × ${x.qty}` : ""}</span><span>{o?.p != null ? fmt(o.p * x.qty) + " zł" : "cena w sklepie"}</span></div>;
                            })}
                            <GroupGo s={st.s} rows={st.items.map((x) => ({ x }))} />
                          </div>
                        ))}
                        <div className="split-total"><span>Razem ({planPriced} z {listItems.length} poz. z ceną · {plan.length} {plan.length === 1 ? "sklep" : "sklepy"})</span><b>{fmt(planTotal)} zł</b></div>
                        {remaining.length > 0 && <div className="cmp-missing"><span className="cmp-missing-t">Poza sklepami partnerskimi:</span>{remaining.map((x) => <div key={x.id} className="cmp-missing-i">• {x.p.name}</div>)}</div>}
                      </div>
                    );
                  })()}
                </div>
              )}

              {(storeFilter === "wszystkie" || storeFilter === "analizator") && (
                <Suggestions listItems={listItems} products={products} user={user} updateUser={updateUser} />
              )}

              {storeFilter !== "analizator" && <>
              <h4 className="offers-h">Przejdź do sklepów (wg Twoich wyborów) <Tip text="Grupujemy Twoją listę wg wybranych sklepów. Jeden klik otwiera strony wszystkich produktów z danego sklepu w nowych kartach — przeglądarka może poprosić o zgodę na wyskakujące okna." /></h4>
              {Object.entries(byStore).filter(([s]) => storeFilter === "wszystkie" || s === storeFilter).map(([s, items]) => {
                const sum = items.reduce((a, i) => a + (i.offer.p ?? 0) * i.qty, 0);
                return (
                  <div key={s} className="offer">
                    <div className="offer-l">
                      <div className="offer-s">{s} <span className="muted">· {fmt(sum)} zł</span></div>
                      <div className="offer-net">{items.length} poz. · {items.map((i) => i.p.name.split(" ").slice(0, 3).join(" ")).join(", ")}</div>
                    </div>
                    <div className="offer-go-wrap">
                      <button className="offer-go" onClick={() => items.forEach((i) => {
                        onClick({ t: Date.now(), product: i.p.name, store: s, price: i.offer.p });
                        window.open(buildAffLink(networks, s, i.offer.url, consent), "_blank", "noopener");
                      })}>Otwórz oferty →</button>
                      <span className="aff-label">linki afiliacyjne</span>
                    </div>
                  </div>
                );
              })}
              </>}
            </>
          )
        )}

        {tab === "ulubione" && (
          <>
            <div className="notify-box">
              <div className="notify-head">
                <b>Powiadomienia o zmianie ceny ulubionych</b>
                <Tip text="Gdy cena któregoś z Twoich ulubionych produktów zmieni się w sklepach partnerskich, wyślemy Ci powiadomienie wybranym kanałem. Wysyłka ruszy wraz z uruchomieniem serwisu." />
              </div>
              <label className="check"><input type="checkbox" checked={!!user.notifyEmail} onChange={(e) => updateUser({ ...user, notifyEmail: e.target.checked })} /><span>E-mail: {user.email}</span></label>
              <label className="check"><input type="checkbox" checked={!!user.notifySms} onChange={(e) => updateUser({ ...user, notifySms: e.target.checked })} /><span>SMS</span></label>
              {user.notifySms && (
                <input className="phone-input" type="tel" placeholder="Numer telefonu, np. 600 100 200" value={user.phone || ""}
                  onChange={(e) => updateUser({ ...user, phone: e.target.value })} />
              )}
            </div>
            {favProducts.length === 0 ? <p className="muted pad">Brak ulubionych. Kliknij ♥ na karcie produktu.</p> : (
              favProducts.map((p) => (
                <div key={p.id} className="list-row">
                  <MiniThumb p={p} />
                  <span className="list-name" onClick={() => onOpenProduct(p)}>{p.name}</span>
                  <b className="list-price">{minP(p) != null ? "od " + fmt(minP(p)) + " zł" : "—"}</b>
                </div>
              ))
            )}
          </>
        )}

      </div>
    </div>
  );
}


/* ---- podpowiedzi „może Ci się przydać" (materiały i narzędzia towarzyszące) ---- */
const SUGGEST_RULES = {
  "Płytki gres": ["Kleje do płytek", "Fugi", "Grunty", "Hydroizolacja", "Uszczelniacze"],
  "Kleje do płytek": ["Grunty", "Fugi", "Płytki gres"],
  "Fugi": ["Uszczelniacze", "Kleje do płytek"],
  "Hydroizolacja": ["Grunty", "Uszczelniacze"],
  "Grunty": ["Kleje do płytek", "Hydroizolacja"],
  "Uszczelniacze": ["Fugi"],
};
const TOOL_HINTS = {
  "Kleje do płytek": ["mieszadło do zapraw", "wiertarka lub mieszarka", "wiadro budowlane", "paca zębata"],
  "Płytki gres": ["system poziomujący / krzyżyki", "przecinarka do płytek", "poziomica"],
  "Fugi": ["paca do fugowania", "gąbka do fug"],
  "Hydroizolacja": ["pędzel lub wałek", "taśma uszczelniająca narożna"],
  "Grunty": ["wałek z kuwetą"],
  "Uszczelniacze": ["pistolet do silikonu", "wygładzik do fug silikonowych"],
};
function Suggestions({ listItems, products, user, updateUser, showLabel }) {
  const ownedIds = new Set(listItems.map((x) => x.id));
  const ownedCats = [...new Set(listItems.map((x) => x.p.cat))];
  const wantCats = [...new Set(ownedCats.flatMap((c) => SUGGEST_RULES[c] || []))].filter((c) => !ownedCats.includes(c));
  const productSugs = wantCats.flatMap((c) => {
    const best = products.filter((p) => p.cat === c && !ownedIds.has(p.id) && minP(p) != null).sort((a, b) => minP(a) - minP(b))[0];
    return best ? [best] : [];
  }).slice(0, 8);
  const toolHints = [...new Set(ownedCats.flatMap((c) => TOOL_HINTS[c] || []))].slice(0, 6);
  if (productSugs.length === 0 && toolHints.length === 0) return null;
  const add = (id) => updateUser({ ...user, list: [...(user.list || []), { id, qty: 1 }] });
  return (
    <div className="sug-box">
      <h4 className="offers-h">Może Ci się przydać <Tip text="Podpowiedzi na podstawie kategorii z Twojej listy — materiały towarzyszące z naszego katalogu (z ceną, do dodania jednym kliknięciem) oraz narzędzia, które warto dorzucić do koszyka w sklepie." /></h4>
      <div className="sug-strip">
        {productSugs.map((p) => (
          <div key={p.id} className="sug-card">
            <span className="sug-card-img"><Thumb cat={p.cat} img={p.img} name={p.name} /></span>
            <span className="sug-card-name">{p.name}</span>
            <span className="sug-card-price">od {fmt(minP(p))} zł</span>
            <button className="cta small sug-card-add" onClick={() => add(p.id)}>+ Dodaj</button>
          </div>
        ))}
      </div>
      {toolHints.length > 0 && (
        <div className="sug-tools-scroll">
          <span className="muted sug-tools-label">Dorzuć w sklepie:</span>
          {toolHints.map((t) => <span key={t} className="tool-chip">🔧 {t}</span>)}
        </div>
      )}
    </div>
  );
}

/* ---------------- miniatura kategorii (SVG) ---------------- */
function Thumb({ cat, img, name }) {
  if (img) {
    return (
      <div className="thumb-photo">
        <img src={img} alt={name || ""} loading="lazy"
          onError={(e) => { e.currentTarget.parentElement.classList.add("broken"); }} />
      </div>
    );
  }
  const themes = {
    "Płytki gres": ["#F4E5C2", "#C9A227"],
    "Kleje do płytek": ["#DDE4F5", "#5B7BC7"],
    Grunty: ["#DCF0E2", "#2E9E4F"],
    Hydroizolacja: ["#D8ECFA", "#2E7DD1"],
    Uszczelniacze: ["#FBE3DA", "#D9663F"],
    Fugi: ["#EFE3FB", "#8A4FD1"],
  };
  const [bgA, main] = themes[cat] || ["#EDEEF0", "#9AA3AD"];
  const gid = "g" + (cat || "x").replace(/[^a-z]/gi, "");
  return (
    <svg viewBox="0 0 200 150" className="thumb" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={bgA} />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect width="200" height="150" fill={"url(#" + gid + ")"} />
      <circle cx="168" cy="18" r="42" fill={main} opacity=".10" />
      <circle cx="20" cy="140" r="30" fill={main} opacity=".08" />
      {cat === "Płytki gres" && (
        <g>
          {[0, 1, 2].map((i) => [0, 1].map((j) => (
            <rect key={i + "-" + j} x={34 + i * 46} y={38 + j * 44} width="42" height="40" rx="3"
              fill={main} opacity={0.55 + ((i + j) % 2) * 0.25} transform={`rotate(-6 ${55 + i * 46} ${58 + j * 44})`} />
          )))}
        </g>
      )}
      {cat === "Kleje do płytek" && (
        <g transform="rotate(-4 100 80)">
          <rect x="66" y="34" width="68" height="88" rx="8" fill={main} />
          <rect x="66" y="34" width="68" height="24" rx="8" fill="#39424E" />
          <rect x="78" y="70" width="44" height="30" rx="4" fill="#fff" opacity=".92" />
          <rect x="83" y="77" width="34" height="5" rx="2.5" fill={main} />
          <rect x="83" y="87" width="22" height="5" rx="2.5" fill="#B9BEC6" />
        </g>
      )}
      {(cat === "Grunty" || cat === "Hydroizolacja") && (
        <g transform="rotate(3 100 80)">
          <rect x="64" y="46" width="72" height="76" rx="7" fill={main} />
          <path d="M64 60 q36 14 72 0 v-7 a7 7 0 0 0 -7 -7 h-58 a7 7 0 0 0 -7 7 z" fill="#39424E" />
          <rect x="86" y="30" width="28" height="18" rx="4" fill="#39424E" />
          <ellipse cx="100" cy="96" rx="24" ry="16" fill="#fff" opacity=".9" />
          <path d="M100 84 c-7 9 -9 13 -9 17 a9 9 0 0 0 18 0 c0-4 -2-8 -9-17z" fill={main} />
        </g>
      )}
      {cat === "Uszczelniacze" && (
        <g transform="rotate(-14 100 78)">
          <rect x="46" y="64" width="96" height="30" rx="15" fill={main} />
          <rect x="136" y="71" width="26" height="16" rx="6" fill="#39424E" />
          <path d="M162 76 h18 l-4 4 4 4 h-18 z" fill={main} opacity=".8" />
          <rect x="56" y="70" width="56" height="18" rx="9" fill="#fff" opacity=".9" />
        </g>
      )}
      {cat === "Fugi" && (
        <g transform="rotate(4 100 80)">
          <rect x="62" y="40" width="76" height="82" rx="8" fill={main} />
          <path d="M62 56 h76 v-8 a8 8 0 0 0 -8 -8 h-60 a8 8 0 0 0 -8 8 z" fill="#39424E" />
          <rect x="74" y="70" width="52" height="34" rx="5" fill="#fff" opacity=".92" />
          <g fill={main} opacity=".85">
            <rect x="80" y="76" width="18" height="10" rx="2" /><rect x="102" y="76" width="18" height="10" rx="2" />
            <rect x="80" y="90" width="18" height="10" rx="2" /><rect x="102" y="90" width="18" height="10" rx="2" />
          </g>
        </g>
      )}
    </svg>
  );
}
function MiniThumb({ p }) {
  return <span className="mini-thumb"><Thumb cat={p.cat} img={p.img} name={p.name} /></span>;
}
function buildAffLink(networks, storeName, targetUrl, consent = true) {
  const cfg = networks[storeName];
  if (!consent) return targetUrl; // brak zgody na cookies → czysty link, bez identyfikatorów
  if (!cfg || !cfg.active) return targetUrl;
  if (!cfg.programId && !cfg.affiliateId) return targetUrl; // brak konfiguracji → link bezpośredni
  return cfg.template
    .replace("{programId}", encodeURIComponent(cfg.programId))
    .replace("{affiliateId}", encodeURIComponent(cfg.affiliateId))
    .replace("{url}", encodeURIComponent(targetUrl));
}

/* ================================================================
   PANEL ADMINISTRATORA
   ================================================================ */
function AdminPanel({ networks, setNetworks, products, setProducts, clicks, users, setUsers, onExit }) {
  const [tab, setTab] = useState("sieci");
  const [genUrl, setGenUrl] = useState("");
  const [genStore, setGenStore] = useState("Castorama");
  const [editProd, setEditProd] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // id oczekujący potwierdzenia
  const [newStore, setNewStore] = useState({ name: "", network: "", programId: "", affiliateId: "", template: "https://siec.example/click?p={programId}&a={affiliateId}&url={url}", commission: 4 });
  const addStore = () => {
    const name = newStore.name.trim();
    if (!name || networks[name]) return;
    setNetworks({ ...networks, [name]: { network: newStore.network.trim() || "—", programId: newStore.programId.trim(), affiliateId: newStore.affiliateId.trim(), template: newStore.template.trim(), commission: +newStore.commission || 0, active: true } });
    setNewStore({ name: "", network: "", programId: "", affiliateId: "", template: "https://siec.example/click?p={programId}&a={affiliateId}&url={url}", commission: 4 });
  };
  const removeStore = (name) => {
    const used = products.filter((p) => p.offers.some((o) => o.s === name)).length;
    if (used > 0) return; // sklep z ofertami — najpierw usuń oferty
    const next = { ...networks }; delete next[name]; setNetworks(next); setConfirmDel(null);
  };

  const updNet = (storeName, field, value) => {
    const next = { ...networks, [storeName]: { ...networks[storeName], [field]: value } };
    setNetworks(next);
  };

  const totalClicks = clicks.length;
  const clicksByStore = clicks.reduce((a, c) => { a[c.store] = (a[c.store] || 0) + 1; return a; }, {});
  const estCommission = clicks.reduce((sum, c) => {
    const cfg = networks[c.store];
    const rate = cfg ? cfg.commission / 100 : 0;
    // szacunek: zakładamy 3% konwersji kliknięć w zakup ceny produktu
    return sum + (c.price || 0) * 0.03 * rate;
  }, 0);

  const saveProduct = (p) => {
    setProducts(products.some((x) => x.id === p.id) ? products.map((x) => (x.id === p.id ? p : x)) : [...products, p]);
    setEditProd(null);
  };

  return (
    <div className="admin">
      <header className="admin-hdr">
        <div className="logo">BOBERO<span className="logo-dot">.</span> <span className="admin-tag">ADMIN</span></div>
        <nav className="admin-nav">
          {[["sieci", "Sieci afiliacyjne"], ["produkty", "Produkty i oferty"], ["generator", "Generator linków"], ["uzytkownicy", "Użytkownicy"], ["statystyki", "Statystyki"], ["ustawienia", "Ustawienia"]].map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>
        <button className="linkbtn" onClick={onExit}>Podgląd sklepu →</button>
      </header>

      <main className="admin-main">
        {tab === "sieci" && (
          <section>
            <h2>Sieci afiliacyjne</h2>
            <p className="muted"><Tip text="ID programu i ID partnera znajdziesz w panelu sieci afiliacyjnej po akceptacji do programu danego sklepu. Szablon linku to wzór, w który podstawiamy Twoje identyfikatory i adres produktu." /> Wpisz identyfikatory z paneli Tradedoubler / Admitad / Awin. Bez nich linki prowadzą bezpośrednio do sklepu (bez prowizji). Szablon linku: użyj <code>{"{programId}"}</code>, <code>{"{affiliateId}"}</code> i <code>{"{url}"}</code>.</p>
            {Object.entries(networks).map(([storeName, cfg]) => (
              <div key={storeName} className="net-card">
                <div className="net-head">
                  <b>{storeName}</b>
                  <span className="net-name">{cfg.network}</span>
                  <label className="switch">
                    <input type="checkbox" checked={cfg.active} onChange={(e) => updNet(storeName, "active", e.target.checked)} />
                    <span>{cfg.active ? "Aktywna" : "Wyłączona"}</span>
                  </label>
                </div>
                <div className="net-grid">
                  <label>Sieć<input value={cfg.network} onChange={(e) => updNet(storeName, "network", e.target.value)} /></label>
                  <label>ID programu<input value={cfg.programId} placeholder="np. 12345" onChange={(e) => updNet(storeName, "programId", e.target.value)} /></label>
                  <label>ID partnera (Twój)<input value={cfg.affiliateId} placeholder="np. bobero-7788" onChange={(e) => updNet(storeName, "affiliateId", e.target.value)} /></label>
                  <label>Prowizja %<input type="number" step="0.1" value={cfg.commission} onChange={(e) => updNet(storeName, "commission", +e.target.value)} /></label>
                  <label className="wide">Szablon linku<input value={cfg.template} onChange={(e) => updNet(storeName, "template", e.target.value)} /></label>
                </div>
                <div className="net-preview net-preview-row">
                  <span>Podgląd: <code>{buildAffLink(networks, storeName, "https://przyklad.pl/produkt").slice(0, 110)}…</code></span>
                  {(() => {
                    const used = products.filter((p) => p.offers.some((o) => o.s === storeName)).length;
                    if (used > 0) return <span className="muted">w użyciu: {used} prod.</span>;
                    return confirmDel === "net:" + storeName
                      ? <button className="danger-btn solid" onClick={() => removeStore(storeName)}>Na pewno usunąć sklep?</button>
                      : <button className="danger-btn" onClick={() => setConfirmDel("net:" + storeName)}>Usuń sklep</button>;
                  })()}
                </div>
              </div>
            ))}

            <div className="net-card net-new">
              <div className="net-head"><b>＋ Dodaj nowy sklep partnerski</b></div>
              <div className="net-grid">
                <label>Nazwa sklepu<input value={newStore.name} placeholder="np. Bricomarché" onChange={(e) => setNewStore({ ...newStore, name: e.target.value })} /></label>
                <label>Sieć afiliacyjna<input value={newStore.network} placeholder="np. Awin, MyLead" onChange={(e) => setNewStore({ ...newStore, network: e.target.value })} /></label>
                <label>ID programu<input value={newStore.programId} onChange={(e) => setNewStore({ ...newStore, programId: e.target.value })} /></label>
                <label>ID partnera (Twój)<input value={newStore.affiliateId} onChange={(e) => setNewStore({ ...newStore, affiliateId: e.target.value })} /></label>
                <label className="wide">Szablon linku (z {"{programId}"}, {"{affiliateId}"}, {"{url}"})<input value={newStore.template} onChange={(e) => setNewStore({ ...newStore, template: e.target.value })} /></label>
                <label>Prowizja %<input type="number" step="0.1" value={newStore.commission} onChange={(e) => setNewStore({ ...newStore, commission: e.target.value })} /></label>
              </div>
              {newStore.name.trim() && networks[newStore.name.trim()] && <div className="warn">Sklep o tej nazwie już istnieje.</div>}
              <div className="row-end">
                <button className="cta small" disabled={!newStore.name.trim() || !!networks[newStore.name.trim()]} onClick={addStore}>Dodaj sklep</button>
              </div>
            </div>
            <p className="muted">Nowy sklep od razu pojawia się na liście sklepów przy dodawaniu ofert produktów oraz w porównaniu listy zakupowej. Sklep można usunąć tylko, gdy żaden produkt nie ma jego oferty.</p>
          </section>
        )}

        {tab === "produkty" && (
          <section>
            <div className="row-between">
              <h2>Produkty i oferty ({products.length})</h2>
              <button className="cta small" onClick={() => setEditProd({ id: "prod-" + Date.now(), name: "", cat: "Kleje do płytek", brand: "", unit: "szt", rating: 0, reviews: 0, features: [], offers: [] })}>+ Dodaj produkt</button>
            </div>
            <p className="muted">Cena „—" = niepotwierdzona; produkt wyświetla się z przyciskiem „Sprawdź cenę w sklepie". Ceny zebrane {PRICE_DATE}.</p>
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Produkt</th><th>Kategoria</th><th>Oferty</th><th>Najniższa</th><th></th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.cat}</td>
                    <td>{p.offers.map((o) => `${o.s}${o.p != null ? ` ${fmt(o.p)} zł` : " (—)"}`).join(" · ")}</td>
                    <td>{minP(p) != null ? `${fmt(minP(p))} zł` : "—"}</td>
                    <td className="row-actions">
                      <button onClick={() => setEditProd(JSON.parse(JSON.stringify(p)))}>Edytuj</button>
                      {confirmDel === p.id ? (
                        <button className="danger solid" onClick={() => { setProducts(products.filter((x) => x.id !== p.id)); setConfirmDel(null); }}>Na pewno usunąć?</button>
                      ) : (
                        <button className="danger" onClick={() => setConfirmDel(p.id)}>Usuń</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>

            {editProd && (
              <div className="overlay" onClick={() => setEditProd(null)}>
                <div className="sheet" onClick={(e) => e.stopPropagation()}>
                  <h3>{products.some((x) => x.id === editProd.id) ? "Edytuj produkt" : "Nowy produkt"}</h3>
                  <div className="form-grid">
                    <label className="wide">Nazwa<input value={editProd.name} onChange={(e) => setEditProd({ ...editProd, name: e.target.value })} /></label>
                    <label>Kategoria<input value={editProd.cat} onChange={(e) => setEditProd({ ...editProd, cat: e.target.value })} /></label>
                    <label>Marka<input value={editProd.brand} onChange={(e) => setEditProd({ ...editProd, brand: e.target.value })} /></label>
                    <label>Jednostka<input value={editProd.unit} onChange={(e) => setEditProd({ ...editProd, unit: e.target.value })} /></label>
                    <label className="wide">Cechy (po przecinku)<input value={editProd.features.join(", ")} onChange={(e) => setEditProd({ ...editProd, features: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></label>
                    <label className="wide">Opis produktu<textarea rows="3" value={editProd.desc || ""} onChange={(e) => setEditProd({ ...editProd, desc: e.target.value })} /></label>
                    <label className="wide">Zastosowanie (po przecinku)<input value={(editProd.uses || []).join(", ")} onChange={(e) => setEditProd({ ...editProd, uses: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></label>
                    <label className="wide">Dane techniczne (linia = „Cecha: wartość")<textarea rows="3" value={(editProd.specs || []).join("\n")} onChange={(e) => setEditProd({ ...editProd, specs: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} /></label>
                    <label className="wide">Adres zdjęcia produktu (URL) <Tip text="Wklej adres oficjalnego zdjęcia producenta (np. z materiałów prasowych Atlas, Ceresit) albo zdjęcia z pliku produktowego sieci afiliacyjnej — te są licencjonowane dla partnerów. Odradzamy kopiowanie zdjęć bezpośrednio ze stron sklepów bez zgody: to ich materiały chronione prawem autorskim." /><input value={editProd.img || ""} placeholder="https://…/zdjecie.jpg (puste = ilustracja kategorii)" onChange={(e) => setEditProd({ ...editProd, img: e.target.value })} /></label>
                  </div>
                  <h4>Oferty sklepów</h4>
                  {editProd.offers.map((o, i) => (
                    <div key={i} className="offer-edit">
                      <select value={o.s} onChange={(e) => { const of = [...editProd.offers]; of[i] = { ...o, s: e.target.value }; setEditProd({ ...editProd, offers: of }); }}>
                        {Object.keys(networks).map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <input type="number" step="0.01" placeholder="Cena (puste = —)" value={o.p ?? ""} onChange={(e) => { const of = [...editProd.offers]; of[i] = { ...o, p: e.target.value === "" ? null : +e.target.value }; setEditProd({ ...editProd, offers: of }); }} />
                      <input placeholder="Adres strony produktu w sklepie" value={o.url} onChange={(e) => { const of = [...editProd.offers]; of[i] = { ...o, url: e.target.value }; setEditProd({ ...editProd, offers: of }); }} />
                      <button className="danger" onClick={() => setEditProd({ ...editProd, offers: editProd.offers.filter((_, j) => j !== i) })}>×</button>
                    </div>
                  ))}
                  <button className="linkbtn" onClick={() => setEditProd({ ...editProd, offers: [...editProd.offers, { s: Object.keys(networks)[0], p: null, url: "" }] })}>+ Dodaj ofertę</button>
                  <div className="row-end">
                    <button className="linkbtn" onClick={() => setEditProd(null)}>Anuluj</button>
                    <button className="cta small" disabled={!editProd.name} onClick={() => saveProduct(editProd)}>Zapisz</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "generator" && (
          <section>
            <h2>Generator linków afiliacyjnych</h2>
            <p className="muted">Wklej adres dowolnej strony produktu w sklepie partnera, a otrzymasz gotowy link z Twoimi identyfikatorami.</p>
            <div className="gen">
              <select value={genStore} onChange={(e) => setGenStore(e.target.value)}>
                {Object.keys(networks).map((s) => <option key={s}>{s}</option>)}
              </select>
              <input placeholder="https://www.castorama.pl/…" value={genUrl} onChange={(e) => setGenUrl(e.target.value)} />
            </div>
            {genUrl && (
              <div className="gen-out">
                <code>{buildAffLink(networks, genStore, genUrl)}</code>
                <button className="cta small" onClick={() => navigator.clipboard && navigator.clipboard.writeText(buildAffLink(networks, genStore, genUrl))}>Kopiuj</button>
              </div>
            )}
            {(!networks[genStore].programId && !networks[genStore].affiliateId) && (
              <div className="warn">Brak identyfikatorów dla {genStore} — link będzie bezpośredni, bez prowizji. Uzupełnij zakładkę „Sieci afiliacyjne".</div>
            )}
          </section>
        )}

        {tab === "uzytkownicy" && (
          <section>
            <h2>Użytkownicy ({users.length})</h2>
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Imię i nazwisko</th><th>E-mail</th><th>Typ</th><th>Zarejestrowano</th><th>Lista / Ulubione</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}{u.type === "firma" && <div className="muted">{u.company} · NIP {u.nip}</div>}</td>
                    <td>{u.email}</td>
                    <td>{u.type === "firma" ? "Firmowe" : "Prywatne"}</td>
                    <td>{new Date(u.created).toLocaleDateString("pl-PL")}</td>
                    <td>{u.list.length} / {u.favs.length}</td>
                    <td className="row-actions">
                      {confirmDel === u.id ? (
                        <button className="danger solid" onClick={() => { setUsers(users.filter((x) => x.id !== u.id)); setConfirmDel(null); }}>Na pewno usunąć?</button>
                      ) : (
                        <button className="danger" onClick={() => setConfirmDel(u.id)}>Usuń</button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="muted">Brak zarejestrowanych użytkowników.</td></tr>}
              </tbody>
            </table></div>
            <p className="disclosure">Hasła są przechowywane wyłącznie jako skróty — nie da się ich odczytać z panelu.</p>
          </section>
        )}

        {tab === "statystyki" && (
          <section>
            <h2>Statystyki</h2>
            <div className="stat-grid">
              <div className="stat"><div className="stat-n">{totalClicks}</div><div className="stat-l">kliknięć w oferty</div></div>
              {Object.entries(clicksByStore).map(([s, n]) => (
                <div className="stat" key={s}><div className="stat-n">{n}</div><div className="stat-l">{s}</div></div>
              ))}
              <div className="stat"><div className="stat-n">{fmt(estCommission)} zł</div><div className="stat-l">szacowana prowizja (3% konwersji)</div></div>
            </div>
            <h4>Dziennik kliknięć (ostatnie 50)</h4>
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Kiedy</th><th>Produkt</th><th>Sklep</th><th>Cena</th></tr></thead>
              <tbody>
                {clicks.slice(-50).reverse().map((c, i) => (
                  <tr key={i}><td>{new Date(c.t).toLocaleString("pl-PL")}</td><td>{c.product}</td><td>{c.store}</td><td>{c.price != null ? `${fmt(c.price)} zł` : "—"}</td></tr>
                ))}
                {clicks.length === 0 && <tr><td colSpan={4} className="muted">Brak kliknięć — przejdź do sklepu i kliknij dowolną ofertę.</td></tr>}
              </tbody>
            </table></div>
          </section>
        )}

        {tab === "ustawienia" && (
          <section>
            <h2>Ustawienia</h2>
            <div className="net-card">
              <b>Dostęp do panelu</b>
              <p className="muted">Panel administratora jest dostępny wyłącznie z konta administratora (pierwsze zarejestrowane konto w serwisie). Wejście: awatar → „Panel administratora". Logujesz się swoim hasłem konta.</p>
            </div>
            <div className="net-card">
              <b>Dane cen</b>
              <p className="muted">Ceny w katalogu zostały zebrane ręcznie {PRICE_DATE} ze stron sklepów. Docelowo źródłem będą pliki produktowe (XML) z sieci afiliacyjnych — import zastąpi ręczną edycję.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* ================================================================
   SKLEP (widok klienta)
   ================================================================ */
function Card({ p, onOpen, fav, toggleFav, onAddList, inList }) {
  const best = minP(p);
  const confirmed = p.offers.filter((o) => o.p != null).sort((a, b) => a.p - b.p);
  const unconfirmed = p.offers.filter((o) => o.p == null);
  return (
    <article className="card" onClick={() => onOpen(p)}>
      <div className="card-media">
        <Thumb cat={p.cat} img={p.img} name={p.name} />
        {p.badge && <span className={`badge ${p.badge.startsWith("Promocja") ? "b-promo" : "b-best"}`}>{p.badge}</span>}
        <button className={`fav ${fav ? "on" : ""}`} aria-label="Dodaj do ulubionych"
          onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}>♥</button>
      </div>
      <div className="card-body">
        <div className="brand">{p.brand}</div>
        <h3 className="pname">{p.name}</h3>
        <div className="price-row">
          {best != null ? (
            <div>
              <div className="from">od</div>
              <div className="price">{fmt(best)} <span className="cur">zł</span><span className="per">/{p.unit}</span></div>
            </div>
          ) : (
            <div className="price-ask">Sprawdź cenę w sklepie</div>
          )}
          <div className="stores">{p.offers.length} {p.offers.length === 1 ? "sklep" : "sklepy"}</div>
        </div>
        <div className="compare">
          {confirmed.map((o, i) => (
            <div key={o.s} className={`chip ${i === 0 ? "cheapest" : ""}`}>
              <span className="chip-s">{o.s}</span>
              {o.oldP && <span className="chip-old">{fmt(o.oldP)}</span>}
              <span className="chip-p">{fmt(o.p)} zł</span>
              
            </div>
          ))}
          {unconfirmed.map((o) => (
            <div key={o.s} className="chip"><span className="chip-s">{o.s}</span><span className="chip-p muted">cena w sklepie</span></div>
          ))}
        </div>
        <div className="card-actions">
          <button className="cta" onClick={(e) => { e.stopPropagation(); onOpen(p); }}>Zobacz oferty</button>
          <button className={`cta ghost ${inList ? "in-list" : ""}`} title={inList ? "Usuń z listy zakupowej" : "Dodaj do listy zakupowej"}
            onClick={(e) => { e.stopPropagation(); onAddList(p.id); }}>{inList ? "✓ Na liście" : "+ Na listę"}</button>
        </div>
      </div>
    </article>
  );
}

function Detail({ p, networks, onClose, onClick, onAff, fav, toggleFav, onAddList, consent, inList, city }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const sorted = [...p.offers].sort((a, b) => (a.p ?? Infinity) - (b.p ?? Infinity));
  const go = (o) => {
    onClick({ t: Date.now(), product: p.name, store: o.s, price: o.p });
    if (onAff) onAff();
    window.open(buildAffLink(networks, o.s, o.url, consent), "_blank", "noopener");
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={p.name}>
        <button className="sheet-back" onClick={onClose}>← Wróć</button>
        <button className="close" onClick={onClose} aria-label="Zamknij">×</button>
        <div className="sheet-grid">
          <div className="sheet-media"><Thumb cat={p.cat} img={p.img} name={p.name} /></div>
          <div>
            <div className="brand">{p.brand} · {p.cat}</div>
            <h2 className="sheet-title">{p.name}</h2>
            <div className="tags">{p.features.map((f) => <span key={f} className="tag">{f}</span>)}</div>
            <div className="detail-actions">
              <button className={`fav-line ${fav ? "on" : ""}`} onClick={() => toggleFav(p.id)}>
                {fav ? "♥ W ulubionych" : "♡ Dodaj do ulubionych"}
              </button>
              <button className={`fav-line ${inList ? "on-list" : ""}`} onClick={() => onAddList(p.id)}>{inList ? "✓ Na liście zakupowej" : "+ Na listę zakupową"}</button>
            </div>
          </div>
        </div>
        <h4 className="offers-h">Oferty sklepów · {p.unit} · ceny z {PRICE_DATE} <Tip text="Porównujemy cenę tego samego produktu w sklepach partnerskich. Oferty sortujemy zawsze od najniższej potwierdzonej ceny. Klik w „Przejdź” otwiera stronę produktu w sklepie — tam finalizujesz zakup." /></h4>
        <div className="offers">
          {sorted.map((o, i) => (
            <div key={o.s} className={`offer ${i === 0 && o.p != null ? "best" : ""}`}>
              <div className="offer-l">
                <div className="offer-s">{o.s}</div>
                <div className="offer-net">przez {networks[o.s]?.network || "—"}{o.note ? ` · ${o.note}` : ""}</div>
              </div>
              <div className="offer-p">
                {o.oldP && <span className="chip-old big">{fmt(o.oldP)}</span>}
                {o.p != null ? `${fmt(o.p)} zł` : <span className="muted">cena w sklepie</span>}
              </div>
              <div className="offer-go-wrap">
                <button className="offer-go" onClick={() => go(o)}>{o.p != null ? "Przejdź →" : "Sprawdź →"}</button>
                <span className="aff-label">link afiliacyjny <Tip text="Jeśli kupisz w sklepie po przejściu z BOBERO, sklep wypłaci nam prowizję. Ty płacisz dokładnie tyle samo — prowizja nie podnosi ceny." /></span>
              </div>
            </div>
          ))}
        </div>
        {(p.desc || p.uses?.length || p.specs?.length) && (
          <div className="pinfo">
            {p.desc && (<><h4 className="offers-h">Opis produktu</h4><p className="pinfo-desc">{p.desc}</p></>)}
            {p.uses?.length > 0 && (<><h4 className="offers-h">Zastosowanie</h4>
              <div className="pinfo-uses">{p.uses.map((u) => <span key={u} className="use-chip">✓ {u}</span>)}</div></>)}
            {p.specs?.length > 0 && (<><h4 className="offers-h">Dane techniczne</h4>
              <table className="spec-table"><tbody>
                {p.specs.map((s) => { const [k, ...v] = s.split(":"); return <tr key={s}><td>{k}</td><td>{v.join(":").trim()}</td></tr>; })}
              </tbody></table></>)}
            <p className="muted">Dane na podstawie kart produktów producentów; przed zakupem zweryfikuj parametry na stronie sklepu.</p>
          </div>
        )}
        <p className="pickup-note">🏬 Wolisz kupić tu i teraz? Ten produkt zwykle znajdziesz od ręki w marketach w {city} — po przejściu do sklepu sprawdzisz dostępność w konkretnym markecie i zamówisz odbiór osobisty. <Tip text="Sklepy partnerskie pokazują na swoich stronach stan magazynowy każdego marketu. Zakup online z odbiorem w markecie liczy się do prowizji tak samo jak dostawa kurierem." /></p>
        <p className="disclosure">
          BOBERO otrzymuje prowizję, jeśli kupisz w sklepie partnera — nie wpływa to na cenę dla Ciebie.
          Ceny zebrano {PRICE_DATE}; aktualna cena obowiązuje w sklepie.
        </p>
        <button className="sheet-close-bottom" onClick={onClose}>Zamknij</button>
      </div>
    </div>
  );
}




function BottomNav({ view, cartCount, onHome, onSearch, onCart, onStores, onAccount, accountActive, cartActive, storesActive }) {
  const Item = ({ icon, label, active, onClick, badge }) => (
    <button className={`bnav-item ${active ? "on" : ""}`} onClick={onClick}>
      <span className="bnav-ico">{icon}{badge > 0 && <span className="bnav-badge">{badge}</span>}</span>
      <span className="bnav-label">{label}</span>
    </button>
  );
  return (
    <nav className="bnav" aria-label="Nawigacja dolna">
      <Item icon="🏠" label="Start" active={view === "home" && !accountActive && !cartActive} onClick={onHome} />
      <Item icon="▦" label="Produkty" active={(view === "products" || view === "shop") && !accountActive && !cartActive} onClick={onSearch} />
      <Item icon="📍" label="Sklepy" active={storesActive} onClick={onStores} />
      <Item icon="🛒" label="Koszyk" active={cartActive} onClick={onCart} badge={cartCount} />
      <Item icon="👤" label="Moje konto" active={accountActive} onClick={onAccount} />
    </nav>
  );
}

/* ---- podpowiedzi wyszukiwania w stylu Castorama/Leroy Merlin ---- */
const POPULAR_SEARCHES = ["klej do płytek", "gres 60×60", "silikon sanitarny", "grunt", "hydroizolacja", "fuga"];
function SearchSuggest({ q, products, recent, onPick, onCat, onRecent, onClearRecent }) {
  const ql = q.trim().toLowerCase();
  if (ql.length < 2) {
    // puste pole: ostatnio szukane + popularne
    return (
      <div className="sug">
        {recent.length > 0 && (
          <div className="sug-sec">
            <div className="sug-sec-h">Ostatnio szukane <button className="linkbtn sug-clear" onMouseDown={onClearRecent}>Wyczyść</button></div>
            <div className="sug-chips">{recent.map((r) => <button key={r} className="sug-chip" onMouseDown={() => onRecent(r)}>🕐 {r}</button>)}</div>
          </div>
        )}
        <div className="sug-sec">
          <div className="sug-sec-h">Popularne</div>
          <div className="sug-chips">{POPULAR_SEARCHES.map((r) => <button key={r} className="sug-chip" onMouseDown={() => onRecent(r)}>🔥 {r}</button>)}</div>
        </div>
      </div>
    );
  }
  const prods = products.filter((p) => (`${p.name} ${p.brand} ${p.cat}`).toLowerCase().includes(ql)).slice(0, 6);
  const cats = TAXONOMY.flatMap((c) => c.subs.filter((s) => s.match && s.name.toLowerCase().includes(ql)).map((s) => ({ label: `${s.name} · ${c.name}`, match: s.match }))).slice(0, 2);
  if (prods.length === 0 && cats.length === 0) {
    return <div className="sug"><div className="sug-empty">Brak wyników dla „{q.trim()}" — sprawdź pisownię albo użyj krótszej frazy.</div></div>;
  }
  return (
    <div className="sug">
      {cats.map((c) => (
        <button key={c.label} className="sug-row sug-cat" onMouseDown={() => onCat(c.match, q)}>
          <span className="sug-ico">📂</span><span>{c.label}</span>
        </button>
      ))}
      {prods.map((p) => (
        <button key={p.id} className="sug-row" onMouseDown={() => onPick(p, q)}>
          <MiniThumb p={p} />
          <span className="sug-name">{p.name}<span className="sug-brand">{p.brand} · {p.cat}</span></span>
          <span className="sug-price">{minP(p) != null ? `od ${fmt(minP(p))} zł` : "cena w sklepie"}</span>
        </button>
      ))}
    </div>
  );
}

/* ---- zakładka Produkty: duże karty kategorii jak w aplikacji Leroy Merlin ---- */
function ProductsPage({ products, q, setQ, goCat, goShop, openProduct, recent, saveRecent, clearRecent, showToast, initialCat }) {
  const [mainCat, setMainCat] = useState(initialCat || null);
  const [sugOpen, setSugOpen] = useState(false);
  const sel = TAXONOMY.find((c) => c.name === mainCat);
  const countFor = (match) => (match ? products.filter((p) => p.cat === match).length : 0);
  return (
    <div className="pcat-page">
      <div className="pcat-in">
        {mainCat ? (
          <div className="pcat-title-row">
            <button className="back-btn" onClick={() => setMainCat(null)}>←</button>
            <h1 className="pcat-title">{mainCat}</h1>
          </div>
        ) : (
          <h1 className="pcat-title">Produkty</h1>
        )}

        <div className="pcat-search-row">
          <div className="pcat-search">
            <svg viewBox="0 0 24 24" className="hs-ico"><circle cx="10.5" cy="10.5" r="7" fill="none" stroke="#6B7280" strokeWidth="2.2"/><path d="M16 16l5.5 5.5" stroke="#6B7280" strokeWidth="2.2"/></svg>
            <input value={q}
              onChange={(e) => { setQ(e.target.value); setSugOpen(true); }}
              onFocus={() => setSugOpen(true)}
              onBlur={() => setTimeout(() => setSugOpen(false), 180)}
              onKeyDown={(e) => { if (e.key === "Enter") { saveRecent(q); setSugOpen(false); goShop(); } }}
              placeholder="Czego szukasz?" />
            {sugOpen && (
              <SearchSuggest q={q} products={products} recent={recent}
                onPick={(p, term) => { saveRecent(term || p.name); setSugOpen(false); openProduct(p); }}
                onCat={(match, term) => { saveRecent(term); setSugOpen(false); goCat(match); }}
                onRecent={(r) => { setQ(r); saveRecent(r); setSugOpen(false); goShop(); }}
                onClearRecent={clearRecent} />
            )}
          </div>
        </div>

        {!mainCat ? (
          <div className="pcat-grid">
            {TAXONOMY.map((c) => (
              <button key={c.name} className="pcat-card" onClick={() => setMainCat(c.name)}>
                <span className="pcat-img" style={{ background: `linear-gradient(135deg, ${c.bg} 0%, #fff 130%)` }}>
                  <span className="pcat-emoji">{c.emoji}</span>
                </span>
                <span className="pcat-name">{c.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="pcat-grid">
            {sel.subs.map((s) => {
              const n = countFor(s.match);
              return (
                <button key={s.name} className={`pcat-card ${!s.match || n === 0 ? "soon" : ""}`}
                  onClick={() => { if (s.match && n > 0) goCat(s.match); else showToast("Ta kategoria wypełni się po podłączeniu plików produktowych sklepów."); }}>
                  <span className="pcat-img" style={{ background: `linear-gradient(135deg, ${sel.bg} 0%, #fff 130%)` }}>
                    <span className="pcat-emoji">{s.emoji}</span>
                  </span>
                  <span className="pcat-name">{s.name}{n > 0 && <span className="pcat-n">{n}</span>}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


/* ---- przewijany pasek marek sklepów partnerskich (stonowany) ---- */
const BRAND_STYLE = {
  Castorama: { c: "#0057A3", w: 800 },
  "Leroy Merlin": { c: "#78BE20", w: 800 },
  OBI: { c: "#FF7313", w: 900 },
};
function PagedStrip({ children }) {
  const kids = React.Children.toArray(children);
  const pages = [];
  for (let i = 0; i < kids.length; i += 2) pages.push(kids.slice(i, i + 2));
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
  const onScroll = (e) => { const el = e.target; setIdx(Math.min(pages.length - 1, Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))); };
  return (
    <div className="pstrip-wrap">
      {pages.length > 1 && (
        <div className="pdots" aria-label={`strona ${idx + 1} z ${pages.length}`}>
          {pages.map((_, i) => <span key={i} className={"pdot" + (i === idx ? " on" : "")} />)}
        </div>
      )}
      <div className="pstrip" ref={ref} onScroll={onScroll}>
        {pages.map((pair, i) => <div className="ppage" key={i}>{pair}</div>)}
      </div>
    </div>
  );
}
function StoresPage({ city, setCity, address, setAddress, pins, setPins, networks, showToast }) {
  const [mode, setMode] = useState("mapa");
  const [sq, setSq] = useState("");
  const [sqOpen, setSqOpen] = useState(false);
  const [chainFilter, setChainFilter] = useState(null);
  const chains = Object.keys(networks);
  const ql = sq.trim().toLowerCase();
  const sugChains = ql ? chains.filter((c) => c.toLowerCase().includes(ql)) : chains;
  const sugCities = ql.length >= 2 ? Object.keys(CITY_COORDS).filter((c) => c.toLowerCase().startsWith(ql)).slice(0, 6) : [];
  const sugPins = ql.length >= 2 ? pins.filter((p) => p.name.toLowerCase().includes(ql)).slice(0, 4) : [];
  const pickChain = (c) => { setChainFilter(c); setSq(c); setSqOpen(false); setMode("lista"); };
  const pickCity = (c) => { setCity(c); setAddress(c); setSq(""); setSqOpen(false); showToast(`Pokazuję sklepy: ${c}`); };
  return (
    <div className="stores-page">
      <div className="stores-in">
        <div className="stores-search">
          <svg viewBox="0 0 24 24" className="hs-ico"><circle cx="10.5" cy="10.5" r="7" fill="none" stroke="#6B7280" strokeWidth="2.2"/><path d="M16 16l5.5 5.5" stroke="#6B7280" strokeWidth="2.2"/></svg>
          <input value={sq}
            onChange={(e) => { setSq(e.target.value); setSqOpen(true); if (!e.target.value.trim()) setChainFilter(null); }}
            onFocus={() => setSqOpen(true)}
            onBlur={() => setTimeout(() => setSqOpen(false), 180)}
            placeholder="Nazwa sklepu, miasto, kod pocztowy…" />
          {sq && <button className="sx" onClick={() => { setSq(""); setChainFilter(null); }}>×</button>}
          {sqOpen && (
            <div className="sug">
              {sugChains.length > 0 && (
                <div className="sug-sec">
                  <div className="sug-sec-h">Sklepy</div>
                  {sugChains.map((c) => (
                    <button key={c} className="sug-row" onMouseDown={() => pickChain(c)}>
                      <span className="sug-ico">🏬</span><span className="sug-name">{c}<span className="sug-brand">pokaż markety tej sieci</span></span>
                    </button>
                  ))}
                </div>
              )}
              {sugCities.length > 0 && (
                <div className="sug-sec">
                  <div className="sug-sec-h">Miasta</div>
                  {sugCities.map((c) => (
                    <button key={c} className="sug-row" onMouseDown={() => pickCity(c)}>
                      <span className="sug-ico">📍</span><span className="sug-name">{c}</span>
                    </button>
                  ))}
                </div>
              )}
              {sugPins.length > 0 && (
                <div className="sug-sec">
                  <div className="sug-sec-h">Twoje miejsca</div>
                  {sugPins.map((p, i) => (
                    <button key={i} className="sug-row" onMouseDown={() => { setSq(p.name); setSqOpen(false); setMode("mapa"); showToast("Miejsce znajdziesz na mapie ⭐"); }}>
                      <span className="sug-ico">⭐</span><span className="sug-name">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {ql.length >= 2 && sugChains.length === 0 && sugCities.length === 0 && sugPins.length === 0 && (
                <div className="sug-empty">Brak podpowiedzi — wpisz nazwę miasta (np. Bydgoszcz) albo sklepu (np. Castorama).</div>
              )}
            </div>
          )}
        </div>
        <div className="stores-tabs">
          <button className={mode === "mapa" ? "on" : ""} onClick={() => setMode("mapa")}>Mapa</button>
          <button className={mode === "lista" ? "on" : ""} onClick={() => setMode("lista")}>Lista</button>
        </div>

        {mode === "mapa" ? (
          <MapSection city={city} setCity={setCity} address={address} setAddress={setAddress}
            pins={pins} setPins={setPins} networks={networks} showToast={showToast} tall />
        ) : (
          <div className="stores-list">
            <h4 className="offers-h">Sklepy partnerskie — {city}{chainFilter ? ` · ${chainFilter}` : ""}
              {chainFilter && <button className="pill on chain-chip" onClick={() => { setChainFilter(null); setSq(""); }}>{chainFilter} ×</button>}
            </h4>
            {chains.filter((s) => !chainFilter || s === chainFilter).map((s) => (
              <div key={s} className="store-li">
                <div className="store-li-main">
                  <b>{s}</b>
                  <span className="muted">{city} i okolice</span>
                </div>
                <a className="nearby-link" href={STORE_LOCATORS[s] || "#"} target="_blank" rel="noopener noreferrer">Lokalizator i godziny →</a>
              </div>
            ))}
            <p className="muted">Dokładne adresy i godziny otwarcia marketów znajdziesz w oficjalnym lokalizatorze każdej sieci.</p>
            {pins.length > 0 && (
              <>
                <h4 className="offers-h">⭐ Twoje miejsca</h4>
                {pins.map((p, i) => (
                  <div key={i} className="store-li">
                    <div className="store-li-main"><b>⭐ {p.name}</b><span className="muted">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</span></div>
                    <button className="danger-btn" onClick={() => { setPins(pins.filter((_, j) => j !== i)); showToast("Usunięto miejsce."); }}>Usuń</button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- pełnoekranowe strony artykułów: lista i artykuł z produktami ---- */
function ArticlesPage({ kind, onOpen, onClose }) {
  const list = kind === "inspiracje" ? INSPIRATIONS : GUIDES;
  return (
    <div className="page-wrap">
      <div className="sheet as-page art-list">
        <button className="sheet-back" onClick={onClose}>← Wróć</button>
        <h2 className="acc-sec-title">{kind === "inspiracje" ? "Inspiracje" : "Poradniki"}</h2>
        {list.map((g) => (
          <button key={g.id} className="art-li" style={kind === "inspiracje" ? { background: g.grad } : undefined} onClick={() => onOpen(g)}>
            <span className="art-li-ico">{g.e || "📖"}</span>
            <span className="art-li-main">
              <b>{g.t}</b>
              <span className="muted">{(g.body || "").slice(0, 90)}…</span>
            </span>
            <span className="acc-row-arrow">→</span>
          </button>
        ))}
        <p className="muted">Nowe poradniki i inspiracje będą dochodzić wraz z rozwojem serwisu.</p>
      </div>
    </div>
  );
}
function ArticleView({ g, products, onOpenProduct, onGoCat, onClose }) {
  const related = g.cat ? products.filter((p) => p.cat === g.cat).slice(0, 8) : [];
  return (
    <div className="page-wrap">
      <div className="sheet as-page article">
        <button className="sheet-back" onClick={onClose}>← Wróć</button>
        <div className="art-head" style={g.grad ? { background: g.grad } : undefined}>
          <span className="art-head-ico">{g.e || "📖"}</span>
          <h1 className="art-title">{g.t}</h1>
        </div>
        <div className="art-body">
          {[g.body, ...(ART_MORE[g.id] ? ART_MORE[g.id].split("\n\n") : [])].map((par, i) => <p key={i}>{par}</p>)}
        </div>
        {related.length > 0 && (
          <>
            <h3 className="offers-h">Produkty z tego artykułu <Tip text="Produkty z kategorii, której dotyczy artykuł — z najniższą ceną w sklepach partnerskich. Kliknij, aby porównać oferty." /></h3>
            <div className="strip art-strip">
              {related.map((p) => (
                <button key={p.id} className="strip-card" onClick={() => onOpenProduct(p)}>
                  <span className="strip-thumb"><Thumb cat={p.cat} img={p.img} name={p.name} /></span>
                  <span className="strip-name">{p.name}</span>
                  <span className="strip-price">{minP(p) != null ? <><b>od {fmt(minP(p))} zł</b><span className="per">/{p.unit}</span></> : <span className="muted">cena w sklepie</span>}</span>
                </button>
              ))}
            </div>
            <button className="cta art-cat-btn" onClick={() => onGoCat(g.cat)}>Zobacz całą kategorię: {g.cat} →</button>
          </>
        )}
      </div>
    </div>
  );
}
function CookieBanner({ onChoice }) {
  return (
    <div className="cookie-bar" role="dialog" aria-label="Zgoda na pliki cookies">
      <div className="cookie-txt">
        <b>Cookies.</b> Niezbędne działają zawsze; afiliacyjne — za Twoją zgodą. Szczegóły w Polityce cookies (Moje konto → Zgody).
      </div>
      <div className="cookie-btns">
        <button className="cta small" onClick={() => onChoice("all")}>Akceptuję wszystkie</button>
        <button className="cookie-min" onClick={() => onChoice("necessary")}>Tylko niezbędne</button>
      </div>
    </div>
  );
}

function LegalModal({ tab: initialTab, onClose }) {
  const [tab, setTab] = useState(initialTab || "regulamin");
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const DOCS = { regulamin: ["Regulamin", LEGAL_REGULAMIN], prywatnosc: ["Polityka prywatności", LEGAL_PRYWATNOSC], cookies: ["Polityka cookies", LEGAL_COOKIES] };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet legal" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-back" onClick={onClose}>← Wróć</button>
        <button className="close" onClick={onClose} aria-label="Zamknij">×</button>
        <div className="auth-tabs">
          {Object.entries(DOCS).map(([k, [label]]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <pre className="legal-text">{DOCS[tab][1]}</pre>
        <button className="sheet-close-bottom" onClick={onClose}>Zamknij</button>
      </div>
    </div>
  );
}

function Footer({ openLegal, cookieConsent, resetCookies, storeNames }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-in">
        <div className="footer-left">
          <span className="muted">© 2026 BOBERO — porównywarka materiałów budowlanych · kontakt@bobero.pl</span>
          {storeNames?.length > 0 && <span className="muted">Sklepy partnerskie: {storeNames.join(" · ")}</span>}
        </div>
        <nav className="footer-links">
          <button className="linkbtn" onClick={() => openLegal("regulamin")}>Regulamin</button>
          <button className="linkbtn" onClick={() => openLegal("prywatnosc")}>Polityka prywatności</button>
          <button className="linkbtn" onClick={() => openLegal("cookies")}>Polityka cookies</button>
          <button className="linkbtn" onClick={resetCookies}>Ustawienia cookies{cookieConsent === "necessary" ? " (tylko niezbędne)" : ""}</button>
        </nav>
      </div>
    </footer>
  );
}

/* ================================================================
   STRONA GŁÓWNA (dashboard w stylu OLX, kategorie wg Castoramy)
   ================================================================ */
const TAXONOMY = [
  { name: "Materiały budowlane", emoji: "🧱", bg: "#FDEBE6", subs: [
    { name: "Zaprawy klejowe", match: "Kleje do płytek", emoji: "🪣" },
    { name: "Silikony, piany, akryle", match: "Uszczelniacze", emoji: "🧴" },
    { name: "Podkłady gruntujące", match: "Grunty", emoji: "🖌️" },
    { name: "Izolacje i hydroizolacja", match: "Hydroizolacja", emoji: "💧" },
    { name: "Cegły, bloczki i pustaki", emoji: "🧱" },
    { name: "Cement, kruszywa i wapno", emoji: "🏗️" },
    { name: "Drewno budowlane", emoji: "🪵" },
    { name: "Sucha zabudowa", emoji: "📐" },
  ]},
  { name: "Płytki i podłogi", emoji: "🟫", bg: "#E6F3D5", subs: [
    { name: "Gres", match: "Płytki gres", emoji: "◻️" },
    { name: "Akcesoria do płytek — fugi", match: "Fugi", emoji: "🩹" },
    { name: "Kleje do płytek", match: "Kleje do płytek", emoji: "🪣" },
    { name: "Płytki ścienne", emoji: "🔲" },
    { name: "Panele podłogowe", emoji: "🪵" },
    { name: "Wykładziny", emoji: "🟩" },
  ]},
  { name: "Farby i malowanie", emoji: "🎨", bg: "#E8F0FE", subs: [
    { name: "Grunty i podkłady", match: "Grunty", emoji: "🖌️" },
    { name: "Farby wewnętrzne", emoji: "🎨" },
    { name: "Emalie i lakiery", emoji: "✨" },
    { name: "Akcesoria malarskie", emoji: "🖌️" },
  ]},
  { name: "Łazienka", emoji: "🛁", bg: "#E0F1FB", subs: [
    { name: "Hydroizolacja łazienki", match: "Hydroizolacja", emoji: "💧" },
    { name: "Silikony sanitarne", match: "Uszczelniacze", emoji: "🧴" },
    { name: "Baterie i armatura", emoji: "🚿" },
    { name: "Kabiny prysznicowe", emoji: "🚪" },
    { name: "Meble łazienkowe", emoji: "🗄️" },
    { name: "Ceramika sanitarna", emoji: "🚽" },
  ]},
  { name: "Kuchnia", emoji: "🍳", bg: "#E6F6EA", subs: [
    { name: "Meble kuchenne", emoji: "🗄️" }, { name: "Zlewozmywaki", emoji: "🚰" },
    { name: "Baterie kuchenne", emoji: "🚿" }, { name: "AGD do zabudowy", emoji: "🔌" },
  ]},
  { name: "Narzędzia i sprzęt", emoji: "🛠️", bg: "#F3E9FD", subs: [
    { name: "Elektronarzędzia", emoji: "🪛" }, { name: "Narzędzia ręczne", emoji: "🔨" },
    { name: "Narzędzia pomiarowe", emoji: "📏" }, { name: "Odzież robocza i BHP", emoji: "🦺" },
  ]},
  { name: "Ogród", emoji: "🌿", bg: "#E6F6EA", subs: [
    { name: "Meble ogrodowe", emoji: "🪑" }, { name: "Narzędzia ogrodnicze", emoji: "🧑‍🌾" },
    { name: "Maszyny ogrodnicze", emoji: "🚜" }, { name: "Grille", emoji: "🍖" }, { name: "Rośliny", emoji: "🌱" },
  ]},
  { name: "Drzwi i okna", emoji: "🚪", bg: "#FDEBE6", subs: [
    { name: "Drzwi wewnętrzne", emoji: "🚪" }, { name: "Drzwi zewnętrzne", emoji: "🏠" },
    { name: "Okna", emoji: "🪟" }, { name: "Klamki i zamki", emoji: "🔑" },
  ]},
  { name: "Oświetlenie i elektryka", emoji: "💡", bg: "#E6F3D5", subs: [
    { name: "Oświetlenie wewnętrzne", emoji: "💡" }, { name: "Żarówki", emoji: "🔆" },
    { name: "Gniazdka i włączniki", emoji: "🔌" }, { name: "Kable i przewody", emoji: "🧵" },
  ]},
  { name: "Wystrój i dekoracje", emoji: "🖼️", bg: "#E8F0FE", subs: [
    { name: "Rolety i żaluzje", emoji: "🪟" }, { name: "Karnisze i zasłony", emoji: "🪢" },
    { name: "Tapety", emoji: "🖼️" }, { name: "Dywany", emoji: "🟥" },
  ]},
  { name: "Ogrzewanie", emoji: "🔥", bg: "#FDEBE6", subs: [
    { name: "Grzejniki", emoji: "♨️" }, { name: "Kominki i piece", emoji: "🔥" }, { name: "Klimatyzacja i wentylacja", emoji: "❄️" },
  ]},
  { name: "Magazynowanie", emoji: "📦", bg: "#F3E9FD", subs: [
    { name: "Regały", emoji: "🗜️" }, { name: "Pojemniki i organizery", emoji: "📦" }, { name: "Szafy i garderoby", emoji: "🗄️" },
  ]},
];


const CITY_COORDS = { Warszawa:[52.23,21.01], "Kraków":[50.06,19.94], "Łódź":[51.76,19.46], "Wrocław":[51.11,17.03], "Poznań":[52.41,16.93], "Gdańsk":[54.35,18.65], Szczecin:[53.43,14.55], Bydgoszcz:[53.12,18.01], Lublin:[51.25,22.57], "Białystok":[53.13,23.16], Katowice:[50.26,19.02], Gdynia:[54.52,18.53], "Częstochowa":[50.81,19.12], Radom:[51.40,21.15], Toruń:[53.01,18.60], Sosnowiec:[50.29,19.10], Rzeszów:[50.04,22.00], Kielce:[50.87,20.63], Gliwice:[50.29,18.68], Olsztyn:[53.78,20.49], "Zielona Góra":[51.94,15.50], Bytom:[50.35,18.92], "Zabrze":[50.32,18.79], "Bielsko-Biała":[49.82,19.05], Rybnik:[50.10,18.55], Ruda_S:[50.26,18.86], Tychy:[50.13,19.00], Opole:[50.67,17.93], "Gorzów Wielkopolski":[52.74,15.24], "Elbląg":[54.16,19.40], "Płock":[52.55,19.71], "Wałbrzych":[50.77,16.28], "Włocławek":[52.65,19.07], "Tarnów":[50.01,20.99], Chorzów:[50.30,18.95], Koszalin:[54.19,16.17], Kalisz:[51.76,18.09], Legnica:[51.21,16.16], "Grudziądz":[53.48,18.75], "Słupsk":[54.46,17.03], "Jastrzębie-Zdrój":[49.95,18.60], "Nowy Sącz":[49.62,20.71], "Jelenia Góra":[50.90,15.73], Siedlce:[52.17,22.29], "Mysłowice":[50.24,19.14], Konin:[52.22,18.25], "Piotrków Trybunalski":[51.40,19.70], Suwałki:[54.11,22.93], Lubin:[51.40,16.20], "Ostrów Wielkopolski":[51.65,17.81] };
function nearestCity(lat, lon) {
  let best = "Warszawa", bd = Infinity;
  for (const [c, [la, lo]] of Object.entries(CITY_COORDS)) {
    const d = (la - lat) ** 2 + ((lo - lon) * Math.cos(lat * Math.PI / 180)) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

/* ---- mapa sklepów i ulubionych miejsc (Leaflet + OpenStreetMap) ---- */
function MapSection({ city, setCity, address, setAddress, pins, setPins, networks, showToast, tall }) {
  const mapRef = React.useRef(null);
  const leafletRef = React.useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [naming, setNaming] = useState(null);
  const [pinName, setPinName] = useState("");
  const center = CITY_COORDS[city] || CITY_COORDS["Warszawa"];
  const CHAIN_OFFSETS = { Castorama: [0.018, -0.02], "Leroy Merlin": [-0.015, 0.022], OBI: [0.01, 0.03] };
  const CHAIN_COLORS = { Castorama: "#1D4ED8", "Leroy Merlin": "#16A34A", OBI: "#EA580C" };

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const boot = () => {
      if (cancelled || !mapRef.current || leafletRef.current || !window.L) return;
      const L = window.L;
      const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(center, 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.on("click", (e) => setNaming({ lat: e.latlng.lat, lng: e.latlng.lng }));
      leafletRef.current = { L, map, layers: [] };
      setReady(true);
    };
    try {
      if (window.L) { boot(); }
      else {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(css);
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
        s.onload = boot;
        s.onerror = () => setFailed(true);
        document.head.appendChild(s);
        timer = setTimeout(() => { if (!window.L) setFailed(true); }, 6000);
      }
    } catch (e) { setFailed(true); }
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (leafletRef.current) { leafletRef.current.map.remove(); leafletRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const ctx = leafletRef.current;
    if (!ctx) return;
    const { L, map } = ctx;
    ctx.layers.forEach((l) => map.removeLayer(l));
    ctx.layers = [];
    map.setView(center, 11);
    Object.keys(networks).forEach((storeName) => {
      const off = CHAIN_OFFSETS[storeName] || [0.02, 0.02];
      const color = CHAIN_COLORS[storeName] || "#78BE20";
      const m = L.circleMarker([center[0] + off[0], center[1] + off[1]], { radius: 11, color, fillColor: color, fillOpacity: 0.85, weight: 2 })
        .addTo(map)
        .bindPopup("<b>" + storeName + "</b><br/>Markety w mieście " + city + " — pozycja orientacyjna.<br/>Dokładne adresy i godziny: lokalizator na stronie sklepu.");
      ctx.layers.push(m);
    });
    pins.forEach((p) => {
      const m = L.marker([p.lat, p.lng]).addTo(map).bindPopup("&#11088; <b>" + p.name + "</b><br/><i>Twoje miejsce</i>");
      ctx.layers.push(m);
    });
  }, [ready, city, pins, networks]);

  return (
    <>
      <div className="map-hint muted">Kropki = sklepy partnerskie w Twoim mieście (pozycje orientacyjne). Tapnij w mapę, aby dodać własne miejsce ⭐ — np. adres budowy. <Tip text="Dokładne adresy marketów znajdziesz w lokalizatorach sklepów. Twoje miejsca zapisują się na tym urządzeniu." /></div>
      {failed ? (
        <div className="map-fallback">Mapa nie mogła się załadować w tym podglądzie. Na docelowej stronie zobaczysz tu mapę OpenStreetMap ze sklepami w mieście {city} i Twoimi zapisanymi miejscami ⭐.</div>
      ) : (
        <div className="map-shell">
          <div className={`map-box ${tall ? "tall" : ""}`} ref={mapRef} />
          <button className="map-locate" title="Pokaż moją lokalizację (GPS)" aria-label="Zlokalizuj mnie" onClick={() => {
            if (!navigator.geolocation) { showToast("Twoja przeglądarka nie udostępnia GPS."); return; }
            showToast("Pobieram lokalizację…");
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const c = nearestCity(pos.coords.latitude, pos.coords.longitude);
                setCity(c); setAddress(c);
                const ctx = leafletRef.current; if (ctx) ctx.map.setView([pos.coords.latitude, pos.coords.longitude], 12);
                showToast("Ustawiono: " + c + " (najbliższe miasto)");
              },
              (err) => showToast(err && err.code === 1
                ? "Brak zgody na lokalizację. W podglądzie aplikacja może nie mieć uprawnień do GPS — na docelowej stronie zadziała. Wpisz miasto w wyszukiwarce u góry."
                : "Nie udało się ustalić pozycji. Wpisz miasto w wyszukiwarce u góry."),
              { timeout: 8000 });
          }}>◎</button>
        </div>
      )}
      {naming && (
        <div className="pin-form">
          <span>Nazwij to miejsce:</span>
          <input value={pinName} autoFocus placeholder="np. Budowa — Malczewskiego 5" onChange={(e) => setPinName(e.target.value)} />
          <button className="cta small" onClick={() => {
            const name = pinName.trim() || "Moje miejsce";
            setPins([...pins, { id: "pin-" + Date.now(), name, lat: naming.lat, lng: naming.lng }]);
            setNaming(null); setPinName(""); showToast("Dodano miejsce: " + name);
          }}>Zapisz ⭐</button>
          <button className="cookie-min dark" onClick={() => { setNaming(null); setPinName(""); }}>Anuluj</button>
        </div>
      )}
      {pins.length > 0 && (
        <div className="pin-list">
          {pins.map((p) => (
            <span key={p.id} className="pin-chip">⭐ {p.name}
              <button className="pin-x" onClick={() => setPins(pins.filter((x) => x.id !== p.id))} title="Usuń">×</button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}

/* ---- mini-poradnik ---- */
const ART_MORE = {
  g1: "Zacznij od formatu płytki: im większa płytka, tym bardziej odkształcalny musi być klej. Dla gresu 60×60 i większego wybieraj klasę C2 z dopiskiem S1 (odkształcalny) — zwykły klej C1 przy dużym formacie pęka na skutek naprężeń. Na ogrzewaniu podłogowym i tarasie S1 to absolutne minimum.\n\nDruga sprawa to metoda klejenia: przy dużych formatach stosuj klejenie kombinowane — grzebień na podłożu i cienka warstwa „na plecach\" płytki. Eliminujesz pustki powietrzne, w których zbiera się woda i które dudnią pod nogami.\n\nNa koniec czas otwarty: w upalny dzień klej naciągnięty na zbyt dużej powierzchni tworzy naskórek i płytka nie chwyta. Rozprowadzaj tyle kleju, ile ułożysz w 15–20 minut.",
  g2: "Hydroizolacja łazienki to system, nie jeden produkt: grunt pod folię, folia w płynie w dwóch warstwach i taśmy uszczelniające w narożach oraz przy przejściach rur. Druga warstwa zawsze prostopadle do pierwszej, po pełnym wyschnięciu pierwszej (zwykle 3–4 h).\n\nStrefy mokre: w prysznicu bez brodzika izolujesz podłogę i ściany do wysokości min. 2 m, przy wannie — 30 cm ponad jej krawędź. Reszta łazienki: podłoga + cokół 15 cm na ściany.\n\nNie oszczędzaj na narożach — to tam pęka 90% uszczelnień. Taśma wtopiona w pierwszą warstwę folii przenosi ruchy budynku, sama folia nie.",
  g3: "Zużycie kleju zależy od grzebienia: paca 6 mm ≈ 2,4 kg/m², 8 mm ≈ 3,2 kg/m², 10 mm ≈ 4 kg/m². Przy klejeniu kombinowanym dolicz ~0,5–1 kg/m². Worek 25 kg wystarcza więc na 6–10 m² zależnie od płytki i równości podłoża.\n\nZawsze dokupuj z zapasem ~10% — dosychające resztki w wiadrze, docinki i poprawki zjadają materiał. Lepiej oddać nienaruszony worek, niż w połowie łazienki jechać po klej z innej partii produkcyjnej.",
  i1: "Efekt spa budują trzy decyzje: duży format w jasnym kamieniu (mniej fug = spokojniejsza płaszczyzna), fuga w kolorze płytki zamiast kontrastowej oraz jeden mocny akcent — czarna armatura albo drewno. \n\nOd strony technicznej: gres rektyfikowany pozwala na fugę 2 mm, co wzmacnia efekt jednolitej tafli. Pamiętaj tylko, że wąska fuga wymaga bardzo równego podłoża — nierówności nie zamaskujesz szerokością spoiny.\n\nOświetlenie: ciepła barwa (2700–3000 K) na kamiennych beżach daje efekt hotelowy; zimne światło (4000 K+) zrobi z tej samej płytki szpital.",
  i2: "Duży format nad blatem to też praktyka: 1–2 płyty zamiast 30 małych płytek to mniej fug, w które wchodzi tłuszcz. Płytę można wyciąć z tego samego gresu co podłoga — spójność za darmo.\n\nMontaż: klej żelowy o podwyższonej przyczepności trzyma duże formaty na ścianie bez spływania. Styk blatu z płytą zamknij silikonem w kolorze fugi — nie fugą, bo blat „pracuje\" i sztywna spoina pęknie.\n\nGniazdka: otwory wycinaj otwornicą diamentową na mokro przed klejeniem. Docinanie po przyklejeniu to proszenie się o pękniętą płytę.",
  i3: "Taras zaczyna się od spadku: 1,5–2% od budynku, wyprofilowane w wylewce, nie w kleju. Woda, która nie spływa, zimą rozsadzi każdą, nawet najlepszą okładzinę.\n\nPłytki: mrozoodporny gres o nasiąkliwości poniżej 0,5% i antypoślizgowości min. R10. Klej wyłącznie odkształcalny S1, kładziony metodą kombinowaną na pełne podparcie — pustka pod płytką na tarasie to bomba z opóźnionym zapłonem.\n\nFuga elastyczna i dylatacje co 3–4 m oraz przy każdej krawędzi. Sztywno zafugowany taras bez dylatacji pęka pierwszej zimy."
};
const INSPIRATIONS = [
  { id: "i1", e: "🛁", grad: "linear-gradient(135deg,#DCEDE4,#F4FAF6)", t: "Łazienka jak ze spa: duży gres i ciepła fuga", body: "Płytki 60×60 w jasnym, kamiennym odcieniu optycznie powiększają małą łazienkę, a fuga w kolorze płytki (np. beż) daje spokojną, jednolitą taflę. Do tego czarna armatura albo drewniane akcenty. Techniczna baza: klej odkształcalny C2 S1, w strefie prysznica hydroizolacja w dwóch warstwach.", cat: "Płytki gres" },
  { id: "i2", e: "🍳", grad: "linear-gradient(135deg,#F3E7D3,#FBF6EC)", t: "Kuchnia: ściana nad blatem bez fugowania co 10 cm", body: "Zamiast drobnej mozaiki nad blatem coraz częściej kładzie się jedną–dwie duże płyty gresu. Mniej fug to łatwiejsze czyszczenie tłuszczu. Klej żelowy trzyma duże formaty na ścianie bez spływania, a silikon sanitarny w kolorze fugi domyka styk z blatem.", cat: "Kleje do płytek" },
  { id: "i3", e: "🌿", grad: "linear-gradient(135deg,#E5E9DC,#F7F9F2)", t: "Taras, który przetrwa zimę", body: "Płytki mrozoodporne na taras klei się wyłącznie klejem klasy S1 z pełnym podparciem (bez pustek pod płytką — tam zbiera się woda i rozsadza mróz). Fuga elastyczna, spadek 1,5–2% od budynku, a przed klejeniem hydroizolacja rozprowadzona na wylewce.", cat: "Hydroizolacja" },
];
const GUIDES = [
  { id: "g1", t: "Jak dobrać klej do gresu 60×60?", body: "Do gresu i dużych formatów wybieraj klej odkształcalny klasy C2 (np. żelowy Geoflex albo C2TE S1 jak Atlas Plus). Zwykła zaprawa C1 nadaje się tylko do małych płytek ceramicznych na stabilnym podłożu. Na ogrzewanie podłogowe, taras lub klejenie płytka-na-płytkę — zawsze klasa S1.", cat: "Kleje do płytek" },
  { id: "g2", t: "Hydroizolacja łazienki w 3 krokach", body: "1) Zagruntuj chłonne podłoże (np. Uni-Grunt). 2) Nałóż folię w płynie (np. Ceresit CL 51) w dwóch warstwach, w narożach wtapiając taśmę uszczelniającą. 3) Po wyschnięciu klej płytki bezpośrednio na powłoce. Strefa mokra to minimum: podłoga oraz ściany przy wannie i prysznicu.", cat: "Hydroizolacja" },
  { id: "g3", t: "Ile kleju kupić na m²?", body: "Praktyczna reguła: zużycie to około 1,5 kg na m² na każdy 1 mm grubości warstwy. Płytki 60×60 klei się pacą 8–10 mm, czyli realnie 4–5 kg/m². Worek 22,5 kg wystarcza na około 5 m². Zawsze dolicz 10% zapasu na docinki i poprawki.", cat: "Kleje do płytek" },
];

function HomePage({ products, q, setQ, goCat, goShop, goAll, currentUser, onAuth, onProfile, onAdmin, openProduct, city, setCity, address, setAddress, showToast, recent, saveRecent, clearRecent, viewed, pins, setPins, networks, goProducts , goPromo, goPreset , openArticle, openArticles }) {
  const [sugOpen, setSugOpen] = useState(false);
  const submit = () => { saveRecent(q); goShop(); };

  const promosAll = products.filter((p) => p.offers.some((o) => o.oldP));
  const promos = promosAll.slice(0, undefined); // przycinane niżej wg moreSec
  const newestAll = [...products].reverse();
  const newest = newestAll.slice(0, 6);
  const spreadsAll = products.map((p) => {
    const conf = p.offers.filter((o) => o.p != null);
    if (conf.length < 2) return null;
    const lo = conf.reduce((a, b) => (a.p < b.p ? a : b));
    const hi = conf.reduce((a, b) => (a.p > b.p ? a : b));
    return hi.p - lo.p > 0.009 ? { p, lo, hi, diff: hi.p - lo.p } : null;
  }).filter(Boolean).sort((a, b) => b.diff - a.diff);
  const spreads = spreadsAll.slice(0, 6);
  const viewedProducts = (viewed || []).map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 8);

  const BANNERS = [
    { id: "b1", bg: "linear-gradient(120deg,#14181F,#2A2416)", light: true, t: "Jedna lista, trzy sklepy", s: "Porównujemy ceny w Castorama, Leroy Merlin i OBI — kupujesz tam, gdzie taniej.", cta: "Zobacz produkty", act: () => goProducts() },
    { id: "b2", bg: "linear-gradient(120deg,#78BE20,#FFD34D)", t: "⚡ Analizator zakupowy", s: "Wrzuć materiały na listę, a policzymy najtańszy podział zakupów między sklepy.", cta: "Wypróbuj", act: () => { currentUser ? onProfile("lista") : onAuth(); } },
    { id: "b3", bg: "linear-gradient(120deg,#E0F1FB,#E6F6EA)", t: "Nic nie dopłacasz", s: "Utrzymujemy się z prowizji od sklepów. Ceny są dokładnie takie jak na ich stronach.", cta: "Poznaj zasady", act: null },
  ];

  return (
    <div className="home light">
      <header className="home-hdr2">
        <div className="home-hdr2-in">
          <button className="logo big as-btn dark-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>BOBERO<span className="logo-dot">.</span></button>
        </div>
        <div className="hero-search-wrap light-search">
          <div className="hero-search">
            <svg viewBox="0 0 24 24" className="hs-ico"><circle cx="10.5" cy="10.5" r="7" fill="none" stroke="#6B7280" strokeWidth="2.2"/><path d="M16 16l5.5 5.5" stroke="#6B7280" strokeWidth="2.2"/></svg>
            <input value={q}
              onChange={(e) => { setQ(e.target.value); setSugOpen(true); }}
              onFocus={() => setSugOpen(true)}
              onBlur={() => setTimeout(() => setSugOpen(false), 180)}
              onKeyDown={(e) => e.key === "Enter" && (setSugOpen(false), submit())}
              placeholder="Czego szukasz? np. klej do gresu, silikon…" />
            {q && <button className="sx" onClick={() => { setQ(""); setSugOpen(true); }}>×</button>}
            <button className="hs-btn" onClick={() => { setSugOpen(false); submit(); }}>Szukaj</button>
          </div>
          {sugOpen && (
            <SearchSuggest q={q} products={products} recent={recent}
              onPick={(p, term) => { saveRecent(term || p.name); setSugOpen(false); openProduct(p); }}
              onCat={(match, term) => { saveRecent(term); setSugOpen(false); goCat(match); }}
              onRecent={(r) => { setQ(r); saveRecent(r); setSugOpen(false); goShop(); }}
              onClearRecent={clearRecent} />
          )}
        </div>
      </header>

      <main className="home-main">
        <div className="brand-marquee" aria-label="Sklepy partnerskie">
          <div className="brand-track">
            {[0, 1].map((k) => Object.keys(networks).map((s) => {
              const st = BRAND_STYLE[s] || { c: "#39424E", w: 800 };
              return <span key={k + s} className="brand-tile mq"><span className="brand-logo" style={{ color: st.c, fontWeight: st.w }}>{s}</span></span>;
            }))}
          </div>
        </div>
        {spreads.length > 0 && (
          <>
            <div className="home-sec-h"><h2>Oferty tygodnia <Tip text="Produkty, na których w tym tygodniu porównanie daje najwięcej: największa różnica ceny między sklepami partnerskimi. Kwota „oszczędzasz” to różnica między najdroższą a najtańszą potwierdzoną ofertą." /></h2><button className="linkbtn" onClick={() => goPreset("oferty")}>Więcej →</button></div>
            <PagedStrip>
              {spreads.map(({ p, lo, hi, diff }) => (
                <button key={p.id} className="strip-card spread-card" onClick={() => openProduct(p)}>
                  <span className="spread-save">oszczędzasz {fmt(diff)} zł</span>
                  <span className="strip-thumb"><Thumb cat={p.cat} img={p.img} name={p.name} /></span>
                  <span className="strip-name">{p.name}</span>
                  <span className="spread-range"><b>{fmt(lo.p)} zł</b> {lo.s} · {fmt(hi.p)} zł {hi.s}</span>
                </button>
              ))}
            </PagedStrip>
          </>
        )}

        {promosAll.length > 0 && (
          <>
            <div className="home-sec-h"><h2>Promocje <Tip text="Produkty przecenione w sklepach partnerskich — procent liczony od poprzedniej ceny podanej przez sklep." /></h2><button className="linkbtn" onClick={goPromo}>Więcej →</button></div>
            <PagedStrip>
              {promos.slice(0, 6).map((p) => {
                const o = p.offers.find((x) => x.oldP);
                return (
                  <button key={p.id} className="strip-card" onClick={() => openProduct(p)}>
                    <span className="strip-off">−{Math.round((1 - o.p / o.oldP) * 100)}%</span>
                    <span className="strip-thumb"><Thumb cat={p.cat} img={p.img} name={p.name} /></span>
                    <span className="strip-name">{p.name}</span>
                    <span className="strip-price"><s>{fmt(o.oldP)}</s> <b>{fmt(o.p)} zł</b><span className="per">/{p.unit}</span></span>
                    <span className="strip-store">{o.s}</span>
                  </button>
                );
              })}
            </PagedStrip>
          </>
        )}

        {viewedProducts.length > 0 && (
          <>
            <div className="home-sec-h"><h2>Ostatnio oglądane</h2></div>
            <PagedStrip>
              {viewedProducts.map((p) => (
                <button key={p.id} className="strip-card" onClick={() => openProduct(p)}>
                  <span className="strip-thumb"><Thumb cat={p.cat} img={p.img} name={p.name} /></span>
                  <span className="strip-name">{p.name}</span>
                  <span className="strip-price">{minP(p) != null ? <><b>od {fmt(minP(p))} zł</b><span className="per">/{p.unit}</span></> : <span className="muted">cena w sklepie</span>}</span>
                  <span className="strip-store">{p.offers.length} {p.offers.length === 1 ? "sklep" : "sklepy"}</span>
                </button>
              ))}
            </PagedStrip>
          </>
        )}
        {newest.length > 0 && (
          <>
            <div className="home-sec-h"><h2>Nowości <Tip text="Produkty ostatnio dodane do porównywarki. Po podłączeniu plików produktowych sklepów sekcja będzie aktualizować się automatycznie." /></h2><button className="linkbtn" onClick={() => goPreset("nowe")}>Więcej →</button></div>
            <PagedStrip>
              {newest.map((p) => (
                <button key={p.id} className="strip-card" onClick={() => openProduct(p)}>
                  <span className="new-badge">NOWOŚĆ</span>
                  <span className="strip-thumb"><Thumb cat={p.cat} img={p.img} name={p.name} /></span>
                  <span className="strip-name">{p.name}</span>
                  <span className="strip-price">{minP(p) != null ? <><b>od {fmt(minP(p))} zł</b><span className="per">/{p.unit}</span></> : <span className="muted">cena w sklepie</span>}</span>
                </button>
              ))}
            </PagedStrip>
          </>
        )}


        <div className="home-sec-h"><h2>Poradniki</h2><button className="linkbtn" onClick={() => openArticles("poradniki")}>Więcej →</button></div>
        <PagedStrip>
          {GUIDES.map((g) => (
            <button key={g.id} className="guide-card" onClick={() => openArticle(g)}>
              <span className="guide-ico">📖</span>
              <span>{g.t}</span>
              <span className="guide-more">Czytaj →</span>
            </button>
          ))}
        </PagedStrip>

        <p className="foot-disc">Ceny w serwisie: stan na {PRICE_DATE}.</p>
      </main>

      
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home"); // home | shop | admin
  const [q, setQ] = useState("");
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [maxPrice, setMaxPrice] = useState(150);
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [sort, setSort] = useState("pop");
  const [open, setOpenState] = useState(null);
  const [viewed, setViewedState] = useState([]);
  const [pins, setPinsState] = useState([]); // ulubione miejsca na mapie
  const setOpen = (p) => {
    setOpenState(p);
    if (p) setViewedState((prev) => { const next = [p.id, ...prev.filter((x) => x !== p.id)].slice(0, 10); store.set("bobero:viewed", next); return next; });
  };
  const setPins = (v) => { setPinsState(v); store.set("bobero:pins", v); };
  const [drawer, setDrawer] = useState(false);

  const [networks, setNetworksState] = useState(DEFAULT_NETWORKS);
  const [products, setProductsState] = useState(REAL_PRODUCTS);
  const [clicks, setClicksState] = useState([]);
  const [users, setUsersState] = useState([]);
  const [currentUserId, setCurrentUserIdState] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [cookieConsent, setCookieConsentState] = useState(undefined); // undefined = wczytywanie, null = brak decyzji
  const [legalTab, setLegalTab] = useState(null);
  const [city, setCityState] = useState("Warszawa");
  const [recent, setRecentState] = useState([]);
  const [profileSection, setProfileSection] = useState("menu");
  const [productsCat, setProductsCat] = useState(null);
  const [rankInfo, setRankInfo] = useState(false);
  const [preset, setPreset] = useState(null); // 'oferty' | 'nowe' | null
  const [articlesKind, setArticlesKind] = useState(null); // 'poradniki' | 'inspiracje' | null
  const [article, setArticle] = useState(null);
  const [guestList, setGuestList] = useState([]); // koszyk gościa — znika po zamknięciu (celowo nie zapisujemy)
  const [shopSug, setShopSug] = useState(false);
  const [address, setAddressState] = useState("");
  const [loaded, setLoaded] = useState(false);

  /* wczytanie zapisanych danych */
  useEffect(() => {
    (async () => {
      const [n, p, c, us, sess, cc, ct, ad, rc, vw, pn] = await Promise.all([
        store.get("bobero:networks", null),
        store.get("bobero:products", null),
        store.get("bobero:clicks", null),
        store.get("bobero:users", null),
        store.get("bobero:session", null),
        store.get("bobero:cookies", null),
        store.get("bobero:city", null),
        store.get("bobero:address", null),
        store.get("bobero:recent", null),
        store.get("bobero:viewed", null),
        store.get("bobero:pins", null),
      ]);
      if (n) setNetworksState(n);
      if (p) setProductsState(p);
      if (c) setClicksState(c);
      let loadedUsers = (us || []).map((u) => ({ notifyEmail: true, notifySms: false, phone: "", ...u, favs: u.favs || [], list: u.list || [] }));
      // wbudowane konto administratora (podgląd): e-mail "@", hasło "@" — przed startem produkcyjnym do zmiany!
      if (!loadedUsers.some((u) => u.email === "@")) {
        loadedUsers = [{
          id: "u-admin", name: "Administrator", email: "@", passHash: await hashPass("@"),
          type: "prywatne", company: "", nip: "", marketing: false, created: 0, isAdmin: true,
          notifyEmail: true, notifySms: false, phone: "", favs: [], list: [],
        }, ...loadedUsers];
      }
      setUsersState(loadedUsers);
      store.set("bobero:users", loadedUsers);
      if (sess) setCurrentUserIdState(sess);
      setCookieConsentState(cc);
      if (ct) setCityState(ct);
      if (ad) setAddressState(ad);
      if (rc) setRecentState(rc);
      if (vw) setViewedState(vw);
      if (pn) setPinsState(pn);
      setLoaded(true);
    })();
  }, []);

  const setNetworks = (v) => { setNetworksState(v); store.set("bobero:networks", v); };
  const setProducts = (v) => { setProductsState(v); store.set("bobero:products", v); };
  const addClick = useCallback((c) => {
    setClicksState((prev) => { const next = [...prev, c].slice(-500); store.set("bobero:clicks", next); return next; });
  }, []);
  // statystyka kliknięć zbierana wyłącznie po zgodzie na cookies inne niż niezbędne
  const logClick = useCallback((c) => { if (cookieConsent === "all") addClick(c); }, [cookieConsent, addClick]);
  const setUsers = (v) => { setUsersState(v); store.set("bobero:users", v); };
  const setCookieConsent = (v) => { setCookieConsentState(v); store.set("bobero:cookies", v); };
  const hasConsent = cookieConsent === "all";
  const setCity = (v) => { setCityState(v); store.set("bobero:city", v); };
  const setAddress = (v) => { setAddressState(v); store.set("bobero:address", v); };
  const saveRecent = (term) => {
    const t = term.trim(); if (t.length < 2) return;
    setRecentState((prev) => { const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8); store.set("bobero:recent", next); return next; });
  };
  const clearRecent = () => { setRecentState([]); store.set("bobero:recent", []); };
  const setSession = (id) => { setCurrentUserIdState(id); store.set("bobero:session", id); };

  const currentUser = users.find((u) => u.id === currentUserId) || null;
  const adminId = (users.find((u) => u.isAdmin) || [...users].sort((a, b) => a.created - b.created)[0])?.id;
  const isAdminUser = !!currentUser && currentUser.id === adminId;
  const updateUser = (nu) => setUsers(users.map((u) => (u.id === nu.id ? nu : u)));
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  // po zalogowaniu/rejestracji przez Supabase: dopisz/zaktualizuj lokalny rekord użytkownika (lista i ulubione zostają lokalne)
     const upsertLocalUser = (u) => {
            const prior = users.find((x) => x.email.toLowerCase() === u.email.toLowerCase());
            const merged = { ...prior, ...u };
            const rest = users.filter((x) => x.id !== merged.id && x.email.toLowerCase() !== merged.email.toLowerCase());
            setUsers([...rest, merged]);
            return merged;
     };

     const handleRegister = (u) => {
            const hadGuestList = guestList.length > 0;
            const nu = upsertLocalUser(hadGuestList ? { ...u, list: guestList } : u);
            if (hadGuestList) setGuestList([]);
            setSession(nu.id); setAuthOpen(false);
            showToast(`Witaj, ${nu.name.split(" ")[0]}! Konto założone.`);
            setProfileSection(hadGuestList ? "lista" : "menu");
            setProfileOpen(true);
     };
  const mergeGuest = (u) => {
    if (guestList.length === 0) return u;
    const merged = [...(u.list || [])];
    guestList.forEach((g) => {
      const ex = merged.find((l) => l.id === g.id);
      if (ex) ex.qty += g.qty; else merged.push({ ...g });
    });
    const nu = { ...u, list: merged };
    setUsers(users.map((x) => (x.id === u.id ? nu : x)).concat(users.some((x) => x.id === u.id) ? [] : [nu]));
    setGuestList([]);
    showToast(`Witaj, ${u.name.split(" ")[0]}! Przenieśliśmy ${guestList.length} ${guestList.length === 1 ? "produkt" : "produkty"} z listy gościa na Twoje konto.`);
    return nu;
  };
  const handleLogin = (u) => {
         setAuthOpen(false);
         if (guestList.length > 0) {
                  const nu = mergeGuest(u); // aktualizuje users[] i czyści listę gościa
                  setSession(nu.id);
                  setProfileSection("lista");
         } else {
                  const nu = upsertLocalUser(u);
                  setSession(nu.id);
                  showToast(`Witaj ponownie, ${nu.name.split(" ")[0]}!`);
                  setProfileSection("menu");
         }
         setProfileOpen(true);
  };
     const handleLogout = () => { supabase.auth.signOut(); setSession(null); setProfileOpen(false); };
  const handleDeleteAccount = () => {
    const id = currentUserId;
    setUsers(users.filter((u) => u.id !== id));
    setSession(null); setProfileOpen(false); setGuestList([]);
    showToast("Konto i powiązane dane zostały usunięte.");
  };

  const toggleFavUser = (id) => {
    if (!currentUser) { setAuthOpen(true); return; }
    const cf = currentUser.favs || [];
    const favs = cf.includes(id) ? cf.filter((x) => x !== id) : [...cf, id];
    updateUser({ ...currentUser, favs });
  };
  const markAffActivity = useCallback(() => {
    if (!currentUser) return;
    updateUser({ ...currentUser, lastAffClick: Date.now() });
  }, [currentUser]);
  const toggleList = (id) => {
    if (!currentUser) {
      const ex = guestList.find((l) => l.id === id);
      if (ex) { setGuestList(guestList.filter((l) => l.id !== id)); showToast("Usunięto z listy."); }
      else { setGuestList([...guestList, { id, qty: 1 }]); showToast("Dodano do listy. Zaloguj się, aby ją zapisać na stałe."); }
      return;
    }
    const ex = (currentUser.list || []).find((l) => l.id === id);
    if (ex) {
      updateUser({ ...currentUser, list: (currentUser.list || []).filter((l) => l.id !== id) });
      showToast("Usunięto z listy zakupowej.");
    } else {
      updateUser({ ...currentUser, list: [...(currentUser.list || []), { id, qty: 1 }] });
      showToast("Dodano do listy zakupowej — porównanie sklepów pod 🛒 u góry.");
    }
  };

  const CATS = [...new Set(products.map((p) => p.cat))];
  const BRANDS = [...new Set(products.map((p) => p.brand))].sort();
  const toggle = (setter, arr, v) => setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const results = useMemo(() => {
    let r = products.filter((p) => {
      if (q && !(`${p.name} ${p.brand} ${p.cat}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (cats.length && !cats.includes(p.cat)) return false;
      if (brands.length && !brands.includes(p.brand)) return false;
      if (onlyPromo && !p.offers.some((o) => o.oldP)) return false;
      const bp = minP(p);
      if (bp != null && bp > maxPrice) return false;
      return true;
    });
    if (preset === "oferty") {
      r = r.filter((p) => {
        const conf = p.offers.filter((o) => o.p != null);
        return conf.length >= 2 && Math.max(...conf.map((o) => o.p)) - Math.min(...conf.map((o) => o.p)) > 0.009;
      });
    }
    if (preset === "nowe") r = [...r].reverse();
    const s = {
      plow: (a, b) => (minP(a) ?? Infinity) - (minP(b) ?? Infinity),
      phigh: (a, b) => (minP(b) ?? -1) - (minP(a) ?? -1),
      rate: (a, b) => b.rating - a.rating,
      pop: (a, b) => b.reviews - a.reviews,
    };
    return [...r].sort(s[sort]);
  }, [products, q, cats, brands, maxPrice, onlyPromo, sort, preset]);

  const active = cats.length + brands.length + (maxPrice < 150 ? 1 : 0) + (onlyPromo ? 1 : 0);
  const clearAll = () => { setCats([]); setBrands([]); setMaxPrice(150); setOnlyPromo(false); setQ(""); };

  const goCat = (c) => { setPreset(null); setOnlyPromo(false); setCats([c]); setQ(""); setView("shop"); };
  const effList = currentUser ? (currentUser.list || []) : guestList;
  const cartCount = effList.reduce((s, l) => s + l.qty, 0);
  const anyOverlayOpen = !!open || authOpen || !!legalTab || drawer || cookieConsent === null; // koszyk/profil to teraz pełna strona — pasek zostaje widoczny
  const goSection = (sec) => {
    setOpen(null); setProfileSection(sec);
    if (currentUser || sec === "lista") setProfileOpen(true); else setAuthOpen(true);
  };
  const bottomNav = anyOverlayOpen ? null : (
    <BottomNav view={view} cartCount={cartCount}
      cartActive={profileOpen && profileSection === "lista"}
      accountActive={authOpen || (profileOpen && profileSection !== "lista")}
      onHome={() => { setProfileOpen(false); setAuthOpen(false); setOpen(null); setArticlesKind(null); setArticle(null); setView("home"); }}
      onSearch={() => { setProfileOpen(false); setAuthOpen(false); setOpen(null); setArticlesKind(null); setArticle(null); setProductsCat(null); setView("products"); }}
      onCart={() => goSection("lista")}
      onStores={() => { setProfileOpen(false); setAuthOpen(false); setOpen(null); setView("stores"); }}
      storesActive={view === "stores" && !profileOpen && !authOpen}
      onAccount={() => goSection("menu")} />
  );
  const goAll = () => { clearAll(); setPreset(null); setView("shop"); };
  const goPromo = () => { clearAll(); setPreset(null); setOnlyPromo(true); setView("shop"); };
  const goPreset = (k) => { clearAll(); setOnlyPromo(false); setPreset(k); setView("shop"); };

  if (view === "home") {
    return (
      <div className="app">
        <style>{CSS}</style>
        <HomePage products={products} q={q} setQ={setQ} city={city} setCity={setCity} address={address} setAddress={setAddress} networks={networks} showToast={showToast} recent={recent} saveRecent={saveRecent} clearRecent={clearRecent} viewed={viewed} pins={pins} setPins={setPins} goProducts={(cat) => { setProductsCat(cat || null); setView("products"); }} goPromo={goPromo} goPreset={goPreset} openArticle={setArticle} openArticles={setArticlesKind}
          goCat={goCat} goShop={() => setView("shop")} goAll={goAll} openProduct={(p) => setOpen(p)}
          currentUser={currentUser} onAuth={() => setAuthOpen(true)} onProfile={(sec) => { setProfileSection(typeof sec === "string" ? sec : "menu"); setProfileOpen(true); }} onAdmin={() => setView("admin")} />
        {authOpen && <AuthModal users={users} onLogin={handleLogin} onRegister={handleRegister} onClose={() => setAuthOpen(false)} openLegal={setLegalTab} />}
        {articlesKind && <ArticlesPage kind={articlesKind} onOpen={setArticle} onClose={() => setArticlesKind(null)} />}
        {article && <ArticleView g={article} products={products} onOpenProduct={(p) => setOpen(p)}
          onGoCat={(c) => { setArticle(null); setArticlesKind(null); goCat(c); }} onClose={() => setArticle(null)} />}
        {profileOpen && (currentUser || profileSection === "lista") && (
          <ProfilePanel user={currentUser || { id: "guest", name: "Gość", email: "", type: "prywatne", created: Date.now(), list: guestList, favs: [], phone: "" }}
            isGuest={!currentUser} onAuth={() => { setProfileOpen(false); setAuthOpen(true); }} products={products} networks={networks} updateUser={currentUser ? updateUser : ((u) => setGuestList(u.list || []))} onClick={logClick} consent={hasConsent} isAdmin={isAdminUser} onAdmin={() => { setProfileOpen(false); setView("admin"); }}
            section={profileSection} setSection={setProfileSection} address={address} setAddress={setAddress}
            setCookieChoice={setCookieConsent} cookieConsent={cookieConsent} openLegal={setLegalTab} showToast={showToast} onDeleteAccount={handleDeleteAccount}
            onLogout={handleLogout} onClose={() => setProfileOpen(false)}
            onOpenProduct={(p) => { setProfileOpen(false); setView("shop"); setOpen(p); }} />
        )}
        {open && <Detail p={open} networks={networks} onClose={() => setOpen(null)} onClick={logClick} onAff={markAffActivity} consent={hasConsent} city={city}
          fav={!!currentUser?.favs?.includes(open.id)} toggleFav={toggleFavUser} onAddList={toggleList} inList={effList.some((l) => l.id === open.id)} />}
        <Footer openLegal={setLegalTab} cookieConsent={cookieConsent} resetCookies={() => setCookieConsent(null)} storeNames={Object.keys(networks)} />
        {legalTab && <LegalModal tab={legalTab} onClose={() => setLegalTab(null)} />}
        {cookieConsent === null && <CookieBanner onChoice={setCookieConsent} />}
        {bottomNav}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  if (view === "stores") {
    return (
      <div className="app">
        <style>{CSS}</style>
        <StoresPage city={city} setCity={setCity} address={address} setAddress={setAddress}
          pins={pins} setPins={setPins} networks={networks} showToast={showToast} />
        <Footer openLegal={setLegalTab} cookieConsent={cookieConsent} resetCookies={() => setCookieConsent(null)} storeNames={Object.keys(networks)} />
        {open && <Detail p={open} networks={networks} onClose={() => setOpen(null)} onClick={logClick} onAff={markAffActivity} consent={hasConsent} city={city}
          fav={!!currentUser?.favs?.includes(open.id)} toggleFav={toggleFavUser} onAddList={toggleList} inList={effList.some((l) => l.id === open.id)} />}
        {profileOpen && (currentUser || profileSection === "lista") && (
          <ProfilePanel user={currentUser || { id: "guest", name: "Gość", email: "", type: "prywatne", created: Date.now(), list: guestList, favs: [], phone: "" }}
            isGuest={!currentUser} onAuth={() => { setProfileOpen(false); setAuthOpen(true); }}
            products={products} networks={networks} updateUser={currentUser ? updateUser : ((u) => setGuestList(u.list || []))} onClick={logClick} consent={hasConsent} isAdmin={isAdminUser} onAdmin={() => { setProfileOpen(false); setView("admin"); }}
            section={profileSection} setSection={setProfileSection} address={address} setAddress={setAddress}
            setCookieChoice={setCookieConsent} cookieConsent={cookieConsent} openLegal={setLegalTab} showToast={showToast} onDeleteAccount={handleDeleteAccount}
            onLogout={handleLogout} onClose={() => setProfileOpen(false)}
            onOpenProduct={(p) => { setOpen(p); }} />
        )}
        {authOpen && <AuthModal users={users} onLogin={handleLogin} onRegister={handleRegister} onClose={() => setAuthOpen(false)} openLegal={setLegalTab} />}
        {legalTab && <LegalModal tab={legalTab} onClose={() => setLegalTab(null)} />}
        {cookieConsent === null && <CookieBanner onChoice={setCookieConsent} />}
        {bottomNav}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  if (view === "products") {
    return (
      <div className="app">
        <style>{CSS}</style>
        <ProductsPage key={productsCat || "all"} initialCat={productsCat} products={products} q={q} setQ={setQ}
          goCat={goCat} goShop={() => setView("shop")} openProduct={(p) => setOpen(p)}
          recent={recent} saveRecent={saveRecent} clearRecent={clearRecent} showToast={showToast} />
        <Footer openLegal={setLegalTab} cookieConsent={cookieConsent} resetCookies={() => setCookieConsent(null)} storeNames={Object.keys(networks)} />
        {open && <Detail p={open} networks={networks} onClose={() => setOpen(null)} onClick={logClick} onAff={markAffActivity} consent={hasConsent} city={city}
          fav={!!currentUser?.favs?.includes(open.id)} toggleFav={toggleFavUser} onAddList={toggleList} inList={effList.some((l) => l.id === open.id)} />}
        {authOpen && <AuthModal users={users} onLogin={handleLogin} onRegister={handleRegister} onClose={() => setAuthOpen(false)} openLegal={setLegalTab} />}
        {profileOpen && (currentUser || profileSection === "lista") && (
          <ProfilePanel user={currentUser || { id: "guest", name: "Gość", email: "", type: "prywatne", created: Date.now(), list: guestList, favs: [], phone: "" }}
            isGuest={!currentUser} onAuth={() => { setProfileOpen(false); setAuthOpen(true); }} products={products} networks={networks} updateUser={currentUser ? updateUser : ((u) => setGuestList(u.list || []))} onClick={logClick} consent={hasConsent} isAdmin={isAdminUser} onAdmin={() => { setProfileOpen(false); setView("admin"); }}
            section={profileSection} setSection={setProfileSection} address={address} setAddress={setAddress}
            setCookieChoice={setCookieConsent} cookieConsent={cookieConsent} openLegal={setLegalTab} showToast={showToast} onDeleteAccount={handleDeleteAccount}
            onLogout={handleLogout} onClose={() => setProfileOpen(false)}
            onOpenProduct={(p) => { setProfileOpen(false); setOpen(p); }} />
        )}
        {legalTab && <LegalModal tab={legalTab} onClose={() => setLegalTab(null)} />}
        {cookieConsent === null && <CookieBanner onChoice={setCookieConsent} />}
        {bottomNav}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  if (view === "admin") {
    if (!isAdminUser) {
      // dostęp tylko dla konta administratora
      return (
        <div className="app"><style>{CSS}</style>
          <div className="admin-login"><div className="admin-login-box">
            <h2>Panel administratora</h2>
            <p className="muted">Dostęp ma wyłącznie konto administratora (pierwsze zarejestrowane konto). {currentUser ? "To konto nie ma uprawnień administratora." : "Zaloguj się na konto administratora."}</p>
            {!currentUser && <button className="cta" onClick={() => { setView("shop"); setAuthOpen(true); }}>Zaloguj się</button>}
            <button className="linkbtn" onClick={() => setView("home")}>← Wróć do strony głównej</button>
          </div></div>
        </div>
      );
    }
    return (
      <div className="app"><style>{CSS}</style>
        <AdminPanel networks={networks} setNetworks={setNetworks} products={products} setProducts={setProducts}
          clicks={clicks} users={users} setUsers={setUsers} onExit={() => setView("shop")} />
      </div>
    );
  }

  const Facet = ({ title, items, sel, setter }) => (
    <div className="facet">
      <div className="facet-h">{title}</div>
      {items.map((it) => (
        <label key={it} className="check">
          <input type="checkbox" checked={sel.includes(it)} onChange={() => toggle(setter, sel, it)} />
          <span>{it}</span>
        </label>
      ))}
    </div>
  );

  const Sidebar = () => (
    <>
      <div className="side-top">
        <span>Filtry {active > 0 && <b className="abadge">{active}</b>}</span>
        {active > 0 && <button className="clear" onClick={clearAll}>Wyczyść</button>}
      </div>
      <Facet title="Kategoria" items={CATS} sel={cats} setter={setCats} />
      <div className="facet">
        <div className="facet-h">Cena maksymalna</div>
        <input type="range" min="15" max="150" step="5" value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="range" />
        <div className="range-val">do {fmt(maxPrice)} zł</div>
      </div>
      <div className="facet">
        <label className="check"><input type="checkbox" checked={onlyPromo} onChange={(e) => setOnlyPromo(e.target.checked)} /><span>Tylko promocje</span></label>
      </div>
      <Facet title="Marka" items={BRANDS} sel={brands} setter={setBrands} />
    </>
  );

  return (
    <div className="app">
      <style>{CSS}</style>
      <header className="hdr">
        <div className="hdr-in">
          <button className="logo as-btn" onClick={() => setView("home")}>BOBERO<span className="logo-dot">.</span></button>
          <div className="search">
            <input value={q}
              onChange={(e) => { setQ(e.target.value); setShopSug(true); }}
              onFocus={() => setShopSug(true)}
              onBlur={() => setTimeout(() => setShopSug(false), 180)}
              onKeyDown={(e) => { if (e.key === "Enter") { saveRecent(q); setShopSug(false); } }}
              placeholder="Szukaj: klej, gres, silikon…" />
            {q && <button className="sx" onClick={() => { setQ(""); setShopSug(true); }}>×</button>}
            {shopSug && (
              <SearchSuggest q={q} products={products} recent={recent}
                onPick={(p, term) => { saveRecent(term || p.name); setShopSug(false); setOpen(p); }}
                onCat={(match, term) => { saveRecent(term); setShopSug(false); goCat(match); }}
                onRecent={(r) => { setQ(r); saveRecent(r); setShopSug(false); }}
                onClearRecent={clearRecent} />
            )}
          </div>
        </div>
        <div className="promo">Prawdziwe produkty i ceny z Castorama, Leroy Merlin i OBI · stan na {PRICE_DATE}</div>
      </header>

      <div className="crumbs"><button className="back-btn" onClick={() => setView("home")}>← Wstecz</button><button className="crumb-link" onClick={() => setView("home")}>Strona główna</button> <span>›</span> {cats.length === 1 ? cats[0] : "Wszystkie produkty"}</div>

      <main className="layout">
        <aside className="sidebar"><Sidebar /></aside>
        <section className="content">
          <div className="toolbar">
            <button className="filter-btn" onClick={() => setDrawer(true)}>Filtry {active > 0 && `(${active})`}</button>
            {preset && <button className="pill on preset-chip" onClick={() => setPreset(null)}>{preset === "oferty" ? "Oferty tygodnia" : "Nowości"} ×</button>}
            <button className="linkbtn ranking-info" onClick={() => setRankInfo(true)}>Jak ustalamy kolejność?</button>
            <select className="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="pop">Polecane</option>
              <option value="plow">Cena: od najniższej</option>
              <option value="phigh">Cena: od najwyższej</option>
            </select>
          </div>
          <p className="rank-note"><Tip text="Wymóg przejrzystości plasowania (dyrektywa Omnibus): masz prawo wiedzieć, co decyduje o kolejności ofert." /> Jak sortujemy: kolejność domyślna („Polecane") odzwierciedla popularność produktów w sklepach partnerskich; oferty w obrębie produktu — zawsze od najniższej potwierdzonej ceny. Wysokość prowizji afiliacyjnej nie wpływa na kolejność.</p>
          {results.length === 0 ? (
            <div className="empty">
              <div className="empty-t">Brak produktów dla tych filtrów</div>
              <button className="cta" onClick={clearAll}>Wyczyść filtry</button>
            </div>
          ) : (
            <div className="grid">
              {results.map((p) => <Card key={p.id} p={p} onOpen={setOpen} fav={!!currentUser?.favs?.includes(p.id)} toggleFav={toggleFavUser} onAddList={toggleList} inList={effList.some((l) => l.id === p.id)} />)}
            </div>
          )}
          <p className="foot-disc">
            BOBERO to porównywarka — zarabiamy na prowizji od sklepów partnerskich, gdy przejdziesz do oferty i kupisz.
            Nazwy produktów, oceny i ceny pochodzą ze stron sklepów (stan na {PRICE_DATE}) i mogą się zmienić.
          </p>
        </section>
      </main>

      {drawer && (
        <div className="overlay" onClick={() => setDrawer(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top"><b>Filtry</b><button className="close" onClick={() => setDrawer(false)}>×</button></div>
            <div className="drawer-body"><Sidebar /></div>
            <button className="cta drawer-apply" onClick={() => setDrawer(false)}>Pokaż {results.length} produktów</button>
          </div>
        </div>
      )}

      {open && <Detail p={open} networks={networks} onClose={() => setOpen(null)} onClick={logClick} onAff={markAffActivity} consent={hasConsent} city={city}
        fav={!!currentUser?.favs?.includes(open.id)} toggleFav={toggleFavUser} onAddList={toggleList} inList={effList.some((l) => l.id === open.id)} />}
      {authOpen && <AuthModal users={users} onLogin={handleLogin} onRegister={handleRegister} onClose={() => setAuthOpen(false)} openLegal={setLegalTab} />}
      {profileOpen && (currentUser || profileSection === "lista") && (
        <ProfilePanel user={currentUser || { id: "guest", name: "Gość", email: "", type: "prywatne", created: Date.now(), list: guestList, favs: [], phone: "" }}
          isGuest={!currentUser} onAuth={() => { setProfileOpen(false); setAuthOpen(true); }} products={products} networks={networks} updateUser={currentUser ? updateUser : ((u) => setGuestList(u.list || []))} onClick={logClick} consent={hasConsent} isAdmin={isAdminUser} onAdmin={() => { setProfileOpen(false); setView("admin"); }}
            section={profileSection} setSection={setProfileSection} address={address} setAddress={setAddress}
            setCookieChoice={setCookieConsent} cookieConsent={cookieConsent} openLegal={setLegalTab} showToast={showToast} onDeleteAccount={handleDeleteAccount}
          onLogout={handleLogout} onClose={() => setProfileOpen(false)}
          onOpenProduct={(p) => { setProfileOpen(false); setOpen(p); }} />
      )}
      <Footer openLegal={setLegalTab} cookieConsent={cookieConsent} resetCookies={() => setCookieConsent(null)} storeNames={Object.keys(networks)} />
      {legalTab && <LegalModal tab={legalTab} onClose={() => setLegalTab(null)} />}
      {rankInfo && (
        <div className="overlay" onClick={() => setRankInfo(false)}>
          <div className="sheet rank-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setRankInfo(false)} aria-label="Zamknij">×</button>
            <h3>Jak ustalamy kolejność wyników?</h3>
            <p>Domyślnie produkty są ułożone według trafności względem wyszukiwania i wybranych filtrów (nazwa, kategoria, marka). Możesz zmienić kolejność na cenę rosnąco/malejąco — wtedy decyduje wyłącznie najniższa potwierdzona cena produktu w sklepach partnerskich.</p>
            <p><b>Wysokość prowizji, jaką płacą nam sklepy, nie wpływa na kolejność produktów ani ofert.</b> Oferty w ramach produktu są zawsze ułożone od najniższej ceny. Nie sprzedajemy wyższych pozycji w wynikach; gdyby kiedykolwiek pojawiły się oferty sponsorowane, będą wyraźnie oznaczone.</p>
            <p className="muted">Podstawa: obowiązek informowania o głównych parametrach plasowania (art. 7 ust. 4a dyrektywy 2005/29/WE, wdrożony ustawą o przeciwdziałaniu nieuczciwym praktykom rynkowym).</p>
          </div>
        </div>
      )}
      {cookieConsent === null && <CookieBanner onChoice={setCookieConsent} />}
      {bottomNav}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ============================== STYLE ============================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
* { box-sizing: border-box; }
.app { overflow-x:hidden; max-width:100vw; --ink:#14181F; --paper:#EFF1F3; --line:#DDE1E6; --gray:#6B7280; --amber:#78BE20; --amber-d:#4C8B10; --red:#D64545;
  font-family:'Inter',system-ui,sans-serif; color:var(--ink); background:var(--paper); min-height:100vh; }
.app h1,.app h2,.app h3,.app h4,.logo { font-family:'Archivo',system-ui,sans-serif; }
.muted { color:var(--gray); font-size:13px; }
code { background:#E7E9EC; padding:2px 6px; border-radius:5px; font-size:12px; word-break:break-all; overflow-wrap:anywhere; max-width:100%; display:inline-block; }

/* header */
.hdr { position:sticky; top:0; z-index:20; background:var(--ink); color:#fff; }
.hdr-in { display:flex; align-items:center; gap:14px; max-width:1240px; margin:0 auto; padding:14px 20px; }
.logo { font-weight:800; font-size:26px; letter-spacing:-.5px; }
.logo-dot { color:var(--amber); }
.search { flex:1; position:relative; }
.search input { width:100%; padding:12px 40px 12px 16px; border:0; border-radius:10px; font-size:15px; font-family:inherit; }
.search input:focus { outline:2px solid var(--amber); }
.sx { position:absolute; right:8px; top:50%; transform:translateY(-50%); border:0; background:#e5e7eb; width:24px;height:24px;border-radius:50%; cursor:pointer; }
.promo { background:var(--amber); color:var(--ink); text-align:center; font-size:13px; font-weight:600; padding:7px 12px; }
.crumbs { max-width:1240px; margin:0 auto; padding:14px 20px 0; font-size:13px; color:var(--gray); }
.crumbs span { margin:0 6px; }

.layout { max-width:1240px; margin:0 auto; padding:16px 20px 40px; display:grid; grid-template-columns:250px 1fr; gap:24px; }
.sidebar { position:sticky; top:96px; align-self:start; max-height:calc(100vh - 110px); overflow:auto; }
.side-top { display:flex; justify-content:space-between; align-items:center; font-family:'Archivo'; font-weight:700; margin-bottom:8px; }
.abadge { background:var(--amber); color:var(--ink); border-radius:20px; padding:1px 8px; font-size:12px; margin-left:6px; }
.clear { border:0; background:none; color:var(--amber-d); font-weight:600; cursor:pointer; font-size:13px; }
.facet { border-top:1px solid var(--line); padding:14px 0; }
.facet-h { font-family:'Archivo'; font-weight:600; font-size:13px; text-transform:uppercase; letter-spacing:.6px; color:var(--gray); margin-bottom:10px; }
.check { display:flex; align-items:center; gap:9px; padding:5px 0; font-size:14px; cursor:pointer; }
.check input { accent-color:var(--amber); width:16px; height:16px; }
.check .cnt { margin-left:auto; color:var(--gray); font-size:12px; }
.range { width:100%; accent-color:var(--amber); }
.range-val { font-size:13px; color:var(--gray); margin-top:6px; }

.toolbar { display:flex; align-items:center; gap:8px 12px; margin-bottom:16px; flex-wrap:wrap; }
.filter-btn { display:none; }
.sort { margin-left:auto; padding:9px 12px; border:1px solid var(--line); border-radius:9px; background:#fff; font-family:inherit; font-size:14px; }

.grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.card { background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; cursor:pointer; transition:transform .12s, box-shadow .12s; display:flex; flex-direction:column; }
.card:hover { transform:translateY(-3px); box-shadow:0 12px 30px rgba(20,24,31,.10); }
.card-media { position:relative; background:#EDEEF0; }
.thumb { width:100%; display:block; aspect-ratio:4/3; }
.badge { position:absolute; top:10px; left:10px; font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px; font-family:'Archivo'; }
.b-best { background:var(--ink); color:#fff; }
.b-promo { background:var(--red); color:#fff; }
.fav { position:absolute; top:8px; right:8px; width:34px;height:34px; border-radius:50%; border:0; background:rgba(255,255,255,.9); cursor:pointer; font-size:16px; color:#c4c9cf; }
.fav.on { color:#E0483A; }
.card-body { padding:13px 14px 15px; display:flex; flex-direction:column; flex:1; }
.brand { font-size:11px; text-transform:uppercase; letter-spacing:.7px; color:var(--gray); font-weight:600; }
.pname { font-size:14px; font-weight:600; line-height:1.35; margin:4px 0 8px; min-height:56px; }
.price-row { display:flex; justify-content:space-between; align-items:flex-end; margin:12px 0 8px; }
.from { font-size:11px; color:var(--gray); }
.price { font-family:'Archivo'; font-weight:800; font-size:24px; letter-spacing:-.5px; font-variant-numeric:tabular-nums; }
.price-ask { font-family:'Archivo'; font-weight:700; font-size:15px; color:var(--gray); }
.cur { font-size:15px; } .per { font-size:12px; color:var(--gray); font-weight:500; }
.stores { font-size:12px; color:var(--gray); }
.compare { display:flex; flex-direction:column; gap:4px; margin-bottom:12px; }
.chip { display:flex; align-items:center; gap:6px; font-size:12px; padding:5px 8px; border-radius:7px; background:#F5F6F8; }
.chip.cheapest { background:#EFF7E3; border:1px solid var(--amber); }
.chip-s { color:var(--gray); }
.chip-old { text-decoration:line-through; color:var(--gray); margin-left:auto; }
.chip-old.big { font-size:14px; margin-right:8px; }
.chip-old + .chip-p { margin-left:0; }
.chip-p { margin-left:auto; font-weight:700; font-variant-numeric:tabular-nums; }
.cta { margin-top:auto; width:100%; background:var(--amber); color:#fff; border:0; padding:11px; border-radius:9px; font-family:'Archivo'; font-weight:700; font-size:14px; cursor:pointer; }
.cta:hover { background:var(--amber-d); color:#fff; }
.cta.small { width:auto; padding:9px 16px; margin:0; }
.cta:disabled { opacity:.5; cursor:not-allowed; }
.foot-disc { font-size:12px; color:var(--gray); margin-top:26px; line-height:1.5; border-top:1px solid var(--line); padding-top:16px; }
.empty { text-align:center; padding:70px 20px; }
.empty-t { font-family:'Archivo'; font-weight:700; font-size:18px; margin-bottom:16px; }
.empty .cta { display:inline-block; width:auto; padding:11px 22px; }

.overlay { position:fixed; inset:0; background:rgba(20,24,31,.55); z-index:40; display:flex; align-items:center; justify-content:center; padding:20px; }
.sheet { background:#fff; border-radius:16px; max-width:760px; width:100%; max-height:90vh; overflow:auto; padding:24px; position:relative; }
.close { position:absolute; top:14px; right:14px; width:36px;height:36px;border-radius:50%; border:0; background:#F1F3F5; font-size:22px; cursor:pointer; }
.sheet-grid { display:grid; grid-template-columns:220px 1fr; gap:20px; }
.sheet-media { background:#EDEEF0; border-radius:12px; overflow:hidden; }
.sheet-title { font-size:21px; font-weight:800; margin:6px 0 10px; line-height:1.25; }
.tags { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0; }
.tag { background:#F1F3F5; font-size:12px; padding:4px 10px; border-radius:20px; }
.fav-line { border:1px solid var(--line); background:#fff; border-radius:9px; padding:9px 14px; cursor:pointer; font-size:13px; font-weight:600; }
.fav-line.on { color:#E0483A; border-color:#E0483A; }
.offers-h { font-family:'Archivo'; font-size:13px; text-transform:uppercase; letter-spacing:.6px; color:var(--gray); margin:22px 0 12px; }
.offers { display:flex; flex-direction:column; gap:10px; }
.offer { display:flex; align-items:center; gap:14px; border:1px solid var(--line); border-radius:11px; padding:14px 16px; }
.offer.best { border-color:var(--amber); background:#F6FBEF; }
.offer-l { flex:1; }
.offer-s { font-family:'Archivo'; font-weight:700; font-size:15px; display:flex; align-items:center; gap:8px; }
.offer-net { font-size:12px; color:var(--gray); margin-top:2px; }
.offer-p { font-family:'Archivo'; font-weight:800; font-size:19px; font-variant-numeric:tabular-nums; }
.offer-go { background:var(--ink); color:#fff; border:0; border-radius:9px; padding:10px 16px; font-weight:700; font-family:'Archivo'; cursor:pointer; white-space:nowrap; }
.offer.best .offer-go { background:var(--amber); color:var(--ink); }
.disclosure { font-size:12px; color:var(--gray); margin-top:16px; line-height:1.5; }

.drawer { position:fixed; top:0; left:0; bottom:0; width:88%; max-width:340px; background:#fff; z-index:50; display:flex; flex-direction:column; padding:16px; }
.drawer-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.drawer-top .close { position:static; }
.drawer-body { flex:1; overflow:auto; }
.drawer-apply { margin-top:12px; }

/* ---- konta ---- */
.auth { max-width:440px; }
.overlay:has(.auth) { z-index:55; }
.auth-tabs { display:flex; gap:6px; margin-bottom:16px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
.auth-tabs button { border:0; background:none; padding:10px 14px; font-family:'Archivo'; font-weight:700; font-size:14px; color:var(--gray); cursor:pointer; border-bottom:2px solid transparent; }
.auth-tabs button.on { color:var(--ink); border-bottom-color:var(--amber); }
.auth-form { display:flex; flex-direction:column; gap:11px; }
.auth-form label { display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:600; color:var(--gray); }
.auth-form input:not([type=checkbox]) { padding:11px 13px; border:1px solid var(--line); border-radius:9px; font-size:14px; font-family:inherit; }
.auth-form .check { flex-direction:row; align-items:flex-start; font-weight:400; font-size:13px; color:var(--ink); }
.type-toggle { display:flex; gap:8px; }
.type-toggle button { flex:1; padding:10px; border:1px solid var(--line); background:#fff; border-radius:9px; font-family:'Archivo'; font-weight:700; font-size:13px; cursor:pointer; color:var(--gray); }
.type-toggle button.on { border-color:var(--amber); background:#EFF7E3; color:var(--ink); }
.avatar.small { width:24px; height:24px; font-size:13px; }
.profile { max-width:640px; }
.profile-name { margin:0 0 2px; font-size:18px; }
.pad { padding:18px 0; }
.list-row { display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--line); }
.list-name { flex:1; font-size:14px; font-weight:600; cursor:pointer; }
.list-name:hover { color:var(--amber-d); }
.list-price { font-variant-numeric:tabular-nums; white-space:nowrap; }
.qty { display:flex; align-items:center; gap:8px; }
.qty button { width:28px; height:28px; border-radius:7px; border:1px solid var(--line); background:#fff; font-size:16px; cursor:pointer; }
.qty span { min-width:22px; text-align:center; font-weight:700; }
.list-total { display:flex; justify-content:space-between; padding:14px 0; font-family:'Archivo'; font-size:16px; }
.card-actions { display:flex; gap:8px; flex-wrap:wrap; }
.card-actions .cta { margin-top:0; flex:1; }
.cta.ghost { background:#fff; border:1px solid var(--amber); color:var(--ink); flex:0 0 auto; width:auto; padding:11px 12px; }
.cta.ghost:hover { background:#EFF7E3; color:var(--ink); }
.detail-actions { display:flex; gap:8px; flex-wrap:wrap; }
.store-filter { display:flex; gap:7px; align-items:center; flex-wrap:wrap; margin:4px 0 12px; }
.pill { border:1px solid var(--line); background:#fff; border-radius:20px; padding:7px 14px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; color:var(--gray); }
.pill.on { border-color:var(--amber); background:#EFF7E3; color:var(--ink); }
.list-main { flex:1; display:flex; flex-direction:column; gap:5px; min-width:0; }
.list-sub { display:flex; }
.store-sel { padding:6px 9px; border:1px solid var(--line); border-radius:7px; font-size:12px; font-family:inherit; max-width:260px; }
.cmp-card { border:1px solid var(--line); border-radius:12px; padding:14px; background:#fff; }
.cmp-card.full { border-color:var(--amber); background:#F6FBEF; }
.cmp-head { display:flex; justify-content:space-between; align-items:baseline; font-family:'Archivo'; }
.cmp-total { font-weight:800; font-size:19px; font-variant-numeric:tabular-nums; }
.cmp-sub { font-size:12px; color:var(--gray); margin-top:3px; }
.cmp-missing { margin-top:10px; font-size:12px; }
.cmp-missing-t { color:var(--red); font-weight:700; display:block; margin-bottom:3px; }
.cmp-missing-i { color:var(--gray); line-height:1.5; }
/* ---- strona główna ---- */
.home { min-height:100vh; }
.logo.big { font-size:30px; }
.logo.as-btn, .as-btn { background:none; border:0; color:inherit; cursor:pointer; padding:0; font:inherit; font-family:'Archivo'; font-weight:800; font-size:26px; letter-spacing:-.5px; }
.hero-search { display:flex; align-items:center; background:#fff; border-radius:14px; padding:6px 6px 6px 16px; gap:10px; box-shadow:0 14px 40px rgba(0,0,0,.28); }
.hs-ico { width:22px; height:22px; flex:0 0 auto; }
.hero-search input { flex:1; border:0; font-size:16px; padding:13px 0; font-family:inherit; min-width:0; color:var(--ink); background:transparent; caret-color:var(--ink); }
.hero-search input::placeholder { color:#9AA3AD; }
.hero-search input:focus { outline:none; }
.hs-btn { background:var(--amber); border:0; color:var(--ink); font-family:'Archivo'; font-weight:800; font-size:15px; padding:13px 26px; border-radius:10px; cursor:pointer; }
.hs-btn:hover { background:var(--amber-d); color:#fff; }
.home-main { max-width:1140px; margin:0 auto; padding:26px 20px 50px; }
.home-sec-h { display:flex; justify-content:space-between; align-items:baseline; margin:26px 0 14px; }
.home-sec-h h2 { font-size:20px; margin:0; }
.rtile { flex:0 0 auto; width:104px; border:0; background:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:7px; font-family:inherit; padding:6px 2px; position:relative; }
.rtile-circle { width:76px; height:76px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:32px; transition:transform .12s, box-shadow .12s; border:2px solid transparent; }
.rtile:hover .rtile-circle { transform:translateY(-3px); box-shadow:0 8px 22px rgba(20,24,31,.14); }
.rtile.on .rtile-circle { border-color:var(--amber); }
.rtile-label { font-size:12px; font-weight:600; color:var(--ink); text-align:center; line-height:1.25; }
.back-btn { border:1px solid var(--line); background:#fff; border-radius:9px; padding:7px 13px; font-family:'Archivo'; font-weight:700; font-size:13px; cursor:pointer; color:var(--ink); margin-right:6px; }
.back-btn:hover { border-color:var(--amber); background:#EFF7E3; }
.hero-search-wrap { position:relative; }
.sug { position:absolute; top:calc(100% + 6px); left:0; right:0; background:#fff; border-radius:12px; box-shadow:0 18px 50px rgba(0,0,0,.30); overflow:hidden; z-index:30; text-align:left; }
.sug-row { display:flex; align-items:center; gap:10px; width:100%; border:0; background:#fff; padding:12px 16px; font-family:inherit; font-size:14px; cursor:pointer; color:var(--ink); border-bottom:1px solid #F1F3F5; }
.sug-row:hover { background:#EFF7E3; }
.sug-row:last-child { border-bottom:0; }
.sug-cat { font-weight:700; }
.sug-ico { flex:0 0 auto; }
.sug-name { flex:1; text-align:left; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sug-price { color:var(--gray); font-size:13px; white-space:nowrap; }
.strip { display:flex; gap:12px; overflow-x:auto; padding:2px 2px 10px; -webkit-overflow-scrolling:touch; scrollbar-width:thin; }
.strip > * { flex:0 0 218px; }
.pstrip { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none; gap:12px; padding:2px; }
.pstrip::-webkit-scrollbar { display:none; }
.ppage { flex:0 0 100%; scroll-snap-align:start; display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.ppage .strip-card, .ppage .guide-card { width:100%; min-width:0; flex:none; }
.pdots { display:flex; justify-content:center; gap:7px; margin:0 0 10px; }
.pdot { width:7px; height:7px; border-radius:50%; background:#CFD6DD; transition:background .15s, transform .15s; }
.pdot.on { background:var(--amber-d); transform:scale(1.25); }
.strip-card { text-align:left; background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:7px; cursor:pointer; font-family:inherit; transition:transform .12s, box-shadow .12s; }
.strip-card:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(20,24,31,.10); }
.strip-off { background:var(--red); color:#fff; font-family:'Archivo'; font-weight:800; font-size:13px; padding:3px 9px; border-radius:7px; align-self:flex-start; }
.strip-name { font-weight:600; font-size:14px; line-height:1.35; color:var(--ink); min-height:38px; }
.strip-price { font-size:15px; color:var(--ink); }
.strip-price s { color:var(--gray); margin-right:6px; font-weight:400; }
.strip-price b { font-family:'Archivo'; font-size:18px; }
.strip-store { font-size:12px; color:var(--gray); }
.crumb-link { border:0; background:none; color:var(--amber-d); cursor:pointer; font:inherit; font-weight:600; padding:0; }
@media (max-width:560px){ .hero-t { font-size:23px; } .hs-btn { padding:12px 16px; } .cat-grid { grid-template-columns:1fr 1fr; } }
.row-actions .danger.solid { background:var(--red); color:#fff; border-color:var(--red); }
/* ---- zgodność prawna ---- */
.cookie-bar { position:fixed; left:0; right:0; bottom:0; background:var(--ink); color:#E7E9EC; z-index:70; display:flex; gap:12px; align-items:center; padding:13px 18px; flex-wrap:wrap; box-shadow:0 -8px 30px rgba(0,0,0,.3); }
.cookie-txt { flex:1; min-width:260px; font-size:13px; line-height:1.55; }
.cookie-btns { display:flex; gap:10px; align-items:center; }
.cookie-min { background:transparent; color:#C8CDD4; border:1px solid #3a414c; border-radius:9px; padding:9px 14px; cursor:pointer; font-family:inherit; font-size:13px; font-weight:600; }
.cookie-min:hover { color:#fff; border-color:#fff; }
.aff-label { display:block; font-size:10px; color:var(--gray); text-align:center; margin-top:4px; letter-spacing:.3px; }
.offer-go-wrap { display:flex; flex-direction:column; align-items:stretch; }
.rank-note { font-size:11.5px; color:var(--gray); margin:-6px 0 14px; line-height:1.45; }
.legal { max-width:720px; }
.legal-text { white-space:pre-wrap; font-family:'Inter',system-ui,sans-serif; font-size:13px; line-height:1.6; color:var(--ink); background:#F8F9FA; border:1px solid var(--line); border-radius:11px; padding:18px; max-height:60vh; overflow:auto; }
.site-footer { background:#fff; border-top:1px solid var(--line); margin-top:30px; }
.site-footer-in { max-width:1240px; margin:0 auto; padding:18px 20px; display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; font-size:13px; }
.footer-links { display:flex; gap:16px; flex-wrap:wrap; }
.inline-link { border:0; background:none; padding:0; color:var(--amber-d); font:inherit; font-weight:600; cursor:pointer; text-decoration:underline; }
.pass-wrap { position:relative; display:flex; }
.pass-wrap input { width:100%; padding-right:44px !important; }
.pass-eye { position:absolute; right:6px; top:50%; transform:translateY(-50%); border:0; background:none; cursor:pointer; font-size:17px; padding:6px; line-height:1; }
.cta.ghost.in-list { background:var(--ink); border-color:var(--ink); color:#fff; }
.fav-line.on-list { background:#EFF7E3; border-color:var(--amber); }
.net-preview-row { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
.danger-btn { border:1px solid #f0c9c9; background:#fff; color:var(--red); border-radius:7px; padding:6px 12px; cursor:pointer; font-family:inherit; font-size:12px; }
.danger-btn.solid { background:var(--red); color:#fff; border-color:var(--red); }
.net-new { border-style:dashed; }
.tip { position:relative; display:inline-flex; vertical-align:middle; margin-left:5px; }
.tip-dot { width:16px; height:16px; border-radius:50%; background:#DDE1E6; color:#4B5563; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; cursor:help; font-family:'Archivo'; font-style:normal; }
.tip-bubble { position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); background:var(--ink); color:#fff; font-size:12px; font-weight:400; line-height:1.5; padding:10px 13px; border-radius:9px; width:250px; text-align:left; opacity:0; visibility:hidden; transition:opacity .12s; z-index:65; box-shadow:0 10px 30px rgba(0,0,0,.3); pointer-events:none; text-transform:none; letter-spacing:0; font-family:'Inter',sans-serif; }
.tip-bubble::after { content:''; position:absolute; top:100%; left:50%; transform:translateX(-50%); border:6px solid transparent; border-top-color:var(--ink); }
.tip:hover .tip-bubble, .tip:focus .tip-bubble { opacity:1; visibility:visible; }
.thumb-photo { width:100%; aspect-ratio:4/3; background:#fff; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.thumb-photo img { width:100%; height:100%; object-fit:contain; }
.thumb-photo.broken img { display:none; }
.thumb-photo.broken::after { content:'zdjęcie niedostępne'; font-size:12px; color:var(--gray); }
.notify-box { background:#F8F9FA; border:1px solid var(--line); border-radius:12px; padding:14px 16px; margin:6px 0 14px; }
.notify-head { display:flex; align-items:center; gap:6px; margin-bottom:8px; font-size:14px; }
.phone-input { margin-top:6px; padding:9px 12px; border:1px solid var(--line); border-radius:8px; font-size:14px; font-family:inherit; width:100%; max-width:280px; }
.pinfo-desc { font-size:14px; line-height:1.6; margin:0; }
.pinfo-uses { display:flex; flex-wrap:wrap; gap:8px; }
.use-chip { background:#E6F6EA; color:#1B7F3B; font-size:13px; font-weight:600; padding:6px 12px; border-radius:20px; }
.spec-table { width:100%; border-collapse:collapse; font-size:13px; }
.spec-table td { padding:8px 10px; border-bottom:1px solid var(--line); }
.spec-table td:first-child { color:var(--gray); width:44%; }
.form-grid textarea { padding:9px 11px; border:1px solid var(--line); border-radius:8px; font-size:14px; font-family:inherit; resize:vertical; }
.social-box { margin-top:4px; }
.social-sep { display:flex; align-items:center; gap:12px; color:var(--gray); font-size:12px; margin:6px 0 10px; }
.social-sep::before, .social-sep::after { content:''; flex:1; height:1px; background:var(--line); }
.social-btns { display:flex; flex-direction:column; gap:8px; }
.social-btn { display:flex; align-items:center; justify-content:center; gap:9px; padding:11px; border:1px solid var(--line); border-radius:9px; background:#fff; font-family:inherit; font-size:14px; font-weight:600; cursor:pointer; }
.social-btn:hover { background:#F8F9FA; }
.g-ico { color:#4285F4; font-weight:800; font-family:'Archivo'; }
.f-ico { color:#1877F2; font-weight:800; font-family:'Archivo'; }
.split { border:1px solid var(--amber); background:#F6FBEF; border-radius:13px; padding:16px; margin-bottom:18px; }
.split-store { margin-bottom:12px; }
.split-head { display:flex; justify-content:space-between; font-family:'Archivo'; font-size:14px; padding-bottom:5px; border-bottom:1px dashed var(--line); margin-bottom:5px; }
.split-sum { font-variant-numeric:tabular-nums; font-weight:800; }
.split-row { display:flex; justify-content:space-between; gap:12px; font-size:13px; padding:3px 0; color:#374151; }
.split-row span:last-child { font-variant-numeric:tabular-nums; white-space:nowrap; }
.split-total { display:flex; justify-content:space-between; font-family:'Archivo'; font-size:16px; border-top:2px solid var(--amber); padding-top:10px; margin-top:6px; }
.split-save { margin-top:8px; font-size:13px; font-weight:700; color:#1B7F3B; }
.pill-sum { margin-left:6px; font-variant-numeric:tabular-nums; font-family:'Archivo'; }
.inline-cmp { margin:4px 0 14px; }
.footer-left { display:flex; flex-direction:column; gap:4px; }
.pill-an { border-color:var(--amber); color:var(--amber-d); }
.pill-an.on { background:var(--amber); color:var(--ink); border-color:var(--amber); }
.an-wrap { margin:4px 0 16px; }
.an-modes { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
.pickup-note { font-size:13px; line-height:1.55; background:#E6F6EA; border:1px solid #BFE5C8; border-radius:10px; padding:12px 14px; margin-top:16px; color:#14532D; }
.sheet-back { position:sticky; top:0; align-self:flex-start; display:inline-flex; border:1px solid var(--line); background:#fff; border-radius:9px; padding:8px 14px; font-family:'Archivo'; font-weight:700; font-size:13px; cursor:pointer; margin-bottom:10px; z-index:2; }
.sheet-back:hover { border-color:var(--amber); background:#EFF7E3; }
.sheet { display:flex; flex-direction:column; align-items:stretch; }
.sheet > * { flex-shrink:0; }
.acc-list, .acc-tiles, .acc-card { flex:none; }
.sheet-close-bottom { margin-top:22px; margin-bottom:6px; width:100%; padding:13px; border:1px solid var(--line); background:#F5F6F8; border-radius:11px; font-family:'Archivo'; font-weight:700; font-size:15px; cursor:pointer; }
.sheet-close-bottom:hover { background:#ECEEF1; }
@media (max-width:560px){
  .overlay { padding:10px 10px calc(14px + env(safe-area-inset-bottom, 0px)); align-items:flex-start; }
  .sheet { max-height:calc(94vh - 40px); margin-top:34px; padding-bottom:calc(26px + env(safe-area-inset-bottom, 0px)); }
  /* koszyk/profil = pełny ekran jak osobna strona */
  .overlay:has(.profile) { padding:0; background:var(--paper); }
  .sheet.profile { max-width:100%; width:100%; min-height:100vh; min-height:100dvh; max-height:none; height:auto; margin:0; border-radius:0; padding:16px 16px calc(20px + env(safe-area-inset-bottom, 0px)); }
  .close { display:none; } /* × chowamy na telefonie — koliduje z paskiem podglądu; zostaje ← Wróć i Zamknij */
}
.split-go { margin-top:8px; }
.split-go .offer-go { width:100%; }
.sug-box { background:#F8F9FA; border:1px dashed var(--line); border-radius:13px; padding:14px 16px; margin:14px 0; }
.tool-chip { background:#fff; border:1px solid var(--line); border-radius:20px; padding:5px 11px; font-size:12px; }
.matrix-scroll { overflow-x:auto; margin-bottom:16px; }
.price-matrix { width:100%; border-collapse:collapse; font-size:12.5px; background:#fff; border:1px solid var(--line); border-radius:11px; overflow:hidden; }
.price-matrix th { background:#F5F6F8; padding:9px 10px; text-align:right; font-family:'Archivo'; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:var(--gray); white-space:nowrap; }
.price-matrix th:first-child { text-align:left; }
.price-matrix td { padding:8px 10px; border-top:1px solid var(--line); text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.pm-name { text-align:left !important; white-space:normal !important; font-weight:600; min-width:150px; }
.pm-min { background:#E6F6EA; color:#1B7F3B; font-weight:800; }
.pm-max { background:#FDEBEA; color:#B3261E; }
.pm-none { color:#C4C9CF; }
.mini-thumb { width:46px; height:46px; border-radius:9px; overflow:hidden; flex:0 0 auto; background:#EDEEF0; border:1px solid var(--line); display:block; }
.mini-thumb .thumb { width:100%; height:100%; aspect-ratio:auto; }
.mini-thumb .thumb-photo { width:100%; height:100%; aspect-ratio:auto; }
.mini-thumb .thumb-photo img { object-fit:cover; }
.mini-thumb .thumb-photo.broken::after { content:''; }
.sug-strip { display:flex; gap:10px; overflow-x:auto; padding:4px 2px 10px; -webkit-overflow-scrolling:touch; scrollbar-width:thin; }
.sug-card { flex:0 0 132px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:8px; display:flex; flex-direction:column; gap:6px; }
.sug-card-img { display:block; width:100%; aspect-ratio:1/1; border-radius:8px; overflow:hidden; background:#EDEEF0; }
.sug-card-img .thumb, .sug-card-img .thumb-photo { width:100%; height:100%; aspect-ratio:auto; }
.sug-card-img .thumb-photo img { object-fit:cover; }
.sug-card-name { font-size:11.5px; font-weight:600; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:30px; }
.sug-card-price { font-size:12px; color:var(--gray); font-variant-numeric:tabular-nums; }
.sug-card-add { padding:8px; font-size:12px; }
.sug-tools-scroll { display:flex; gap:7px; overflow-x:auto; align-items:center; margin-top:8px; padding-bottom:4px; -webkit-overflow-scrolling:touch; scrollbar-width:thin; }
.sug-tools-scroll .tool-chip { flex:0 0 auto; white-space:nowrap; }
.sug-tools-label { flex:0 0 auto; }
.bnav { display:none; }
@media (max-width:980px){
  input, select, textarea { font-size:16px !important; }
  .bnav { display:flex; position:fixed; left:0; right:0; bottom:0; background:#fff; border-top:1px solid var(--line); z-index:35; padding:6px 4px calc(6px + env(safe-area-inset-bottom, 0px)); box-shadow:0 -6px 24px rgba(20,24,31,.08); }
  .bnav-item { flex:1; border:0; background:none; display:flex; flex-direction:column; align-items:center; gap:2px; padding:5px 2px; cursor:pointer; font-family:inherit; color:var(--gray); }
  .bnav-item.on { color:var(--ink); }
  .bnav-item.on .bnav-label { font-weight:800; }
  .bnav-ico { font-size:20px; line-height:1; position:relative; }
  .bnav-item.on .bnav-ico::after { content:''; position:absolute; left:50%; transform:translateX(-50%); bottom:-7px; width:18px; height:3px; border-radius:3px; background:var(--amber); }
  .bnav-badge { position:absolute; top:-6px; right:-11px; background:var(--amber); color:#fff; font-size:10px; font-weight:800; border-radius:20px; padding:1px 6px; font-family:'Archivo'; }
  .bnav-label { font-size:10.5px; font-weight:600; }
  .app { padding-bottom:calc(84px + env(safe-area-inset-bottom, 0px)); }
  .layout, .home-main { padding-bottom:24px; }
  .cookie-bar { bottom:0; padding-bottom:calc(14px + env(safe-area-inset-bottom, 0px)); }
  .toast { bottom:84px !important; }
}
.page-wrap { position:fixed; inset:0; z-index:34; background:var(--paper); overflow-y:auto; overflow-x:hidden; }
.sheet.as-page { display:block; max-width:760px; margin:0 auto; min-height:100%; max-height:none; overflow:visible; border-radius:0; box-shadow:none; padding:18px 16px calc(120px + env(safe-area-inset-bottom, 0px)); }
@media (min-width:761px){ .sheet.as-page { border-radius:0 0 16px 16px; padding-bottom:40px; } }

/* --- audyt: blokada poziomego rozjeżdżania (koszyk i okna) --- */
.page-wrap, .sheet, .overlay { overflow-x:hidden; }
.sheet { max-width:100%; }
.sheet > * { max-width:100%; }
.matrix-scroll { max-width:100%; }
.price-matrix { min-width:520px; }
.tip-bubble { width:min(250px, 76vw); }
@media (max-width:560px){
  /* wiersze koszyka zawijają się zamiast wypychać ekran */
  .list-row { flex-wrap:wrap; row-gap:6px; }
  .list-main { flex:1 1 100%; order:1; }
  .list-row .mini-thumb { order:0; }
  .qty { order:2; }
  .list-price { order:3; margin-left:auto; }
  /* oferty i plan zakupów */
  .offer { flex-wrap:wrap; }
  .offer-go-wrap { flex:1 1 100%; }
  .offer-go { width:100%; }
  .split-row span:first-child { min-width:0; overflow-wrap:anywhere; }
  .pm-name { min-width:120px; }
  .price-matrix { font-size:11.5px; }
  /* dymki podpowiedzi nie wystają poza ekran przy prawej krawędzi */
  .offers-h .tip-bubble, .facet-h .tip-bubble { left:auto; right:-10px; transform:none; }
  .offers-h .tip-bubble::after, .facet-h .tip-bubble::after { left:auto; right:14px; transform:none; }
}
.sug-sec { padding:12px 16px; border-bottom:1px solid #F1F3F5; text-align:left; }
.sug-sec:last-child { border-bottom:0; }
.sug-sec-h { font-family:'Archivo'; font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:var(--gray); margin-bottom:9px; display:flex; justify-content:space-between; align-items:center; }
.sug-clear { font-size:11px; padding:0; text-transform:none; letter-spacing:0; }
.sug-chips { display:flex; flex-wrap:wrap; gap:7px; }
.sug-chip { border:1px solid var(--line); background:#F8F9FA; border-radius:20px; padding:7px 13px; font-size:13px; cursor:pointer; font-family:inherit; color:var(--ink); }
.sug-chip:hover { background:#EFF7E3; border-color:var(--amber); }
.sug-brand { display:block; font-size:11px; color:var(--gray); font-weight:400; margin-top:2px; }
.sug-empty { padding:16px; font-size:13px; color:var(--gray); text-align:left; }
.search .sug { position:absolute; top:calc(100% + 6px); left:0; right:0; background:#fff; border-radius:12px; box-shadow:0 18px 50px rgba(0,0,0,.30); overflow:hidden; z-index:30; }
/* --- pulpit konta w stylu Leroy Merlin --- */
.acc-head { margin:4px 0 16px; }
.profile-name.big { font-family:'Archivo'; font-size:26px; margin:0 0 4px; }
.acc-sec-title { font-family:'Archivo'; font-size:19px; margin:4px 0 14px; }
.acc-card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; margin-bottom:14px; }
.acc-card b { font-family:'Archivo'; font-size:15px; }
.acc-card p { font-size:13px; line-height:1.55; margin:7px 0; }
.acc-promo { background:#F6FBEF; border-color:var(--amber); }
.acc-btn { display:block; width:100%; margin-top:10px; padding:13px; border:0; border-radius:10px; background:var(--ink); color:#fff; font-family:'Archivo'; font-weight:700; font-size:14.5px; cursor:pointer; }
.acc-btn:hover { background:#2A313B; }
.acc-progress { display:flex; flex-wrap:wrap; gap:14px; align-items:center; }
.acc-ring { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; position:relative; }
.acc-ring::before { content:''; position:absolute; inset:7px; background:#fff; border-radius:50%; }
.acc-ring span { position:relative; font-family:'Archivo'; font-weight:800; font-size:15px; }
.acc-progress-txt { flex:1; min-width:160px; }
.acc-progress .acc-btn { flex:1 1 100%; }
.acc-sec-h { font-family:'Archivo'; font-size:16px; margin:20px 0 10px; }
.acc-tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; }
.acc-tile { position:relative; background:#fff; border:1px solid var(--line); border-radius:14px; padding:18px 14px 14px; font-family:'Archivo'; font-weight:700; font-size:14px; cursor:pointer; text-align:left; display:flex; flex-direction:column; gap:10px; color:var(--ink); }
.acc-tile:hover { border-color:var(--amber); }
.acc-tile-ico { width:44px; height:44px; border-radius:50%; background:#E6F3D5; display:flex; align-items:center; justify-content:center; font-size:20px; }
.acc-tile-n { position:absolute; top:12px; right:12px; background:var(--amber); color:#fff; font-size:11px; font-weight:800; border-radius:20px; padding:2px 8px; }
.acc-list { background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; }
.acc-row { display:flex; align-items:center; gap:12px; width:100%; border:0; background:#fff; padding:15px 16px; font-family:inherit; font-size:14.5px; font-weight:600; color:var(--ink); cursor:pointer; border-bottom:1px solid #F1F3F5; text-align:left; }
.acc-row:last-child { border-bottom:0; }
.acc-row:hover { background:#FAFBFC; }
.acc-row-ico { flex:0 0 22px; text-align:center; }
.acc-row-arrow { margin-left:auto; color:var(--gray); font-size:17px; }
.logout-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; margin:20px 0 10px; padding:14px; background:#fff; border:1.5px solid var(--red); color:var(--red); border-radius:12px; font-family:'Archivo'; font-weight:700; font-size:15px; cursor:pointer; }
.logout-btn:hover { background:#FDEBEA; }
.acc-ver { text-align:center; color:var(--gray); font-size:12px; margin-bottom:8px; }
.acc-field { display:block; font-size:12.5px; font-weight:600; color:var(--gray); margin:10px 0; }
.acc-field input { display:block; width:100%; margin-top:5px; padding:11px 12px; border:1px solid var(--line); border-radius:9px; font-size:14.5px; font-family:inherit; color:var(--ink); }
.acc-field input:disabled { background:#F5F6F8; color:var(--gray); }
.acc-field .pass-wrap { margin-top:5px; }
.acc-consent-btns { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0; }
.ok-msg { color:#1B7F3B; font-size:13px; font-weight:600; margin:8px 0; }
/* --- zakładka Produkty (karty kategorii) --- */
.pcat-page { min-height:100vh; background:var(--paper); }
.pcat-in { max-width:760px; margin:0 auto; padding:22px 16px 130px; }
.pcat-title { font-family:'Archivo'; font-size:30px; margin:0 0 16px; }
.pcat-title-row { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
.pcat-title-row .pcat-title { margin:0; font-size:24px; }
.pcat-search-row { display:flex; gap:10px; margin-bottom:20px; }
.pcat-search { flex:1; position:relative; display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid var(--ink); border-radius:12px; padding:0 14px; }
.pcat-search input { flex:1; border:0; padding:14px 0; font-size:16px; font-family:inherit; color:var(--ink); background:transparent; min-width:0; }
.pcat-search input:focus { outline:none; }
.pcat-search .sug { position:absolute; top:calc(100% + 6px); left:0; right:0; background:#fff; border-radius:12px; box-shadow:0 18px 50px rgba(0,0,0,.30); overflow:hidden; z-index:30; }
.pcat-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
.pcat-card { background:#fff; border:0; border-radius:16px; padding:12px; cursor:pointer; text-align:left; font-family:inherit; box-shadow:0 2px 10px rgba(20,24,31,.06); display:flex; flex-direction:column; gap:12px; transition:transform .12s, box-shadow .12s; }
.pcat-card:hover { transform:translateY(-2px); box-shadow:0 10px 26px rgba(20,24,31,.12); }
.pcat-card.soon { opacity:.72; }
.pcat-img { display:flex; align-items:center; justify-content:center; width:100%; aspect-ratio:16/10; border-radius:11px; }
.pcat-emoji { font-size:52px; filter:drop-shadow(0 4px 8px rgba(20,24,31,.18)); }
.pcat-name { font-family:'Archivo'; font-weight:700; font-size:16px; color:var(--ink); line-height:1.3; padding:0 2px 6px; display:flex; align-items:center; gap:8px; }
.pcat-n { background:var(--amber); color:var(--ink); font-size:11px; font-weight:800; border-radius:20px; padding:2px 8px; }
@media (min-width:761px){ .pcat-grid { grid-template-columns:repeat(3,1fr); } }
/* --- strona startowa v2 (jasna, styl sieciówek) --- */
.home-hdr2 { background:#fff; border-bottom:1px solid var(--line); padding:14px 16px 18px; }
.home-hdr2-in { max-width:1240px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; gap:12px; }
.dark-logo { color:var(--ink); }
.light-search { max-width:1240px; margin:12px auto 0; }
.light-search .hero-search { border:1.5px solid var(--ink); box-shadow:none; }
.strip-thumb { display:block; width:100%; aspect-ratio:16/10; border-radius:9px; overflow:hidden; background:#F1F3F5; margin-bottom:8px; }
.strip-thumb .thumb, .strip-thumb .thumb-photo { width:100%; height:100%; aspect-ratio:auto; }
.spread-card { border:1px solid #CBE8D2; }
.spread-save { align-self:flex-start; background:#E6F6EA; color:#1B7F3B; font-size:11.5px; font-weight:800; border-radius:7px; padding:3px 8px; font-family:'Archivo'; margin-bottom:6px; }
.spread-range { font-size:12px; color:#374151; }
.spread-range b { color:#1B7F3B; }
.guide-card { flex:0 0 200px; display:flex; flex-direction:column; align-items:flex-start; gap:10px; background:#fff; border:1px solid var(--line); border-radius:13px; padding:15px; font-family:'Archivo'; font-weight:700; font-size:13.5px; line-height:1.35; text-align:left; color:var(--ink); cursor:pointer; }
.guide-more { margin-top:auto; color:var(--amber-d); font-size:12.5px; }
.guide-card:hover { border-color:var(--amber); }
.guide-ico { font-size:22px; }
.map-box { width:100%; height:340px; border-radius:16px; border:1px solid var(--line); overflow:hidden; z-index:1; position:relative; }
.map-fallback { background:#F5F6F8; border:1px dashed var(--line); border-radius:16px; padding:30px 20px; text-align:center; color:var(--gray); font-size:13.5px; line-height:1.6; }
.pin-form { display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:#F6FBEF; border:1px solid var(--amber); border-radius:12px; padding:12px 14px; margin-top:10px; font-size:13.5px; }
.pin-form input { flex:1; min-width:180px; padding:9px 12px; border:1px solid var(--line); border-radius:8px; font-size:14px; font-family:inherit; }
.pin-list { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.pin-chip { display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid var(--line); border-radius:20px; padding:6px 12px; font-size:13px; }
.pin-x { border:0; background:none; cursor:pointer; font-size:15px; color:var(--gray); padding:0 2px; }
.pin-x:hover { color:var(--red); }
/* --- mapa Polski --- */
@media (max-width:700px){ .map-wrap { grid-template-columns:1fr; } }
.map-city-h.fav { margin-top:16px; font-size:14px; }
.map-heart.on { color:#C0392B; border-color:#f0c9c9; background:#FDF2F1; }
.brand-strip { display:flex; gap:10px; overflow-x:auto; padding:2px 2px 12px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
.brand-strip::-webkit-scrollbar { display:none; }
.brand-tile { flex:0 0 auto; background:#F5F6F8; border:1px solid var(--line); border-radius:12px; padding:12px 22px; display:flex; align-items:center; justify-content:center; min-width:130px; }
.brand-logo { font-family:'Archivo'; font-size:16px; letter-spacing:.3px; filter:saturate(.55) opacity(.75); transition:filter .15s; white-space:nowrap; }
.brand-tile:hover .brand-logo { filter:none; }
.brand-more { border-style:dashed; background:#fff; }
.brand-more span { font-size:12.5px; white-space:nowrap; }
.home-sec-h.tight { margin-top:4px; }
.map-hint { font-size:12.5px; margin-bottom:8px; }
.guest-bar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:#F6FBEF; border:1px solid var(--amber); border-radius:12px; padding:12px 14px; margin-bottom:14px; font-size:13px; line-height:1.5; }
.guest-bar span { flex:1; min-width:200px; }
.stores-page { min-height:100vh; background:var(--paper); }
.stores-in { max-width:760px; margin:0 auto; padding:16px 16px 130px; }
.stores-tabs { display:flex; margin-bottom:14px; border-bottom:2px solid var(--line); }
.stores-tabs button { flex:1; border:0; background:none; padding:12px; font-family:'Archivo'; font-weight:800; font-size:15px; color:var(--gray); cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-2px; }
.stores-tabs button.on { color:var(--ink); border-bottom-color:var(--amber); }
.map-box.tall { height:min(62vh, 560px); }
.store-li { display:flex; align-items:center; justify-content:space-between; gap:12px; background:#fff; border:1px solid var(--line); border-radius:13px; padding:14px 16px; margin-bottom:10px; flex-wrap:wrap; }
.store-li-main { display:flex; flex-direction:column; gap:2px; }
.store-li-main b { font-family:'Archivo'; font-size:15px; }
.nearby-link { font-size:13px; font-weight:600; color:var(--amber-d); text-decoration:none; }
.nearby-link:hover { text-decoration:underline; }
.stores-search { position:relative; display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid var(--ink); border-radius:12px; padding:0 14px; margin-bottom:14px; }
.stores-search input { flex:1; border:0; padding:14px 0; font-size:15.5px; font-family:inherit; color:var(--ink); background:transparent; min-width:0; }
.stores-search input:focus { outline:none; }
.stores-search .sug { position:absolute; top:calc(100% + 6px); left:0; right:0; background:#fff; border-radius:12px; box-shadow:0 18px 50px rgba(0,0,0,.30); overflow:hidden; z-index:36; }
.stores-search .sx { position:static; }
.chain-chip { margin-left:10px; font-size:11.5px; }
.map-shell { position:relative; }
.map-locate { position:absolute; right:12px; bottom:12px; z-index:20; width:46px; height:46px; border-radius:50%; border:0; background:#fff; color:var(--ink); font-size:20px; font-weight:800; cursor:pointer; box-shadow:0 4px 16px rgba(20,24,31,.25); line-height:1; }
.map-locate:hover { background:var(--amber); }
.ranking-info { font-size:12px; white-space:nowrap; }
.rank-sheet { max-width:520px; }
.rank-sheet p { font-size:13.5px; line-height:1.6; margin:10px 0; }
/* minimalizm strony głównej */
.home-main { display:flex; flex-direction:column; gap:6px; }
.home-main .home-sec-h { margin-top:34px; }
.home-main .home-sec-h h2 { font-size:21px; }
.brand-marquee { overflow:hidden; margin:2px 0 6px; -webkit-mask-image:linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); mask-image:linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
.brand-track { display:flex; gap:10px; width:max-content; animation:brandmq 26s linear infinite; }
.brand-marquee:hover .brand-track { animation-play-state:paused; }
@keyframes brandmq { from { transform:translateX(0); } to { transform:translateX(-50%); } }
.brand-tile.mq { padding:10px 20px; min-width:auto; }
.new-badge { position:absolute; top:10px; right:10px; background:var(--ink); color:#fff; font-family:'Archivo'; font-size:9.5px; font-weight:800; letter-spacing:.6px; border-radius:5px; padding:3px 7px; }
.strip-card { position:relative; }
.preset-chip { font-size:12px; }
.art-li { display:flex; align-items:center; gap:13px; width:100%; text-align:left; background:#fff; border:1px solid var(--line); border-radius:14px; padding:15px; margin-bottom:11px; cursor:pointer; font-family:inherit; color:var(--ink); }
.art-li-ico { font-size:26px; flex:0 0 auto; }
.art-li-main { display:flex; flex-direction:column; gap:4px; min-width:0; }
.art-li-main b { font-family:'Archivo'; font-size:14.5px; line-height:1.35; }
.art-li-main .muted { font-size:12.5px; line-height:1.45; }
.art-head { border-radius:16px; padding:26px 20px; margin-bottom:16px; background:#EFF7E3; }
.art-head-ico { font-size:36px; display:block; margin-bottom:10px; }
.art-title { font-family:'Archivo'; font-size:23px; line-height:1.25; margin:0; }
.art-body p { font-size:14.5px; line-height:1.7; margin:0 0 14px; }
.art-strip { margin-bottom:14px; }
.art-cat-btn { margin-bottom:10px; }
.card-actions > .cta { flex:1 1 120px; min-width:0; white-space:nowrap; padding-left:8px; padding-right:8px; }
.chip { min-width:0; }
.chip-p { white-space:nowrap; }
.contact-rows p { margin:7px 0; font-size:14px; }
.company-box { border:1px solid var(--line); border-radius:11px; padding:13px 15px; margin:14px 0; background:#FAFBFC; }
.company-box b { font-size:13.5px; }
.company-box p { margin:7px 0 0; font-size:13px; line-height:1.65; }
.acc-save { border:1px solid var(--amber); background:#F6FBEF; }
.acc-save-lbl { font-size:13px; color:#5A6570; display:block; }
.acc-save-v { font-family:'Archivo'; font-size:30px; display:block; margin:2px 0 6px; color:var(--amber-d); }
.rodo-btns { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.rodo-btns .acc-btn { flex:1 1 150px; }
.acc-btn.ghost { background:#fff; border:1px solid var(--line); color:var(--ink); }
.acc-btn.danger { background:#fff; border:1px solid #E4B4B4; color:#B42318; }
.acc-btn.danger:hover { background:#FDF2F2; }
.del-confirm { border:1px solid #E4B4B4; background:#FDF2F2; border-radius:11px; padding:12px 14px; width:100%; }
.del-confirm p { margin:0 0 4px; font-size:13.5px; line-height:1.55; }
.addr-list { display:flex; flex-direction:column; gap:8px; margin:12px 0; }
.addr-row { display:flex; align-items:stretch; gap:6px; }
.addr-pick { flex:1; display:flex; align-items:center; gap:10px; text-align:left; border:1px solid var(--line); background:#fff; border-radius:11px; padding:11px 13px; cursor:pointer; font-family:inherit; }
.addr-row.on .addr-pick { border-color:var(--amber); background:#F6FBEF; }
.addr-radio { color:var(--amber-d); font-size:15px; }
.addr-txt { display:flex; flex-direction:column; gap:1px; font-size:13.5px; }
.addr-txt .muted { font-size:12.5px; font-weight:400; }
.addr-del { border:1px solid var(--line); background:#fff; border-radius:10px; padding:0 12px; cursor:pointer; color:#B42318; font-size:14px; }
.addr-del:hover { background:#FDF2F2; border-color:#E4B4B4; }
.addr-add { border-top:1px dashed var(--line); margin-top:12px; padding-top:12px; }
.addr-input-row { display:flex; gap:8px; }
.addr-input-row input { flex:1; min-width:0; }
.addr-gps { flex:0 0 46px; border:1px solid var(--line); background:#fff; border-radius:9px; font-size:17px; cursor:pointer; }
.addr-gps:hover { border-color:var(--amber); background:#EFF7E3; }
.cart-addr { display:flex; align-items:center; gap:9px; flex-wrap:wrap; background:#F6FBEF; border:1px solid #DDEBC9; border-radius:11px; padding:10px 12px; margin-bottom:12px; }
.cart-addr-lbl { font-size:13px; font-weight:700; }
.cart-addr-sel { flex:1; min-width:150px; padding:8px 10px; border:1px solid var(--line); border-radius:9px; font-family:inherit; font-size:13.5px; background:#fff; }
.cart-addr-edit { border:1px solid var(--line); background:#fff; border-radius:9px; padding:8px 12px; font-size:12.5px; font-weight:700; cursor:pointer; font-family:'Archivo'; }
.cart-addr-edit:hover { border-color:var(--amber); background:#EFF7E3; }
.sec-title { font-family:'Archivo'; font-size:19px; margin:2px 0 12px; }
.sec-title.top0 { margin-top:0; font-size:17px; }
.toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--ink); color:#fff; padding:12px 22px; border-radius:11px; font-weight:600; font-size:14px; z-index:60; box-shadow:0 10px 30px rgba(0,0,0,.25); }

/* ---- ADMIN ---- */
.admin-login { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--ink); }
.admin-login-box { background:#fff; border-radius:16px; padding:32px; width:100%; max-width:400px; display:flex; flex-direction:column; gap:12px; }
.admin-login-box input { padding:12px 14px; border:1px solid var(--line); border-radius:9px; font-size:15px; font-family:inherit; }
.err { color:var(--red); font-size:13px; font-weight:600; }
.linkbtn { border:0; background:none; color:var(--amber-d); font-weight:600; cursor:pointer; font-size:14px; padding:6px 0; font-family:inherit; text-align:left; }
.admin-hdr { background:var(--ink); color:#fff; display:flex; align-items:center; gap:20px; padding:14px 24px; flex-wrap:wrap; position:sticky; top:0; z-index:20; }
.admin-tag { background:var(--amber); color:var(--ink); font-size:11px; padding:2px 8px; border-radius:5px; vertical-align:middle; }
.admin-nav { display:flex; gap:4px; flex:1; flex-wrap:wrap; }
.admin-nav button { background:transparent; color:#c8cdd4; border:0; padding:9px 14px; border-radius:8px; cursor:pointer; font-family:'Archivo'; font-weight:600; font-size:13px; }
.admin-nav button.on { background:#2A313C; color:#fff; }
.admin-hdr .linkbtn { color:var(--amber); }
.admin-main { max-width:1100px; margin:0 auto; padding:24px 20px 60px; overflow-x:hidden; }
.admin-main section { max-width:100%; }
.admin-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:12px; }
.admin-main h2 { margin-top:0; }
.net-card { background:#fff; border:1px solid var(--line); border-radius:13px; padding:18px; margin-bottom:14px; }
.net-head { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.net-name { color:var(--gray); font-size:13px; }
.switch { margin-left:auto; display:flex; align-items:center; gap:7px; font-size:13px; cursor:pointer; }
.switch input { accent-color:var(--amber); width:17px; height:17px; }
.net-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; min-width:0; }
.net-grid input { min-width:0; width:100%; }
.net-grid label, .form-grid label { display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:600; color:var(--gray); }
.net-grid input, .form-grid input, .gen input, .gen select, .offer-edit input, .offer-edit select { padding:9px 11px; border:1px solid var(--line); border-radius:8px; font-size:14px; font-family:inherit; }
.net-grid .wide, .form-grid .wide { grid-column:1 / -1; }
.net-preview { margin-top:12px; font-size:12px; color:var(--gray); }
.row-between { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
.row-end { display:flex; justify-content:flex-end; gap:12px; margin-top:16px; }
.admin-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:12px; }
.admin-table { min-width:640px; width:100%; border-collapse:collapse; background:#fff; border-radius:12px; border:1px solid var(--line); font-size:13px; }
@media (max-width:980px){ .admin-table { display:block; overflow-x:auto; white-space:nowrap; -webkit-overflow-scrolling:touch; } .admin-table td { white-space:normal; min-width:110px; } }
.admin-table th { text-align:left; padding:11px 12px; background:#F5F6F8; font-family:'Archivo'; font-size:12px; text-transform:uppercase; letter-spacing:.4px; color:var(--gray); }
.admin-table td { padding:11px 12px; border-top:1px solid var(--line); vertical-align:top; }
.row-actions { white-space:nowrap; }
.row-actions button { border:1px solid var(--line); background:#fff; border-radius:7px; padding:6px 11px; cursor:pointer; font-family:inherit; margin-left:6px; font-size:12px; }
.row-actions .danger, .offer-edit .danger { color:var(--red); border-color:#f0c9c9; }
.form-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:14px; }
.offer-edit { display:grid; grid-template-columns:150px 140px 1fr 40px; gap:8px; margin-bottom:8px; }
.offer-edit .danger { border:1px solid #f0c9c9; background:#fff; border-radius:7px; cursor:pointer; }
.gen { display:flex; gap:10px; margin:14px 0; }
.gen input { flex:1; }
.gen-out { background:#fff; border:1px solid var(--line); border-radius:11px; padding:14px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; max-width:100%; }
.gen-out code { word-break:break-all; }
.net-preview code { word-break:break-all; }
.gen-out code { flex:1; }
.warn { background:#EFF7E3; border:1px solid var(--amber); border-radius:9px; padding:11px 14px; font-size:13px; margin-top:12px; }
.stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin:16px 0 24px; }
.stat { background:#fff; border:1px solid var(--line); border-radius:12px; padding:18px; }
.stat-n { font-family:'Archivo'; font-weight:800; font-size:26px; }
.stat-l { font-size:12px; color:var(--gray); margin-top:4px; }

@media (max-width:980px){
  .grid { grid-template-columns:repeat(2,1fr); } .layout { grid-template-columns:1fr; } .sidebar { display:none; }
  .filter-btn { display:inline-block; background:var(--ink); color:#fff; border:0; padding:10px 16px; border-radius:9px; font-family:'Archivo'; font-weight:700; cursor:pointer; }
  .net-grid { grid-template-columns:1fr 1fr; } .form-grid { grid-template-columns:1fr 1fr; }
  .offer-edit { grid-template-columns:1fr 1fr; }
}
@media (max-width:560px){
  .grid { grid-template-columns:1fr 1fr; gap:10px; } .price { font-size:20px; } .pname { font-size:13px; min-height:52px; }
  .sheet-grid { grid-template-columns:1fr; } .hdr-in { flex-wrap:wrap; }
  .net-grid, .form-grid, .offer-edit { grid-template-columns:1fr; }
  .gen { flex-direction:column; }
}
`;
