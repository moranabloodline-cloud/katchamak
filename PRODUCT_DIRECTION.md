# Katchamak — aktuelni proizvodni smer

Datum: 14.11.2026. Ovo je tehnički zapis odluka za postojeći projekat, ne nova aplikacija.

## Osnova

Piscu treba jedan miran prostor u kome piše, organizuje rukopis, vodi Codex i istraživanja, povezuje podatke i izvozi rad. Svaka stavka ostaje Note sa sopstvenim tekstom, metapodacima i decom. Nazive, ikone, boje i smisao određuje autor. Linkovi koriste identitete nota, ne njihove promenljive naslove.

Najnovija instrukcija korisnika isključuje ugrađeni AI. Ranije diskusije o chatbotovima, providerima, prompt marketu i model routingu nisu aktivni zahtev. Trenutna razvojna verzija koristi account cloud storage; lokalni folderi i installer se ne vraćaju ovom nadogradnjom.

## Pregledani izvori

Pregledani su dostupni projektni razgovori i dokumentacija u repozitorijumu. Katalog chatova nije isto što i pročitan kompletan sadržaj; deo istorije servis vraća skraćeno. Ovaj zapis se oslanja na stvarno pročitane relevantne poruke, bez tvrdnje da je pročitana svaka privatna sesija.

- [Dokumentacija izrade Scrivenera](https://chatgpt.com/c/6af4a3b3-2844-83ed-ba27-91a2ed441d7e): jednostavan tok, Binder/Codex/Trash, otvoreni pogledi na foldere, bez kopiranja sadržaja.
- [Objasni Katchamak aplikaciju](https://chatgpt.com/c/6af0fdae-fd48-83eb-90ff-f650b915b1df): univerzalna Note struktura, tri panela i klasični Corkboard umesto beskonačnog kanvasa.
- [Projektna dokumentacija aplikacije](https://chatgpt.com/c/6af4d53b-3270-83ed-9fbd-5fe2d1c2ef48): prirodna hijerarhija kolekcija, jednostavno kreiranje i organizovanje.
- [Novel Studio Development Lab](https://chatgpt.com/c/6ad35506-c104-83eb-ac40-e58bc750b2f8): program treba da služi autoru; dobar Codex i pregledan UI imaju prednost nad komplikacijama i tržištem promptova.
- [Povezivanje Legend Keepera](https://chatgpt.com/c/6adbeb72-9ef0-83ed-a016-e1fd4f8cc5d6): uočljivi plavi linkovi i lako kretanje kroz znanje.
- [Planiranje aplikacije Kačamak](https://chatgpt.com/c/6af5cf19-9b04-83ed-a1ec-384b5131aef9), [Provera poslednje verzije](https://chatgpt.com/c/6af4a73f-8b5c-83ed-a950-fa75c45d1a50), [Procena komponenti aplikacije](https://chatgpt.com/c/6af47902-3584-83eb-ac6b-b71f023a0f6a): sistematičan razvoj i poliranje postojeće funkcionalne osnove.
- Ovaj chat i najnoviji zahtevi: isti Preview/browser, cloud po nalogu, pamćenje radne lokacije, prazni redovi pri paste-u, plus unutar izabrane note i sada samostalno poboljšavanje proizvoda.

## Isporučena celina 0.3.0

1. **Povezano znanje:** Details povezuje note iz bilo koje sekcije. Stare veze ka Codexu ostaju iste. Link ne kopira ciljnu notu.
2. **Aliasi:** autor unosi druge nazive, nadimke i varijante pisanja. Koriste ih pretraga i prepoznavanje pominjanja. Store v8 dodaje opciono polje; stare podatke i Trash čuva.
3. **Povratne reference:** Mentions prikazuje note koje se pozivaju na trenutnu notu, odvojeno od Codex imena koja se pominju u njenom tekstu. Poklapanja poštuju granice reči i Unicode; Ann ne znači annex.
4. **Kontrolisano povezivanje teksta:** Codex imena i aliasi dobijaju plavo označavanje bez prepisivanja teksta. Autor bira cilj dvosmislenog pominjanja ili preskače pojedinačno pominjanje. Sačuvani izbori ostaju vezani za identitet note kroz preimenovanje. Formatiranje i prazni pasusi ostaju.
5. **Inline veze:** Link ili Ctrl+K umeće vezu ka noti ili sajtu na mestu kursora/selekcije. Ctrl+click otvara internu notu po ID-u. Preimenovanje ne prekida vezu. Quick preview pokazuje referencu pre napuštanja trenutnog rada.
6. **Pretraga i prečice:** naslovi i aliasi imaju viši rang od teksta. Pretražuje se ceo projekat. Strelice i Enter biraju rezultat; Ctrl+Shift+F otvara pretragu, Ctrl+S završava Save.
7. **Izvoz rukopisa:** Settings → Export manuscript bira Binder note u postojećem redosledu i izvozi HTML ili Markdown. Codex i istraživanja ne ulaze u knjigu. JSON backup ostaje namenjen kompletnom projektu.
8. **Poliranje i stabilnost:** sinopsisi u List/Corkboard više ne prikazuju HTML kod. Reči potomaka ne sabiraju se dva puta; dodavanje inline linkova ne povećava broj reči. Učitani rich text se sanitizuje. Obaveštenje o novoj verziji nudi Save & reload umesto samovoljnog reload-a tokom pisanja.

9. **Tabovi foldera:** Binder, Codex i Trash ostaju stalni. Folder može da se otvori kao zaseban tab bez kopiranja podataka; zatvaranje taba ne briše note. Postojeće sekcije mogu da se sakriju i ponovo prikažu.
10. **Timeline:** sekvencijalni pregled nota i sinopsisa prati trenutnu sekciju ili otvoreni folder, sa statusima, promenom redosleda i dodavanjem podnota.

## Granice

Napredni PDF/EPUB/DOCX compile i tipizirane relacije ostaju budući rad. Ova verzija unapređuje postojeći proizvod bez ugrađenog AI i bez menjanja privatnih rukopisa radi testiranja.

## Provera

- TypeScript i produkcijski Sites build.
- Regresije: migracija v7, stari linkovi i tekst, Unicode i granice reči, aliasi, rang pretrage, deterministički linkovi, dvosmislenost, idempotentnost, bezbedan paste i Ctrl+click.
- Izvoz: redosled Binder-a, izbor nota, isključivanje Codexa, brojanje sopstvenog teksta bez dupliranja.
- Browser QA koristi poseban lokalni probni server i sintetičku biblioteku. Korisnikovi projekti nisu testni fixture-i i nisu menjani radi provera.
- GitHub čuva izvor aplikacije. Privatni cloud podaci korisnika ostaju van repozitorijuma i instalacionih/build paketa.

## Nadogradnja 0.3.1 — Codex uz rukopis

- Iz označenog teksta Link/Ctrl+K bira postojeću notu ili pravi novu praznu Codex notu; naslov i roditelj su izbor autora. Nema posebnih Character/Place klasa niti generisanja sadržaja.
- Nova nota se povezuje sa izvornom, a rukopis ostaje otvoren. HTML selekcije, prazni pasusi i granice reči ostaju sačuvani.
- Klik na ručno umetnut link daje pregled; Open beside radi u oba smera između bilo kojih nota. Strelica za povratak vraća prethodni tab foldera, note i Write/Split raspored. Trag je kratkotrajan i ne menja šemu projekta.
- Mentions izdvaja reference iz rukopisa i filtrira po naslovu, putanji ili isečku. Novi pregled koristi isti Note sistem i prikazuje sinopsis, tekst i aliase.
- Regresije pokrivaju kreiranje podnote bez gubitka izvornog teksta, nevažeće ciljeve, povratak u oba Split panela, obrisane note i odvajanje projekata. React test proverava stvarni dialog i DOM selekciju; browser provera potvrđuje Save/reload i očuvan sadržaj povezane note.
