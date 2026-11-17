> **2026-11-17 — Druga tura ikonica i siri picker:** dodato 15 novih motiva Hammer, Handcuffs, Image gallery, Life preserver, List, Magic item, Magic staff, Medal, Merchant, Monster, Music, Equipment, Vehicle, Object collection, Omega. Jedan hammer/list oblik; vec postojece helmet/home/person/key/map/book i kolor varijante preskocene. Sve koristi currentColor i postojecu paletu. NoteTree i Timeline icon popover prosireni do 36rem uz viewport/available-height ogranicenje, 12 kolona na sm+, 8 na uskom ekranu; uklonjen zaseban mali grid scroll/fiksna sirina celija. Browser potvrdio svih 91 dugmadi potpuno vidljivih na 1280x720, bez horizontalnog/vertikalnog scrolla popovera (575x457), Monster selection sacuvan posle autosave/reload, screenshot proveren. App TypeScript/Sites build prolaze, puni tsc samo poznate examples/socket.io greske. Bez promene sheme/produkcijskog rukopisa.

> **2026-11-17 — Prosiren katalog ikonica:** dodato 25 nedostajucih jednobojnih motiva iz referenci: Airship, Ammunition, Pawn, Potion, Sphere, Bomb, Brick wall, Certificate, Checkered flag, Class, Coins, Cube, Cubes, Question, Deity, Die, Domain, Encounter, Lightning, Gauntlet, Gift, Helmet, Sword, Hat, Gun. Postojece zastave/duh/vatra/pero/kalendar/people/government/star/sphere kolor varijante nisu duplirane. Lucide i mali createLucideIcon SVG motivi koriste currentColor; postojece note ID/icon kljucevi i izbor boja ostaju. App TypeScript prolazi, puni tsc samo poznate examples/socket.io greske. Browser potvrdio nove oblike u pickeru, izbor Airship i ocuvanje posle autosave/reload; screenshot proveren. Bez promene sheme i produkcijskog rukopisa.

> **2026-11-17 — Spelling pamti poslednji izbor:** editorSpellCheck ulazi u authenticated cloud snapshot kao opcioni editorAppearance.spellCheck, automatski se snima i vraca pri initialize/refresh/reload i CAS reconciliation. True/false validira isti client/server validator; starije biblioteke bez polja zadrzavaju default true. Store v29 migracija cuva postojeci bool i popunjava nedostajuci; prethodne migracije neizmenjene. Cloud test potvrdjuje false persistence, on/off reopening, preference conflict i odbijanje string vrednosti; Page Format/app TypeScript/Sites build prolaze, puni tsc samo poznate examples/socket.io greske. Sinteticki browser potvrdio off posle reload, potom on i novi reload uz aria-pressed true; screenshot sacuvan. Produkcijski podaci nisu menjani.

> **2026-11-17 — Jednostavniji Automatic link detection:** uklonjena cetiri masovna/duplirana dugmeta (Create all instances, Ignore all instances, Accept all further links, Abandon further links) i tekst precica/uputstva. Ostaju Create link, Ignore link i Decide later; UI odluke uvek vaze samo za tekucu pojavu. Kandidat prikazuje svoju sacuvanu ikonicu i boju; fallback prati note kind/event. Radio je sr-only radi pristupacnog izbora i tastature, a izabrana kartica ima amber okvir. Regresija potvrdjuje tacno tri akcije, ikonicu, odsustvo uputstva, strelice/Enter/Esc i sve prethodne Save/failure tokove. App TypeScript/Sites build prolaze, puni tsc samo poznate examples/socket.io greske. Sinteticki browser potvrdjuje Enter prelaz Morrigan na Declan, njegovu sun ikonu i fokus Ignore strelicom; screenshot sacuvan. Produkcijski rukopis nije menjan.

> **2026-11-17 — Jednostavnija dugmad panela:** uklonjeno Add note dugme pored Search iz NoteTree zaglavlja u svim tabovima; postojece kreiranje kroz context meni ostaje. Prazno stablo sada upucuje na desni klik. AddDetailsBlock prikazuje samo Plus uz aria-label/title Add block i isti meni za vracanje blokova. App TypeScript/Sites build prolaze, puni tsc samo poznate examples/socket.io greske. Sinteticki browser potvrdio odsustvo Add note, plus bez vidljivog teksta i otvaranje/zatvaranje menija; screenshot sacuvan. Bez promena podataka.

> **2026-11-17 — Grupisani linkovi na dnu dokumenta:** lista sada prikazuje samo postojece povezane note, jednom po target ID-u, po stvarnim roditeljskim grupama i abecedi. Koristi boju i aktuelni naslov note; ukljucuje prihvacene LinkChoice i rucne inline anchor veze, iskljucuje skip/missing. Razliciti istoimeni ID-jevi ostaju zasebni. Brojac prikazuje broj jedinstvenih povezanih nota; klik otvara NotePreview bez izmene rukopisa. Test link-footer pokriva ponavljanja, grupe, sortiranje, inline veze, skip/missing, istoimene ciljeve i preview; knowledge/note-links/app TypeScript/Sites build prolaze. Puni tsc samo poznate examples/socket.io greske. Sinteticki browser prikaz i klik Morrigan provereni; produkcijski tekst nije menjan.

> **2026-11-17 — Svaki rucni Save pokrece svez link pregled:** prepareLinkReview na pocetku nove sesije uklanja stare null/skip odluke i odluke sa nestalim target ID-jem, cuvajuci vazeca odobrena povezivanja i posle rename-a. Preskakanje vazi za tekuci pregled, ne blokira sledeci Save; dopisani tekst ponovo se pretrazuje. Postojeci ispravni anchor linkovi se ne diraju; #note anchor sa nedostupnim ID-jem se odmotava uz ocuvan tekst/unutrasnji markup i ulazi u novi scan. Nema automatskog preusmeravanja istoimenih ciljeva. DOM text-node koordinate cuvaju sve validne odluke i izmedju vise popravljenih anchor-a; stanje se priprema pre cloud upisa, dok pregled ostaje nezavisan od mreze. Pregled/toast prijavljuju broj uklonjenih nedostupnih veza. Bez nove trajne sheme; stari skip zapisi se ciste tek pri Save-u otvorene note. Link-review/AutoLinkReview regresije pokrivaju repeat Save, nove recenice, old skip, invalid IDs, vise broken anchor-a, stabilne okolne veze, ambigvitet, persistence i slow/failing save. Note-links/Cloud library/app TypeScript i Sites build prolaze, puni tsc samo prethodne examples/socket.io greske. Browser sinteticki potvrdjuje obnovu preskocene Morrigan, repair Data Ocean ID-a, ocuvan manual anchor/strong, jedan novi predlog posle dopisivanja, reoffer posle Ignore, zatim save/reload svih vazecih veza; screenshot proveren. Produkcijski rukopis nije menjan.

> **2026-11-17 — Clear formatting uklanja tekstualne linkove:** utvrdjeno read-only pregledom da problem Data Ocean predstavlja anchor sa neispravnim note ID-em. Chromium removeFormat cuva anchor, pa Clear sada eksplicitno odmotava samo linkove dodirnute selekcijom, odnosno samo anchor pod kursorom ako nema selekcije. Cuvaju se tekst, ostale veze, pozicija selekcije i jedan Undo korak; quote ponašanje ostaje. Ne menja automatske LinkChoice odluke niti druge pojave istog naziva. Editor-formatting regresija sada zahteva unlink uz ocuvan tekst, partial selection, caret i tacan Undo, te ocuvanje susednog linka; RichEditor, Page Format, Continuous, app TypeScript/Sites build prolaze. Puni tsc samo prethodne examples/socket.io greske. Browser stvarna toolbar ikona potvrduje caret clear, Undo, selekciju Data Ocean, save/reload bez neispravnog anchor-a i ocuvan Keep link; screenshot proveren. Produkcijski rukopis nije menjan.

> **2026-11-17 — Codex pretraga po pocetku naziva:** title filter sada koristi startsWith umesto includes: Bl prikazuje samo nazive koji pocinju tim slovima, Blo dalje suzava. Zadrzani case-insensitive/Unicode/trim i reset praznim unosom. Regresija proverava Blackpool/Bloodline/Blue Gate i iskljucuje A Black Stone/Table, plus sledece slovo; Knowledge i app TypeScript/build prolaze, puni tsc samo prethodne examples/socket.io greske. Browser potvrda Bl i Blo, screenshot proveren. Bez promene podataka.

> **2026-11-17 — Codex picker pretrazuje samo naziv:** CodexNotePicker koristi searchNoteTitles umesto opste title/body/aliases/path pretrage. Delimicni naziv, velika/mala slova, trim i ekvivalentni Unicode se podrzavaju; postojece iskljucivanje trenutne/povezanih nota, grupe i redosled ostaju. Prazne grupe nestaju, prazno polje vraca sve dostupne note. Knowledge regresija pokriva ime, body-only, alias-only, parent-path i Unicode; Details i app TypeScript prolaze. Puni tsc samo prethodne examples/socket.io greske. Preuzete najnovije origin/main izmene fontova bez prepisivanja. Browser sinteticki vale daje samo Ada Vale, iskljucuje Unrelated sa tim body/alias tekstom, unknown daje prazan rezultat, reset vraca sve; screenshot proveren. Sites build prolazi. Bez promene sheme/rukopisa.

> **2026-11-17 — Backups & Export stalno otvoren:** details/summary zamenjeni obicnim section/h2, pa su Export manuscript, Export JSON backup i Import into library uvek prikazani. Nema strelice ni collapse interakcije; akcije nepromenjene. App TypeScript i Sites build prolaze, puni tsc samo prethodne examples/socket.io greske. Browser potvrdjuje sva tri dugmeta odmah i posle klika na naslov, bez details elementa; screenshot proveren. Bez promene sheme/podataka.

> **2026-11-17 — Kraci Settings tekst:** naslov Metadata promenjen u tacno Meta (bez uppercase transformacije); uklonjeni samo opis ispod tog naslova i opis ispod Cover. Postojeca polja, upload i akcije ostaju nepromenjeni. App TypeScript i Sites build prolaze; puni tsc samo prethodne examples/socket.io greske. Browser Settings potvrdjuje Meta i odsustvo oba opisa, screenshot proveren. Bez promene podataka.

> **2026-11-17 — Tastatura u Automatic link detection:** Up/Down ciklicno prolaze kroz ciljeve ili omogucene akcije, Left vraca fokus na ciljeve, Right prelazi na akcije, Enter na izabranom cilju pravi njegov pojedinacni link (dugmad zadrzavaju nativni Enter), Escape zatvara bez odluke o preostalim linkovima. Tab ostaje nativan. Pocetni fokus je Create link za jedan cilj, odnosno prvi radio bez automatskog izbora za vise istoimenih kandidata; sledeca stavka cuva dostupnu tekucu akciju ili vraca fokus na ciljeve ako Create postane disabled. Vidljivi focus ring, preskakanje disabled dugmadi i zastita od drzanog Enter-a; kombinacije s modifikatorima i IME nisu preuzete. Lokalni odziv i cloud save loop nepromenjeni. Auto-link-review regresija pokriva pocetni fokus, ambigvitet, Up/Down wrap, Left/Right, preskakanje disabled, Enter sa tacnim target ID i Escape uz prethodne slow-save/retry provere. App TypeScript/Sites build prolaze, puni tsc samo prethodne examples/socket.io greske. Browser proverava stvarne tastere, promenu cilja, Enter akcije, reset na sledeci ambigvitet i Escape/reopen sa istim preostalim brojem; screenshot proveren. Bez promene sheme ili produkcijskog rukopisa.

> **2026-11-17 — Logo/Home, Search i Mentions:** uklonjena posebna Home ikonica iz workspace navigation reda; postojeci logo/naziv je pristupacno dugme sa istim closeNovel povratkom u biblioteku. Search pocinje na levom rubu reda i ima placeholder/aria-label tacno Search, bez tacke; Ctrl+Shift+F koristi novi naziv. Povratak na prethodnu notu ostaje desno od pretrage. Mentions vise nema Referenced by naslov, filter ni njegov query state; reference ostaju grupisane po tabovima, a uz svaku grupu je mali broj njenih izvornih nota kao na referenci. Bez promene veza, indeksa ili sheme. Details/Knowledge testovi i app TypeScript/Sites build prolaze, puni tsc samo prethodne examples/socket.io greske. Browser sinteticki proverava Search, shortcut, rezultat sa istim nazivom u vise tabova, Binder 2 / Research 1, uklonjene kontrole i stvarni povratak u Library preko logotipa; screenshot proveren. Produkcijski rukopisi nisu menjani.

> **2026-11-17 — Vidljiv cilj u donjem brojacu:** kad otvorena nota ima aktivan Document Target, footer sada prikazuje trenutni broj/cilj i jedinicu (npr. 595/5,000 words), koristeci isti glavni tekst kao progress. Prosirena raspoloziva sirina da odnos ne bude skracen na staru sirinu brojaca. Bez cilja ostaje prethodni broj, a Continuous zadrzava zbir svog prikaza. Browser sintetickih 595 reci i dodatnog Synopsis teksta potvrdjuje tacan prikaz 595/5,000 words i citljiv raspored; screenshot proveren. Document-target/Continuous testovi, app TypeScript i Sites build prolaze; puni tsc samo prethodne examples/socket.io greske. Bez promene sheme ili produkcijskih podataka.

> **2026-11-17 — Document Target:** postojeca target ikona u dnu radne povrsine sada otvara dijalog sa ciljem u Words/Characters, Minimum target, Overrun allowance, Show overrun, Show allowance in progress bar i Show target notifications, te OK. Ciljevi pripadaju pojedinacnoj noti na svakom tabu; meri se samo glavni tekst, bez Synopsis/Notes i podnota. Ispod ikonice je live progress; allowance po izboru prosiruje skalu, overrun se prikazuje u tooltipu/dijalogu. Obavestenja samo pri prelasku minimum/cilj/allowance granice iste note, bez laznih obavestenja na ucitavanje/promenu podesavanja. Zatvaranje bez OK odbacuje draft, navigacija zatvara prethodni dijalog, postavljeni 0 iskljucuje cilj. Opciono NoteNode.documentTarget, store v28 bez izmene starih migracija; client/update/import i cloud validiraju cele nenegativne granice, jedinicu i booleane. Novi test pokriva racun, pragove, validaciju, izolaciju, backup/cloud i v28 migraciju, OK/cancel/navigaciju. Authenticated cloud test eksplicitno potvrduje save/reload cilja; Continuous i app TypeScript prolaze, puni tsc samo prethodne examples/socket.io greske. Browser sinteticka nota potvrduje 8/10 do 10/10 obavestenje, 12/10 overrun +2, nezavisni cilj druge note i reload svih opcija; screenshot proveren. Sites build prolazi. Produkcijski rukopisi nisu menjani.

> **2026-11-17 — Manji image preview:** pregled ogranicen na 80% sirine/visine prozora i najvise 960x800 CSS px, uz ocuvane proporcije. Ne popunjava gotovo ceo ekran na velikim monitorima. Postojeci note-image test i app TypeScript prolaze; puni tsc samo prethodne examples/socket.io greske. Browser portret na 1280x720 je 383x574 umesto 448x672; screenshot proveren. Bez promene podataka.

> **2026-11-17 — Uvecani prikaz note slike:** klik ili Enter/Space na slici u desnom Details panelu otvara Radix modal preko zatamnjene radne povrsine. Dimenzije se racunaju prema stvarnom odnosu stranica i dostupnom viewportu, bez odsecanja; portret i landscape koriste raspolozivu visinu/sirinu. Escape, X i klik van slike zatvaraju pregled, fokus se vraca na sliku. Hover Upload/Paste/Remove ostaju odvojene akcije, bez nenamernog otvaranja; promena note/projekta zatvara prethodni pregled. Ne menja podatke, kompresiju niti shemu. Note-image regresija pokriva otvaranje/zatvaranje, accessible naslov, isti izvor slike, nepromenjene podatke i navigaciju uz postojece upload/paste/remove provere; Details blocks i app TypeScript prolaze. Puni tsc ima samo prethodne examples/socket.io greske. Browser sinteticki portret/landscape potvrdjuje proporcije, Escape, X, klik van slike, Enter i povratak fokusa; screenshot sacuvan. Sites build prolazi. Produkcijski rukopisi nisu menjani.

> **2026-11-17 — Odziv rucnog Save-a:** Ctrl+S i disketica odmah prikazuju Saving i spinner pre serijalizacije. Lokalni pregled linkova se priprema paralelno sa cloud upisom, bez cekanja mreze; dugmad pregleda ostaju dostupna. Ponovljeni zahtevi za istu notu se objedinjuju, aktivni pregled se cuva, promena note tokom pripreme ne otvara zastareli pregled. Saved se prikazuje tek posle stvarnog uspeha; neuspeh ostavlja lokalni tekst i odluke za retry. Nema promene cloud CAS/protokola niti trajne sheme. Auto-link-review test pokriva blokiran upis, ponovljeni Save, brze odluke, failure/retry i promenu note; cloud-library, page-format i app TypeScript prolaze. Puni tsc ima samo prethodne examples/socket.io greske. Browser na sintetickom projektu sa 200 poglavlja i POST kasnjenjem 4s potvrdjuje trenutni odziv oba nacina, aktivan pregled tokom upisa i saved stanje posle potvrde servera; screenshot sacuvan. Sites build prolazi; produkcijski rukopisi nisu menjani.

> **2026-11-17 — Prevlačenje workspace tabova:** Binder/Codex/opcione sekcije/Timeline i otvoreni note/folder tabovi sada koriste postojeci dnd-kit horizontalni sortable. Cela oznaka taba je rucica, uz prag 5px za razliku izmedju klika i draga; samo drop menja store, ne svako pomeranje. Klik/Enter i desni context menu ostaju, Space + Left/Right + Space pomera tastaturom, Escape otkazuje. Drag ne menja aktivni tab, otvorenu notu niti sadrzaj editora. Plus, Format, Focus i Trash ostaju fiksne akcije. Opciono Novel.tabOrder cuva kljuceve po projektu kroz cloud/JSON, pamti mesta zatvorenih/sakrivenih tabova i koristi aktuelne naslove pri rename-u; novi/nepoznati/stari tabovi bez reda imaju kompatibilan fallback. Store v27 sa novom praznom migracionom granom, client/import i server validacija duplikata/neispravnih kljuceva; project-id guard i DndContext reset sprecavaju kasni drop u drugi projekat. Nova workspace-tabs regresija proverava defaults, folder/Timeline/sekcije, nepromenjene sections/selekciju, close/reopen, rename, izolaciju, roundtrip, invalid values i migraciju; cloud-library ima stvarni authenticated save/reload reda, Continuous i app TypeScript prolaze. Puni tsc samo prethodne dozvoljene examples/socket.io greske. Browser pravi pointer drag Codex udesno i World ulevo, keyboard Timeline, Escape cancel, Enter navigaciju i postojeci desni meni; aktivni Binder/Chapter 0 ostaju tokom draga, reload cuva novi red. Screenshot proveren. Sites build prolazi; bez izmene rukopisa.

> **2026-11-17 — Dvoklik bez okolnog razmaka:** zajednicki trimWordSelection obrezuje samo vodeci/zavrsni whitespace nativne word selekcije posle obicnog dvoklika. Ne prepisuje tekst/HTML, ne dodaje input/save ili Undo korak i ne menja apostrofe; radi preko granica inline tekstualnih cvorova, cuva smer selekcije i ne zahvata drugi editor. RichEditor pokriva sve tabove/Split i Info editore, Continuous koristi istu obradu na svom read-only tekstu. Shift/Ctrl/Meta/Alt dvoklik i selekcija samo belina ostaju nativni. Nova regresija pokriva razmake, NBSP, obican/zakrivljeni apostrof, inline bold granice, smer, izolaciju i React event bez onChange; rich-editor, Continuous, app TypeScript i Sites build prolaze. Puni tsc samo prethodne dozvoljene examples/socket.io greske. Browser pravi dvoklik daje tacno 6 znakova Ogma apostrof s, bez razmaka, za oba apostrofa; HTML nepromenjen, zamena sa Nuada cuva razmak ispred fighting, Undo vraca original; isto u Continuous. Screenshot selekcije proveren. Bez promene sheme ili produkcijskog rukopisa.

> **2026-11-17 — Quote toggle i Clear formatting:** Quote ikona sada koristi sacuvanu selekciju i zaista ukljucuje/iskljucuje citat, sa aria-pressed stanjem. Uklanjanje deli vise-pasusni blockquote na zadrzane delove i obicne izabrane pasuse, uz ocuvanje susednog teksta, inline markupa i linkova. Clear formatting radi nad oznacenim tekstom ili tekucim pasusom kada je samo kursor: uklanja inline formatiranje, stil bloka i quote/heading omotac, uz ocuvanje teksta i ciljeva veza. Native input/beforeinput tokom komande se grupisu u jedan cist upis/Undo; privremeni markeri se nikad ne cuvaju. Pozicija selekcije se vraca tekstualnim koordinatama jer Chromium pri formatBlock pomera bookmark granice van novog citata; neposredni drugi klik sada prepoznaje isti quote. Read-only guard ostaje. Blockquote je uvucen 1.5em, italic, iste boje kao okolni tekst, sa 1.25em vertikalnim razmakom i bez leve linije u obe teme. Nova editor-formatting regresija pokriva direct/multi-paragraph citate, ponovljeni toggle, granice selekcije, caret, linkove, native event batching, jedan Undo i read-only; rich-editor/page-format/Continuous i app TypeScript prolaze. Puni tsc samo ranije dozvoljene examples/socket.io greske. Browser potvrdjuje Quote on/off/on/off, aktivnu ikonu, Clear bez quote/bold uz sacuvan href, Undo/Redo, save/reload i vizuelni border 0 / italic / 30px inset na 20px fontu. Screenshot proveren. Sites build prolazi; bez promene sheme ili produkcijskog rukopisa.

> **2026-11-17 — Stacked lenjir:** sirina lenjira u Stacked prikazu racuna unutrasnju sirinu stranice (izabrana sirina umanjena za padding i ivice), da nula ostane uz tekst. Centered/Fit izgled nepromenjen; CSS korekcija uz Format/Focus.

> **2026-11-17 — Format strane i Focus:** levo od Trash dodati Format i Focus. Format ima samo Typography (font, cetiri velicine/proreda/uvlacenja/razmaka, Chicago izuzeci, pet sirina, Left/Justify, Line/Dots/Asterisks/Space) i Page (Centered, Fit content = puna raspoloziva sirina, Stacked = zasebne stranice, Colorize annotations). Zajednicki PageSurface/ruler/CSS pokriva Write, oba Split editora i read-only Continuous; podrazumevani paragraphGap=null cuva prethodne razmake dok korisnik ne izabere preset. Page defaults ne prepisuju HTML, a lokalni inline stilovi ostaju izuzeci. Font/size/line spacing u text toolbaru sada formatiraju samo oznacene tekstualne listove, cuvaju blokove/linkove/bold i koriste postojeci Undo; ponovljene izmene koriste isti span. Focus samo sakriva header/panele/toolbar/ruler/outline/footer CSS-om, bez unmount-a editora ili promene panel prefs; cuva kursor, odmah omogucava pisanje, Esc/Exit focus vracaju UI. Store v26 dodaje pageFormat sa novom migracijom bez menjanja starih grana; opcioni editorAppearance snapshot se cuva po autentifikovanom nalogu, validira zajednickim validatorom i ukljucen je u Sites Worker/runtime hash. CAS reconciler cuva pending appearance izmene kada druga strana menja samo navigaciju, bez prepisivanja razlicitih rukopisa. Provere: page-format (granice selekcije, markup, Undo, bez promene defaulta/rukopisa, migracija, Focus identitet/fokus/paneli), cloud-library (roundtrip, validacija, novija revizija, izolacija), rich-editor, note-links, auto-link-review, continuous, outline i app TypeScript prolaze; Sites build prolazi. Puni tsc samo prethodne dozvoljene examples/socket.io greske. Browser sinteticki: Alpha 24px/Georgia/48px samo u selekciji naspram ostalog 16px/Segoe/24px; Undo vraca originalni HTML; ceo dokument 18px/Georgia/36px kroz Format, Chicago 0/27px, sirine 576/1233px, svi razdelnici, boje anotacija, iste prefs posle reload-a, Split/Continuous i Focus pisanje/Undo/Escape. Screenshot Format i Focus proveren. Produkcijski rukopisi nisu menjani.

> **2026-11-17 — Diskretan hover Outline:** stalna otvorena kolona zamenjena je trakom od 36px sa kratkim crticama za naslove; aktivna crtica je naglasena. Hover otvara plutajuci meni u postojecoj popover paleti, sa naslovom note i uvucenim podnaslovima; ne pomera niti suzava dokument pri otvaranju. Napustanje, Escape i promena dokumenta zatvaraju meni; tastaturni fokus i klik takodje omogucavaju pristup. Postojeca live H1-H6 detekcija, navigacija na tacno pojavljivanje i aktivni Split scope ostaju. Observer ostaje aktivan dok su vidljive samo crtice. Outline/Continuous regresije, app TypeScript i Sites build prolaze; puni tsc samo prethodne dozvoljene examples/socket.io greske. Browser potvrdjuje odsustvo naslova van hovera, sirinu 36px u oba stanja, prelazak u meni i klik, zatvaranje pri odlasku na tekst i promenu note. Screenshot oba stanja proveren; bez promene sheme ili rukopisa.

> **2026-11-17 — Pregled naslova dokumenta:** izmedju levog stabla i radnog teksta dodat je sklopiv Outline sa nazivom note, H1-H6 hijerarhijom i klikom za skok na tacno pojavljivanje. Zajednicki NotesSection pokriva sve tabove, Write, aktivnu Split povrsinu i Continuous prikaz; Grid/List/Timeline ostaju bez dodatne kolone. Prati izmene naslova iz rendered DOM-a, bez ID injekcije, prepisivanja HTML-a ili skeniranja projekta tokom obicnog pisanja. Skrivanje je lokalno UI stanje, bez nove sheme. Test pokriva podnaslove, istoimene ciljeve, rename/dodavanje/uklanjanje, promenu note/povrsine i hide/show; Continuous regresija i app TypeScript prolaze. Sites produkcijski build prolazi. Puni tsc ima prethodne dozvoljene examples/socket.io greske; podrazumevani desktop build kompajlira, ali postojeci privacy guard hvata raniji naziv funkcije publishMorriganDemo (ne sadrzaj rukopisa), nevezano za ovu izmenu. Browser sinteticki Binder/Codex potvrduje unos uz live outline, navigaciju, skrivanje, Split A/B i Continuous; screenshot proveren. Produkcijski rukopisi nisu menjani.

> **2026-11-17 — Automatska visina Aliases polja:** textarea koristi rows=1, field-sizing:content, fiksnu punu sirinu roditelja i resize:none/overflow:hidden. Visina prati broj i prelamanje redova, a posle brisanja se smanjuje; nema rucne rucice niti zaostale visine. Autosave/sort logika i podaci nepromenjeni. Details regresija, app TypeScript/build prolaze; puni tsc samo prethodni dozvoljeni examples/socket.io. Browser meri stalnih 264px sirine, oko 33px za jedan red i 65px za tri reda/dug prelomljen unos, bez scroll overflowa; brisanje vraca 33px. Screenshot proveren.

> **2026-11-17 — Automatski abecedni Codex linkovi:** groupLinkedNotes sortira samo sopstvene prikazne entries unutar svake grupe po aktuelnom naslovu, preko jednog Intl.Collator-a (case-insensitive, prirodni brojevi). Redosled grupa, izabrani ID-evi, veze i note tree se ne menjaju. Postojece/nove veze i preimenovani ciljevi automatski dobijaju odgovarajuce mesto. Knowledge regresija pokriva vise grupa, obrnuti izbor, razlicita slova/brojeve, rename i nepromenjen izvor; Details, app TypeScript/build prolaze, puni tsc samo prethodni dozvoljeni examples/socket.io. Browser Characters/Locations sa namerno izmesanim izborom i ponovno dodavanje Ada Vale potvrduju A-Z prikaz. Bez promene sheme/rukopisa.

> **2026-11-17 — Boje nativnih toolbar menija:** Text style/Font/Font size/Line spacing sada imaju color-scheme:dark i eksplicitne option background/foreground iz app popover palete. Light tema koristi color-scheme:light. Izmena je samo CSS, bez zamene kontrola ili promene formatiranja/selektovanja. Browser otvara Text style i computed-style potvrduje istu tamnu pozadinu/svetao tekst za opcije sva cetiri menija; sistemski popup nije vidljiv u browser screenshot-u. App TypeScript/build prolaze; puni tsc samo prethodne dozvoljene examples/socket.io greske. Bez izmene podataka.

> **2026-11-17 — Codex akcija u zaglavlju:** zasebno + Codex dugme uklonjeno iz tela; isti CodexNotePicker sada je samo pristupacna + ikona neposredno uz gornji naslov kroz DetailsBlock headerAction. Plus je odvojen od collapse/drag kontrola i dostupan i u skupljenom bloku. Linkovi imenovanih grupa uvuceni su 12px, dok nazivi grupa ostaju levo; boje/link/remove logika nepromenjeni. Details regresija, app TypeScript/build prolaze; puni tsc samo prethodne dozvoljene examples/socket.io greske. Browser potvrduje Characters/Locations indent, jedan header plus, dodavanje Declan linka bez collapse-a i picker dok je blok skupljen. Bez promene sheme/rukopisa.

> **2026-11-17 — Ujednaceni razmaci buleta:** pregled Nuada liste potvrdio je inline tekst u prvoj stavci i p margin-bottom:1em u sledecim stavkama. Zajednicki .kachamak-editor CSS sada namece margin-block/padding-block 0 i nasledjeni line-height za li i njegove p/div omotace, ukljucujuci numerisane i ugnjezdene liste. Ne prepisuje HTML niti tekst; horizontalno uvucenje i pasusi van lista ostaju. Browser sinteticka lista sa inline marginama/paddingom/proredom meri tri reda po 24px i nulte vertikalne margine u Write i Continuous; obican pasus zadrzava 16px, podlista 24px indent. App TypeScript/build prolaze, puni tsc samo prethodne dozvoljene examples/socket.io greske; screenshot proveren.

> **2026-11-17 — Ista --- prečica u svim tabovima:** zajednicki RichEditor sada prepoznaje samostalan marker i u list item-u i u mekom redu (Shift+Enter/pre-wrap/br), umesto oslanjanja na ceo p/div tekst. Marker izlazi iz liste uz ocuvanje prethodnih/sledećih stavki i OL numeracije; browser P/list wrapper se deli u validne blokove. Enter je fallback za vec unet marker/browser input varijante; paste/Undo ne pokrecu spontanu konverziju. Kod, naslovi i crtice unutar recenice ostaju literalni po postojecim pravilima. Divider/history/RichEditor testovi prolaze, ukljucujuci typed input, Enter i Undo u svih sedam SECTION_KEYS; app TypeScript/build cisti, puni tsc samo prethodni dozvoljeni examples/socket.io. Browser Codex lista i Research Shift+Enter daju jednu liniju, pisanje posle nje i cloud/reload roundtrip bez gubitka okolnog teksta. Bez promene sheme ili postojecih rukopisa.

> **2026-11-17 — Redosled i skupljanje Details blokova:** Image/Aliases/Codex se pomeraju hover/focus rucicom preko postojeceg dnd-kit; tastatura Space + strelice + Space takodje radi. Naslov je pristupacno dugme sa aria-expanded i strelicom; klik skuplja/prosiruje telo bez brisanja/unmount-a sadrzaja. Redosled, skupljeno i sakriveno stanje su nezavisni po noti, sa cloud/JSON cuvanjem. Opciono detailBlockOrder/collapsedDetailBlocks, store v25, stroga client/import/server validacija i bez menjanja starih migracija. Details/cloud regresije pokrivaju podatke, izolaciju, portable roundtrip i neispravne vrednosti; TypeScript/build prolaze (puni tsc samo prethodni dozvoljeni examples/socket.io). Browser potvrduje pravo prevlacenje, tastaturu, skupljanje i isti raspored/aliase nakon save/reload. Bez izmene rukopisa.

> **2026-11-17 — Automatski Aliases:** uklonjeni Save i Sort tasteri. Svaka izmena upisuje normalizovane aliase u postojeci store/cloud tok; spisak se sortira prirodno A-Z i uklanja duplikate. Lokalni unos zadrzava redove/kursor tokom pisanja, prikaz se sortira na blur. Nema ponovnog upisa za identican spisak. Details regresija proverava autosave, duplikate, stabilan unos, sortiranje na blur i odsustvo dugmadi; app TypeScript/build prolaze, puni tsc ima samo prethodne dozvoljene socket.io greske u examples. Browser save/reload cuva Ana/Zora bez Save/Sort. Bez promene sheme ili rukopisa.

> **2026-11-17 — Kompaktniji Details razmaci:** razmak od razdelnika do sledeceg zaglavlja smanjen sa 20 na 8px, header/body sa 12 na 6px, donji padding sa 16 na 8px. Aliases vise ne sabira mt-2 sa razmacima roditelja; kontrolni red koristi isti 8px ritam. Mentions razmaci i sve funkcije/podaci nepromenjeni. Details regresija, app TypeScript i produkcijski build prolaze; puni tsc ima samo prethodne dozvoljene socket.io greske u examples. Browser meri 8px izmedju sekcija i 6px naslov/sadrzaj; screenshot proveren.

> **2026-11-17 — Bezbedan oporavak od konflikta revizije:** cloud Save sada na 409 proverava sacuvanu osnovu, trenutno lokalno stanje i noviju cloud kopiju. Ako je jedna strana menjala samo navigaciju/prikaz, bezbedno preuzima noviji sadrzaj ili ponavlja lokalni upis na novoj reviziji. Identicni sadrzaji takodje izlaze iz konflikta. Razlicite izmene projekata/kolekcija se nikad ne prepisuju; Retry ponovo proverava stanje. Najvise dva automatska ponavljanja; accountChanged 409 nije content konflikt. Bez promene sheme ili rukopisa. Cloud regresije pokrivaju oba smera navigacije, identican upis i stvarni konflikt/retry; auto-link-review, account-auth, app typecheck i Sites build prolaze. Puni tsc ima samo dozvoljene ranije socket.io greske u examples. Browser sintetski 409 pa save/reload zadrzava tekst. Postojeci korisnikov prozor nije reloadovan; preuzet JSON backup otvorenog projekta.

> **2026-11-17 — Zasebni Details blokovi:** Image, Aliases i Codex imaju svoje zaglavlje i hover/focus meni Hide block. Add block vraca sakrivene sekcije; izbor je po noti, bez brisanja slike, aliasa ili veza. Opciono hiddenDetailBlocks polje, store v24, client/import i cloud validacija. Details/image/cloud regresije i Sites build prolaze; tsc ima samo ranije dozvoljene missing socket.io module u examples. Browser je potvrdio hide/restore i isti raspored posle cloud save/reload na sintetskom projektu. Info i Mentions nisu menjani.

> **2026-11-16 — Stalna formatna traka u prikazima nota:** NotesSection vise ne zamenjuje EditorToolbar praznim redom van Write/Split prikaza. Jedna fiksna instanca sada ostaje u Write, Split, Continuous, Grid, List i Timeline prikazima. Postojeca Continuous read-only logika ostaje; bez promene podataka ili komandi. Continuous regresija, TypeScript/build i browser svih sest prikaza potvrdjuju jednu vidljivu traku; screenshot Continuous prikaza sa kontrolama.

> **2026-11-16 — Continuous bez pomocnog natpisa:** uklonjen vidljivi Read only / Selected note and sub-notes / All notes in this tab red iznad prvog naslova. Continuous scope, read-only semantika i sadrzaj ostaju. Postojeci continuous-write test, TypeScript/build i browser odsustvo natpisa prolaze.

> **2026-11-16 — Responsive slika u Details:** fiksni 96px avatar zamenjen je poljem pune sirine roditelja sa odnosom 6:5, isprekidanom ivicom i Add an image placeholderom prema referenci. Postojeca slika koristi object-contain da se ne odseca; Upload/Paste ostaju hover/focus kontrole. Bez promene image podataka, kompresije ili save logike. TypeScript/build i browser resize desnog panela: polje raste sa 264x220 na 376x313px i odgovara sirini roditelja.

> **2026-11-16 — Slika note u Details:** iznad Aliases dodat je kvadratni 96px prikaz sa UserCircle placeholderom. Upload/Paste i uklanjanje su vidljivi samo na hover/fokus; Upload bira lokalni raster, Paste cita clipboard sliku, Ctrl+V na polju je podrska za browser bez clipboard.read. Obrada koristi postojeci raster reader sa granicom 384x384 za male portrete; postojece naslovnice/baneri zadrzavaju svoje dimenzije. NoteNode.image je opciono bounded data polje (JPEG/PNG/WebP), store v23 bez izmisljanja slika; client update/import i server validiraju format/velicinu. Cloud i JSON cuvaju sliku uz notu u bilo kom tabu. Brojac zahteva i project/note guard sprečavaju kasni upload u drugu notu. Provere: note-image (upload/paste/remove/invalid/navigation race/migration), cloud save/reload i odbijanje SVG/oversize, project-settings, TypeScript/build; browser pravi PNG Upload, clipboard Paste, opacity 0 van slike, prikaz komandi i slika posle reload-a. Bez promene teksta/linkova.

> **2026-11-16 — Uklonjen Library path red:** uklonjeni oznaceni breadcrumb Library/Books/... i Parent collection strelica sa celim praznim redom iznad Library toolbar-a. Uklonjeni sada nepotrebni lokalni path i ArrowLeft import; collectionPath ostaje za postojece menije/pomeranje. Stablo, logo Library home i akcije ostaju. TypeScript/build i browser potvrdjuju odsustvo oba elementa i izbor Books iz stabla. Bez promene podataka.

> **2026-11-16 — Ikonice kolekcija:** Anime koristi Tv, Books BookOpen, Comics BookImage, Games Gamepad2, Movies Clapperboard, Software CodeXml iz postojeceg Lucide seta. Ista CollectionIcon komponenta vazi za levo stablo i Grid/List kartice; nazivi se porede bez obzira na velicinu slova, druge kolekcije zadrzavaju folder. Prikaz je izveden iz naziva i ne menja podatke niti shemu. TypeScript, produkcijski build i browser sa svih sest kolekcija prolaze.

> **2026-11-16 — KACHAMAK brend biblioteke i Sort/Group:** Library header sada koristi tacan naziv KACHAMAK i postojeci /kachamak-logo.png umesto Feather ikone, ukljucujuci pristupacan Library home naziv. Sort: Name, Series, Date (updated), Author; Group: None, Series, Date (dan poslednje izmene), Author. Bez Shared po Nikolinoj potvrdi. Series koristi prirodno poredjenje indeksa (Book 2 pre Book 10), projekti bez serijala imaju No series grupu. Kolekcije ostaju u svojoj hijerarhiji, grupisanje ne menja metadata. Library preferences v2 migracija cuva v1 izbor/lokaciju/zoom/layout, legacy created sort ostaje kompatibilan. Provere: library-order, library, TypeScript/build i browser zaglavlja, svih opcija, Series redosleda i Date grupisanja u Grid/List. Bez promene rukopisa.

> **2026-11-16 — Hide left panel u najgornjoj traci:** kontrola je premestena iz drugog reda u Workspace header, ml-auto desno od brenda i uz granicu pre Binder taba. Uklonjeni dupli levi Hide tasteri iz NoteTree/Trash reda; Home/search ostaju ispod. Postojeci Show panel vraca zatvoreni panel. TypeScript/build i browser hide/show ciklus i screenshot prolaze; bez promene podataka.

> **2026-11-16 — Zamena mesta logotipa i navigacije:** staticki WorkspaceBrand premesten je u gornji levi red, a Home, istorija note i postojeca projektna pretraga u drugi red levog panela, na ranije mesto brenda. Zajednicki WorkspaceNavigation koristi se u NoteTree i Trash levom panelu; nema kruznih importa niti promene logike pretrage/navigacije. Hide panel i Add note ostaju u drugom redu. TypeScript i produkcijski build prolaze; browser potvrdjuje raspored i rezultate pretrage na novom mestu. Bez promene podataka.

> **2026-11-16 — Brzi odziv Automatic link detection:** Create/Ignore sada odmah upisuju lokalni izbor i prelaze na sledece pojavljivanje, bez cekanja cloud roundtrip-a. Postojeca save petlja redom salje i odluke pristigle tokom ranijeg upisa; uspeh se prijavljuje tek po zavrsenom slanju, greska cuva lokalne izbore i nudi Retry Save. Status u prozoru prati pending/error. Ref zastita odbija zastareli dupli klik; validacija identiteta, dvosmislenih ciljeva i izmenjenog teksta ostaje. Putanje kandidata se racunaju bez indeksiranja celog sadrzaja, a kontekst se memoizuje. Regression test drzi odgovor servera blokiranim: sledeci link i druga akcija su dostupni, Decide later zatvara odmah, dva upisa cuvaju sve izbore; neuspeh i Retry prolaze. Browser sa 4s simuliranim kasnjenjem potvrdjuje 1 remaining dok su dugmad aktivna, zatvaranje pre zavrsenog save-a i naknadni saved. TypeScript, link-review i build prolaze; bez promene sheme.

> **2026-11-16 — Tehnicko poliranje i rad pri kucanju:** uklonjen zaostali globalni scan naziva iz updateNode i LinkHighlights; edit samo validira/rebazira postojece izbore, Save i Mentions zadrzavaju punu detekciju. Prazan highlight nema DOM observer/scanning rad. Cloud snapshot se invalidira samo promenom cuvanih polja i serijalizuje lenjo pri save/proveri, bez ponovnog parse/stringify zahteva. Isti HTML na Blur ne menja updatedAt niti pokrece save. Zatvoren Link dialog ne indeksira projekat; Details bez veza ne grupise sve note; Mentions memo ne ponavlja detekciju pri filteru; zbir Continuous se ne racuna u drugim prikazima. Regression: 30 izmena bez cloud serijalizacije tokom kucanja, jedan snapshot na Save; edit tokom requesta se salje u narednom CAS upisu. Provere linkova, istorije, Continuous, cloud gresaka/konflikta/naloga, TypeScript/build i browser sintetskog projekta sa 200 poglavlja (~120k reci): unos, Undo, Split, istoimeni ciljevi i Mentions. Bez promene sheme, izgleda ili rukopisa; test nije univerzalno obecanje ubrzanja mreze ili celog UI-ja.

> **2026-11-16 — Jedinstvena paleta boja:** svi izbori koriste istih deset predefinisanih boja u dva reda, bez slobodnog RGB biraca. Zajednicka komponenta pokriva note, tekst, marker, Timeline kartice/dogadjaje/grupe i kalendarske mesece. No colour uklanja opcionu boju; obavezna kalendarska polja zadrzavaju hex izbor. Tekst/marker cuvaju selekciju i prolaze kroz editor input/history. Browser proverava izbor i uklanjanje obe boje bez promene teksta; TypeScript, calendar test i produkcijski build prolaze. Bez promene sheme.

> **2026-11-16 — Spelling umesto Copy:** Copy dugme u zavrsnoj grupi zamenjeno SpellCheck/ABC ikonom i on/off komandom. aria-pressed, tooltip i amber stanje prate izbor. Zajednicki editorSpellCheck upravlja spellcheck atributom svih RichEditor instanci, ukljucujuci Split. Default ukljucen; store v22 migracija samo uvodi podrazumevanu UI vrednost, bez izmene rukopisa. Browser potvrdjuje true/false/true na oba editora i nepromenjen HTML; TypeScript i Sites build prolaze.

> **2026-11-16 — Boje rucnih note linkova:** Insert a link koristi boju ciljne note u izboru i pri ubacivanju. RichEditor prikazuje postojece i nove #note/ linkove, ukljucujuci ugnjezdene span-ove, u aktuelnoj boji ciljne note iz bilo kog taba. Display-only CSS je ogranicen na instancu editora; promena ciljne boje ne prepisuje rukopis/history. Bezbedno validirane boje/ID selektori; spoljne veze ostaju netaknute. Browser: stari plavi link/child prikazani tirkizno pa narandzasto posle promene, novi rucni link roze; TypeScript i Sites build prolaze.

> **2026-11-16 — Toolbar indent i premestene akcije:** Copy/Delete/Link su posebna left-aligned grupa na kraju formatne trake, posle Clear formatting i razdelnika. Na ranije mesto dodati Decrease indent i Increase indent. Komande vracaju sacuvanu selekciju aktivnog editora, primenjuju indent/outdent i upisuju promenu kroz postojeci editor input/history. Browser proverava pasus, listu, vracanje nivoa i Undo/Redo; TypeScript i Sites build prolaze. Bez promene sheme.

> **2026-11-16 — Automatic link detection na Save:** disketica i Ctrl+S prvo cuvaju aktivnu notu, zatim nude pregled novih naziva/aliasa iz svih tabova projekta. Kontekst istice pojavljivanje; kandidati prikazuju naslov i punu tab/kategorija putanju. Duplikati ne biraju cilj automatski; Create/all instances zahteva izbor, Accept all further links staje pre dvosmislenog imena. Ignore jedno/sva pojavljivanja se pamti; Decide later/Abandon ostavljaju ostatak za sledeci Save. Potvrdjeni ciljevi ostaju po ID-u; tekst/HTML se ne prepisuju. Nova detekcija se vise ne prihvata tokom kucanja. Postojeci linkChoices format, bez promene sheme. Provere: link-review, note-links, cloud-library roundtrip (cross-tab i ignored), TypeScript/build; browser Save, Ctrl+S, dva istoimena cilja, Create/Ignore one/all, Accept all, odlaganje i drugi tab.

> **2026-11-16 — Uklonjeni oznaceni pomocni tekstovi:** iz Settings uklonjen uvodni opis i tekst o formatima/velicini ispod covera. Cover kolona koristi raspolozivi prostor; prozor je blago prosiren na maksimalnih 960 px da cela naslovnica bude veca bez deformacije ili crop-a. Ostali Settings elementi/podaci nepromenjeni. TypeScript, Sites build i browser odsustvo oba teksta i prikaz prolaze.

> **2026-11-16 — Vracen Settings pre dodatnih metadata sekcija:** po izricitom zahtevu uklonjeni Language & genre, Audience & voice i Plot & reader appeal, kao i njihove UI komponente/stilovi. ProjectSettings je vracen na proverenu verziju pre njihovog uvodjenja (324a2b7): osnovni podaci, cover, Danger Zone i Backups & Export. Kompatibilnost vec sacuvanih opcionih podataka ostaje; rukopisi nisu menjani. TypeScript, project-settings provera, Sites build i browser Save/odsustvo tri sekcije prolaze.

> **2026-11-16 — Settings prema dostavljenoj referenci:** naslovnica sa upload/remove i otvorenim Backups & export akcijama je levo; Book details, Language & genre, Audience & voice, Plot & reader appeal i Danger zone slozeni su desno. Save je u zaglavlju i vezan za form preko form ID-a. Izbori su prikazani kao prelomive oznake unutar istog pretrazivog dropdown-a. Standardizovane sirine, kartice, tipografija i responsive prikaz prate referencu; postojece slike i metadata ostaju sacuvani. Archive/Delete i cover akcije imaju type=button. Browser Save roundtrip i provera tipova dugmadi, TypeScript i Sites build prolaze.

> **2026-11-16 — Vizuelno uredjen Settings:** umesto cetiri rastegnute kartice sada postoje dve nezavisne kolone: Book details/cover i Language & genre levo, Audience & voice i Plot & reader appeal desno. Uklonjeni okviri i prisilno izjednacene visine; sans-serif kontrolna tipografija, ujednacene visine, mirnije oznake i manji naslovni razmaci. Save footer i kompaktni Danger/Backups red odvojeni linijama. Cover upload/remove imaju type=button i ne pokrecu Save. Svi izbori ostaju dostupni i prelamaju se; browser potvrduje cuvanje i odsustvo horizontalnog overflowa. TypeScript i Sites build prolaze; bez promene sheme/podataka.

> **2026-11-16 — Settings u dve poravnate kolone:** uklonjen fit-content sa blokova; sve kartice imaju iste sirine i poravnate redove. Metadata sa celim manjim cover pregledom i Language & genre su prvi red; Audience & voice i Plot & reader appeal drugi. Sva metadata polja su stalno otvorena, bez dodatnih klikova. Samo tekstualna polja i izbori prate sadrzaj; dugi izbori se prelamaju. Na uskom ekranu jedna kolona. TypeScript/build i browser sa popunjenim dugim izborima prolaze; bez promene podataka.

> **2026-11-16 — Okviri prema tekstu:** Settings kartice i dropdown polja koriste fit-content sa ogranicenjem raspolozive sirine. Naslov, autor i series polja koriste field-sizing content; sirina prati unos. Dugi izbori i dalje se prelamaju. Series red se prelama na malim ekranima; Save vise ne prekriva poslednju sekciju. Bez promene podataka. TypeScript/build i browser provera sirine kratkog/dugog naslova i osam izbora prolaze.

> **2026-11-16 — Siri Settings i prelom izbora:** prozor do 1280 px daje vecinu sirine metapodacima; Language & genre, Audience & voice i Plot & reader appeal su odvojeni blokovi. Izbori i pregledi se prelamaju bez ellipsis-a. Cover ima sopstvenu visinu i sliku preko raspolozive sirine, sa manjim kontrolama prema referenci; uklonjen tekst o formatima ispod slike. Bez promene podataka. TypeScript/build i browser Save sa osam dugih izbora prolaze; nema horizontalnog prelivanja.

> **2026-11-16 — Publika, ton i stil knjige:** dodata opciona Target audience, Tone, Writing style, Plot development techniques, Explicit content i What makes this book great polja. Pretrazivi multiselect meniji podrzavaju sopstvene nazive; Settings ima sklopive Language & genre, Audience & voice i Plot & reader appeal grupe sa kratkim pregledom. Naslovnica je manja, Danger Zone sklopljen, Save ostaje dostupan. Store v21; client/import/server validacija i cloud roundtrip cuvaju nova polja bez izmene rukopisa i bez AI funkcija. Provere: project-settings, cloud-library, TypeScript i build; browser Save, custom naziv, Cancel, ponovno otvaranje i reload.

> **2026-11-16 — Metadata dropdown polja:** Settings dobija Language, Genres (do 4), Subgenres (do 12) i Number of chapters kao padajuće menije. Genre/Subgenre imaju pretragu i sopstvene nazive, bez chip dugmadi; opcije podžanra prate žanrove, a raniji izbori i nazivi drugih knjiga istog naloga ostaju dostupni. Broj poglavlja je isključivo metadata i ne pravi/menja note. Save changes čuva nova opciona polja; Cancel ih ne upisuje. Store v20, client/import/server validacija i JSON/cloud roundtrip; stari projekti ostaju nepromenjeni. Provere: project-settings (granice i očuvan rukopis), cloud-library, TypeScript/build; browser multi-select, max 4, custom naziv Enter, Save, ponovno otvaranje i reload kroz test API sa produkcijskom validacijom.

> **2026-11-16 — Kompaktni Edit event prema referenci:** prozor 328 px sa group izborom, live pregledom, ikonom/naslovom, Start/End date popoverima, Style i Link redovima i Update event / Ctrl+Enter. End bira Time Period, Clear end vraća Event; kompletni custom calendar/BCE/sati i validacija ostaju. Ikona i note links čuvaju se tek pri Update, Cancel ne menja notu. Image/Color je opcioni cardStyle (store v19, client/server validacija); Color ne briše sačuvani banner i Image ga vraća. Cards i Calendar uvažavaju stil. QA: otkazivanje, nevalidan pa ispravljen kraj, period/event, sati, povezivanje, Skull ikona, Color/Image i Ctrl+Enter; cloud roundtrip, TypeScript i build prolaze.

> **2026-11-16 — Timeline Cards prema referenci:** kompaktne široke kartice sa banerom preko cele površine, belom group oznakom gore, ikonom/naslovom/datumima dole i vertikalnom osom sa datumima i razmacima/prekla-panjem levo. Desni klik otvara paletu + custom boju, tri nivoa opacity, Edit, Duplicate, Move to group, Detail level (title/dates/synopsis) i Delete event sa potvrdom; uklanjanje datuma čuva notu i sadržaj. Opcioni cardColor/cardOpacity/cardDetail se čuvaju u cloud/JSON i ostaju posle date edit-a; client/server validacija, store v18. Testovi: story-calendar i cloud roundtrip. Browser QA: boja/opacity, detalji, grupa, date edit bez gubitka izgleda, dupliranje, Cancel/Delete uz očuvane note. Build i TypeScript prolaze.

> **2026-11-16 — Dupli marker liste i razmak posle linije:** potvrđena je postojeća struktura cele note unutar neoznačenog spoljnog li. Usko popravljanje praznih list-wrappera radi pri paste-u i otvaranju ranije pogođenog HTML-a; tekst, linkovi, stvarne označene ugnježdene liste i numeracija ostaju. Naslovi/linije direktno ubačeni u ul/ol izdvajaju se u ispravne blokove. Backspace na početku stavke skida jedan nivo liste. Paste se beleži kao jedna popravljena Undo/Redo izmena. Razmak hr→naslov smanjen na približno 12 px pri osnovnih 18 px, uz manje opšte gornje margine naslova. Provere: editor-lists, paste-content, editor-headings, editor-divider, TypeScript/build i browser (stari HTML, stvarni paste, Backspace, Undo/Redo, očuvan tekst/veze i izmereni razmaci). Bez promene šeme.

> **2026-11-16 — H1–H6 i kopirani stilovi:** naslovni nivoi sada pouzdano određuju veličinu, debljinu, font, prored i vertikalne razmake uprkos inline stilovima iz Word/Docs/HTML izvora, uključujući ugnježdene span/font elemente. Običan tekst ostaje netaknut; kurziv i veze ostaju semantički sačuvani. Skala prati osnovnu editor veličinu: 2 / 1.6 / 1.35 / 1.2 / 1.1 / 1 em. Bez promene rukopisa ili šeme. Browser QA potvrđuje svih šest computed veličina, meni, Ctrl+Alt+3, Normal, Undo i trajni HTML upis; editor-headings test, TypeScript i build prolaze.

> **2026-11-16 — Library desni klik i tri tačke:** kolekcije i romani u levom stablu, Grid i List prikazu otvaraju isti postojeći meni desnim klikom ili Shift+F10. Svaki objekat ima sopstveni kontrolisani meni; akcije, potvrde brisanja, drag/drop i navigacija ostaju. Tri tačke su skrivene do hover/fokusa i ostaju dostupne dok je meni otvoren; NoteTree dobija keyboard focus pristup. Bez promene podataka/šeme. TypeScript/build i lokalni browser QA: sva četiri mesta, iste opcije, Open project akcija i početna opacity 0.

> **2026-11-15 — Širina Timeline okvira:** period se prostire tačno od početka do kraja (bez minimalne procentualne širine); okvir događaja bez kraja prati naslov umesto fiksnih 176 px. Ručica kraja je unutar vremenske trake. Bez promene datuma ili šeme.

> **2026-11-15 — Event i Time Period:** datirana nota ima opcioni eksplicitni temporalni tip; Event je trenutak, Time Period zahteva kraj posle početka. Starije datume ne prepisujemo: pravi postojeći rasponi prikazuju se kao periodi. Grafikon dobija kompaktne klikabilne naslove/markere i trake trajanja, bez velikih synopsis kartica. Kalendar raspoređuje periode kao kontinuirane nedeljne trake kroz kolone dana; Event ostaje na danu događaja. Cards čuva banere i prikazuje tip/trajanje. Store v17; validacija import/cloud i čuvanje nota/veza ostaju.

> **2026-11-15 — Scope prikaza bez upisa projekta:** automatsko uklapanje Timeline-a na izabranu granu/event računa se u prikazu i ne menja datume ili updatedAt projekta pri mount-u/izboru. Samo namerno pomeranje/zoom grafika čuva viewport. Otkriveni konkurentni cloud save ostaje zaštićen CAS-om; noviji tuđi prozor se ne prepisuje.

> **2026-11-15 — Timeline kao tab sa sopstvenim stablom:** nova timeline sekcija koristi isti NoteTree i sve funkcije nota (ugnježđivanje, preimenovanje, pomeranje, desni klik, tastatura). Moguće je više glavnih Timeline nota; izbor grane ili eventa ograničava sve hronološke prikaze na taj podskup. Set/Edit dates vezuje istu notu za grafikon bez dupliranja teksta; View as Timeline u meniju omogućava to i ostalim tabovima. Story Timeline demo grana premešta se iz Planning uz iste ID-eve/veze. Store v16, kompatibilan import/cloud save i novi tab u URL navigaciji; demo template/kloniranje uključuju timeline sekciju.

> **2026-11-15 — Ispravka originalnog demo projekta i reprezentativnih datuma:** vlasnik koristi svoj originalni Morrigan’s Ocean kao demo izvor, bez dodatne vlasničke kopije. U original se dodaje Planning/Story Timeline sa 21 zasebnom event notom, vezama ka poglavljima i Codex-u, izmišljenim gregorijanskim datumima 14–15.10.2026, različitim trajanjima, tri čina i banerima. Uvažene su vremenske naznake 3h47, 03:11 i koridor 03–05h; glavni rukopis/Codex i originalni Trash ostaju nepromenjeni. Ranija Step kopija se arhivira, ne briše. Nalozi sa starim demoom dobijaju ispravljeni sadržaj, a prethodna kopija sa svim izmenama ostaje u Archived. Edition 2 je jednokratan; ponovno objavljivanje ne duplira Timeline i poštuje izmene eventa. Store v15 dodaje opcioni demo source/edition identitet.

> **2026-11-15 — Morrigan’s Ocean kao demo za naloge:** vlasnički Admin objavljuje isključivo izabrani originalni projekat u privatni R2 demo template; svaka prijava dobija zasebnu, uređivu kopiju sa novim project/note ID-evima i remapiranim vezama, tabovima i kopiranim prilozima. Ostali romani, profil i Trash nisu deo template-a. Original se ne menja. Kopija dobija sve numerisane chaptere kao Timeline događaje grupisane po činu, Step hronologiju jasno označenu kao nekanonsku, naslovnicu kao baner prvog događaja svakog čina i Planning vodič. D1 demo_catalog/account_demos (0004) obezbeđuju jednokratnu instalaciju, CAS čuva konkurentne izmene, a obrisani/izmenjeni demo se ne obnavlja/prepisuje. Store v14 dodaje samo opciono poreklo demo projekta. Server proverava vlasnički admin, sesiju i origin; rukopis nije u GitHubu ili instalacionim assetima.

> **2026-11-15 — Baneri Timeline događaja:** Add/Edit event dobija Upload/Change/Remove banner i pregled slike. Kartice koriste sliku kao cover pozadinu sa tamnim slojem radi čitljivosti; bez banera zadržavaju postojeći izgled. Reused bounded raster processing (JPG/PNG/WebP, 10 MB ulaz, 700k data URL) i cloud snapshot/JSON backup. Opcioni event.banner, store v13 bez prepisivanja starih događaja; server proverava format i veličinu.

> **2026-11-15 — Stalni identitet levog panela:** priloženi originalni logo i naziv Kachamak zamenjuju naziv/ikonicu sekcije u zaglavlju stabla na svim tabovima, uključujući scoped note tabove i Trash. Stablo zadržava svoj opis sekcije za pristupačnost. Uklonjeno je označeno objašnjenje iz Mentions. Bez promene podataka ili šeme.

> **2026-11-15 — Mentions po tabovima:** dolazni rezultati grupisani su po izvornom tabu (Binder, Codex, Planning, Research, Templates, Prompts), u redosledu tabova, sa statičnim naslovima samo za neprazne grupe. Filtriranje, boje i pregled ostaju. Bez izmene podataka ili šeme.

> **2026-11-15 — Mentions izabrane note u celom projektu:** prikaz sadrži samo dolazna pominjanja/referenciranja izabrane note po naslovu, aliasima i sačuvanim vezama. Uklonjen je odlazni Mentioned here i ograničavanje na Manuscript. Isto pravilo važi za svaki note u svim sekcijama, uključujući Synopsis/Notes; eksplicitne odluke/link identitet ostaju, a kontekst dolazi iz stvarnog polja pominjanja. Nema promene rukopisa ili šeme.

> **2026-11-15 — Kompaktne veze u Details:** uklonjeni okviri i rastezanje redova povezanih nota; dugme × stoji odmah iza naziva sa jednim običnim razmakom. Statične grupe, boje, pregled i uklanjanje veza ostaju. Mentions prikaz i podaci nisu menjani.

> **2026-11-15 — Grupe povezanih nota:** Details grupiše postojeće linkove po neposrednoj roditeljskoj noti (Characters, Locations…) kao statičnom naslovu. Naslov postoji samo kada povezana nota ima roditelja; samostalne note nemaju naslov grupe; nedostupne veze ostaju vidljive i uklonjive. Naslovi i pripadnost prate preimenovanje/premeštanje bez menjanja link ID-eva. Sve ostaje notes, bez nove šeme/tipa ili promene rukopisa.

> **2026-11-15 — Pojednostavljen Details i zaglavlje stabla:** uklonjeni Type/Words iz donjeg okvira, putanja ispod povezane note u Details i Section actions dugme iz zaglavlja stabla. Created/Updated ostaju na dnu, boje/pregledi veza ostaju; vraćanje skrivenih nota je dostupno kroz postojeći desni klik na praznom delu stabla. Nema izmene podataka ili šeme.

> **2026-11-15 — Boja povezanih nota i putanje:** Details/Mentions kartice koriste istu boju note i isti podrazumevani link ton kao rukopis. Putanje koriste nazive tabova iz TABS (Codex, Binder…), uz očuvana imena roditeljskih nota. Nema promene podataka ili šeme.

> **2026-11-15 — Details Save/Sort i + Codex:** Save aliases preimenovan u Save, uz Sort koji sortira nacrt aliasa A–Z pre Save. + Codex otvara popover sa pretragom i grupama iz postojeće Codex hijerarhije, ikonama/bojama nota i povezivanjem postojećeg ID-a bez navigacije ili kopiranja teksta. Sopstvena nota i postojeće veze izostavljene su iz kandidata. Sačuvane veze imaju pregled i uklanjanje ispod dugmeta; sve ranije veze ostaju. Metadata okvir je uz dno Details panela, dok gornji deo nezavisno skroluje. Nema promene šeme.

> **2026-11-15 — Details po označenim komentarima:** uklonjeni Linked notes naslov i prazan opis, ceo Link a note pretraživač, objašnjenje ispod Aliases i red Sub-notes. Postojeće veze/pregledi, alias polje i Save aliases, Type/Words/Created/Updated, toolbar linkovanje i Mentions ostaju. Podaci i šema ne menjaju se.

> **2026-11-15 — Nula lenjira:** leva ivica produžena 12 CSS px pre nule. Nula je centrirana nad svojim podeokom kao svi ostali brojevi; polazište skale ostaje na ivici teksta, desna ivica i oko se ne pomeraju.

> **2026-11-15 — Lenjir:** brojevi i podeoci dele isti početak na levoj ivici tekstualnog stupca, sa CSS centimetarskom skalom i mm/pola-cm podeocima. Uklonjene su lažne margine/pasivni trouglovi koji nisu odgovarali tekstu; brojevi imaju sopstveni red, a oko je izvan skale. ResizeObserver prilagođava broj oznaka širini, bez sečenja poslednje cifre; scrollbar-gutter poravnava lenjir i tekst u Write, Continious i Split. Tema i centralni zoom ostaju postojeći; nema promene rukopisa/šeme.

> **2026-11-15 — Aktivni identitet i zaštita promene naloga:** stvarni Chrome /api/account potvrdio je da je prozor otvoren iz drugog Gmail sandučeta i dalje bio prijavljen kao Morana ChatGPT nalog, pa prikaz Admina nije bio dokaz prijave drugog naloga. Prava Incognito prijava drugim nalogom bila je odbijena na Sites allowlist-u; postojeća licenca dobila je viewer ulaz uz očuvan custom audience i postojeće korisnike. Account meni i Account dijalog sada jasno prikazuju autentifikovani ChatGPT email. Biblioteka šalje očekivani account ID, server odbija čitanje/čuvanje iz zastarele sesije i stare neobeležene upise pre R2/DB izmene. Provera identiteta pri focus/refresh skriva staru biblioteku; nesnimljen rad ne prepisuje se u novi nalog. Nema izmene rukopisa ili store šeme. Regresije potvrđuju član bez admina, dve privatne biblioteke, isti project ID sa odvojenim prilozima i promenu naloga bez cross-account upisa.

> **2026-11-15 — Gmail pristupni linkovi (u povezivanju):** Admin ima jednokratni Connect Gmail i Send link uz aktivne licence. Server proverava odobrenu sender adresu, OAuth state/PKCE, admin identitet i CSRF. Refresh token je AES-GCM šifrovan izvan rukopisa; slanje ima D1 evidenciju i zaštitu od duplog klika i neizvesnog ponavljanja. Zaseban Google projekat, Gmail API i odobreni test nalog su pripremljeni; Google consent i stvarno slanje proveravaju se nakon objave. Store/manuscript šema se ne menja; dodata server-only D1 migracija 0003. Provere: gmail-access, account-auth, TypeScript.

> **2026-11-15 — Pozvani Sites korisnici i pristupni mejl:** Accounts and access sada uključuje i postojeće Sites pozivnice iz privatnog runtime rosterskog podešavanja, bez izmišljanja licenci ili korisničkih projekata. account_access čuva status po emailu; Suspend/Restore radi pre i posle prve prijave i blokira account/library API, a ponovni import ne resetuje zabranu. Dodat je idempotentan D1 schema update / 0002 migration. Aktivne licence imaju Send access link: admin-only POST, CSRF provera, provera licence i suspenzije, Resend server-side ključ, #library link bez tokena i audit provider ID. Nedostajući RESEND_API_KEY/KATCHAMAK_MAIL_FROM vraća setup grešku, bez lažnog uspeha. Resend potvrda znači prihvaćeno za slanje, ne potvrđenu isporuku. ADMIN-ACCESS.md opisuje podešavanje i granicu: Sites roster je snapshot koji se osvežava pri održavanju, platform sharing ostaje zaseban ulazni uslov. Provere: account-auth proširen pozivnicama, pre-login banom/restore, očuvanjem bana pri importu, email autorizacijom, nedostajućom konfiguracijom, idempotency zaglavljem i simuliranim provider success/failure; cloud-library, TypeScript/build i lokalni browser QA. Nijedan pravi mejl nije poslat i nijedan produkcijski nalog nije suspendovan.

> **2026-11-15 — Zaključan Continious i upravljanje svim licencama:** Continious je sada samo saniran HTML pregled bez contentEditable, naslovnih inputa, formatne trake ili Create akcije. Prikazuje označenu notu i sve njene podnote; klik na gornji tab briše samo izbor za čitanje i prikazuje ceo tab, uz očuvanje Split panela. Scope ne izlazi iz folder-taba; brojač prati pročitano podstablo. Veze otvaraju postojeći NotePreview. Admin ima poseban All assigned licenses pregled preko admin-only GET /api/admin/licenses, sa pretragom, Show all, paginacijom, planom i Active/Expired/Revoked statusom, uključujući licence pre prve prijave. Change popunjava formular i datum isteka; Revoke traži potvrdu, upisuje none i osvežava listu/audit, bez brisanja projekata. Provere: continuous-write (zaključan HTML, izbor podstabla/tab-all i neizmenjen rukopis), account-auth (zabrana članu, sve licence i revoked red), note-workflow, TypeScript i produkcijski build. Browser QA na lokalnim testnim podacima: 4/6/1 nota za izabrano podstablo/tab/leaf, nula editable polja, Cancel/Revoke i Change/ponovno dodeljivanje licence.

> **2026-11-15 — Admin licence i vidljiva potvrda:** lista Admin / Users sada uključuje i dodeljene licence za adrese bez prve prijave (pending / Awaiting first sign-in), bez dupliranja kada se korisnik registruje. Upis vraća potvrđene email/plan/expiry podatke i informaciju o registraciji. Formular prikazuje trajan success/error rezultat uz dugme, Saving stanje i fokusira pretragu na sačuvanu adresu; neuspešan refresh ne prikriva uspešan upis. Suspend/Restore je onemogućen za neregistrovanu adresu. Ovlašćenja admina, CSRF i owner zaštita ostaju. Nema promene šeme ni ručnog dodavanja produkcijskih licenci. Provere: proširen account-auth (preassigned vidljivost, normalizacija i prvi login bez duplikata), TypeScript, build i browser QA nad pravim lokalnim account API/SQLite: upis nove test-adrese, potvrda, pending red, reload i simuliran 503 sa porukom.

> **2026-11-15 — Metadata right align:** Label, Status i boja u donjoj traci desnog panela poravnati su uz desnu ivicu. Širine po tekstu i postojeće akcije ostaju. Provere: TypeScript, produkcijski build i browser prikaz.

> **2026-11-15 — Ispravka režima po Nikoli:** Write je vraćen na jednu označenu notu. Zaseban Continious (interno continuous) je dodat pre Split: Write / Grid / List / Continious / Split; ponovni klik na njega vraća Write. Gornji Everything / Folders / Top level meni je uklonjen, a stari scope se resetuje na all da nema nevidljivih filtera. Continious prikazuje ceo aktivni tab/folder-tab bez starog scope filtera; njegov brojač računa prikazani tekst, Write ima prethodni brojač note. Store v12 dodaje režim i bez menjanja sadržaja resetuje stari filter; cloud/URL restore prihvata continuous. Provere: TypeScript, continuous-write i time-system regresije, produkcijski build; browser QA: jedna nota u Write, šest nota u Continious, Save/reload režima, drugi klik vraća jednu notu, meni odsutan.

> **2026-11-15 — Continuous Write:** Write sada prikazuje ceo aktivni tab u jednom skrolu, u dubinskom redosledu levog stabla, sa naslovima i zasebnim postojećim RichEditor-om za svaku notu. Everything uključuje i sadržaj zatvorenih grana; hidden grane ostaju skrivene. Folders only / Top level only filtriraju i sredinu; folder-tab ostaje unutar svog podstabla. Klik/strelice u stablu skroluju do note bez zamene rukopisa; fokus u tekstu bira notu za Inspector bez skoka do naslova. Tekst, formatiranje, linkovi i Undo/Redo ostaju odvojeni po noti, Split radi kao ranije. Donji brojač u Write prikazuje reči sadržaja trenutno prikazanog rukopisa. Nema promene šeme. Provere: continuous-write DOM test (redosled, scope, hidden/collapsed, fokus/skrol i upis samo u pravu notu), rich-editor, editor-history, note-workflow, note-tree-keyboard, TypeScript i build; browser QA sa dugom notom, skokom na kasniji deo, odvojenim unosom/Undo, Save/reload, filterom i odvojenim Codex sadržajem.

> **2026-11-15 — Timeline / Time System prema referencama:** početni pregled hronologije je vertikalni niz datiranih kartica sa Add Event na kraju; događaj ostaje obična nova ili postojeća nota sa Open note. Osa, Calendar i Outline ostaju u donjem dock-u hronologije. Time System Editor ima levi meni Overview, Months, Week, Days, Years / Eras, Moons, Settings, desni pregled kalendara i odvojene Save/Cancel nacrte. Meseci/nedelja imaju promenu redosleda strelicama ili drag/drop, prestupna pravila ostaju uz Months, podržani su reset nedelje po mesecu, više imenovanih era i godina nula, opcione granice novih datuma, više mesečevih ciklusa (minute/offset/boja), format datuma sa kodovima/literalima i 12h/24h vreme. Moon ciklusi se prikazuju u kalendaru i pregledu. Store v11 dodaje samo opcione podatke; migracija ne menja rukopis, događaje niti apsolutne vremenske pozicije. Provere: novi time-system test, story-calendar, note-workflow, cloud-library, rehydration, project-settings, TypeScript i produkcijski build. Browser QA na sintetičkom projektu: sedam odeljaka, live preview, reorder/prestupni mesec, Cancel, Save/reload era/mesec/moon/format, događaj vezan za postojeću notu i neizmenjen tekst pri Open note.

> **2026-11-15 — Prikazi kao prekidači:** prvi klik na Split/Grid/List otvara prikaz, ponovni klik na aktivni prikaz vraća Write. Timeline u gornjoj traci koristi isto pravilo; Write ostaje Write. Izbor note i Split pane identiteti se ne menjaju. Provere: TypeScript, produkcijski build i browser QA za sva četiri prelaza i povratka.

> **2026-11-15 — Timeline u gornjoj traci:** Timeline je samostalna gornja navigaciona kartica pre +, uz postojeće sekcije; označava se kao aktivna umesto sekcije iz koje je otvorena. Zadržava postojeći kontekst sekcije/foldera i sve datume, kalendare i opcije. Klik na sekciju vraća prethodni note prikaz tokom sesije. Donji redosled je Write / Grid / List / Split, bez Timeline dugmeta. URL/cloud kompatibilnost ostaje preko postojećeg timeline view ključa, bez promene šeme. Provere: TypeScript, story-calendar, note-workflow, produkcijski build i browser QA Timeline/povratak/List/Split/reload.

> **2026-11-15 — Ikonice u List prikazu:** svaki red koristi sačuvanu ikonu i boju note, istim iconByName resolverom kao ostali prikazi; bez izabrane ikone koristi Note, bez boje muted temu. Podnote više ne menjaju izabranu ikonu u generički folder. Provere: TypeScript, produkcijski build i vizuelni browser QA sa tirkiznom lokacijom i ljubičastim likom.

> **2026-11-15 — Širine List kolona:** tabela i kolone automatski prate najduži tekst u svakoj koloni, bez razvlačenja preko panela i prelamanja naziva/labela/statusa. Kada tabela premaši panel, dostupan je horizontalni skrol. Provere: TypeScript, produkcijski build i vizuelna browser provera.

> **2026-11-15 — List prati izbor:** List prikazuje samo označenu notu i sve njene podnote, unutar aktivne sekcije/taba foldera; bez izbora prikazuje postojeći scope. Kolona Synopsis zamenjena je kolonom Label koja čita stvarnu labelu note (ili —), dok sinopsis ostaje u Info panelu. Provere: TypeScript, produkcijski build i browser QA na sintetičkom stablu sa drugim aktom, ugnježđenom notom i pojedinačnom notom; labele Revision/Final i odsustvo drugih aktova potvrđeni.

> **2026-11-15 — Grid boje i suvišan naslov:** uklonjen Grid · naziv izabrane note iznad kartica. Grid sada koristi boje background/card/foreground/muted/border aktivne teme umesto braon pozadine i krem kartica; boja note je vidljiva na ikoni i gornjoj ivici kartice, uključujući podrazumevanu ikonu. Selekcija, veličine, sinopsisi i drag/drop nisu menjani. Provere: TypeScript, produkcijski build i browser prikaz na sintetičkom projektu.

> **2026-11-15 — Zaštita tabova:** X dugmad su uklonjena iz gornje trake. Desni klik na dodatni tab nudi Delete i obaveznu potvrdu sa Cancel/Delete. Potvrda izričito kaže da se uklanja samo kartica, dok sve note i folderi ostaju u projektu; postojeće sekcije se vraćaju preko +/Show, a tabovi nota kroz Open as tab. Binder, Codex i Trash ostaju stalni. Potvrda je vezana za projekat da ne zatvori tab posle promene projekta. Provere: TypeScript, postojeći testovi očuvanja sadržaja tabova, produkcijski build i browser QA potvrde/otkazivanja/vraćanja.

> **2026-11-15 — 0.3.4, podešavanja romana prema referenci:** zupčanik u Workspace-u otvara široki dvokolonski Settings: Metadata (naslov, autor/pseudonim, postojeća/nova serija i indeks), Cover (JPG/PNG/WebP upload ili drag/drop, pregled i uklanjanje) i Danger Zone (Archive/Unarchive, Delete sa unosom tačnog naslova i backup opcijom). Save changes čuva naslov/autor/seriju i optimizovanu raster-koricu u privatnom cloud snimku; korica je ograničena na 700k znakova, bez udaljenih URL-ova i uključena u JSON backup. Postojeći bg/icon omoti ostaju ako nema slike. Dashboard prikazuje sliku i seriju i nudi Archived pregled sa vraćanjem. Arhiva ne menja note ni članstvo u kolekcijama. Brisanje čuva pre mutacije, uklanja članstva i vraća projekat/članstva pri neuspešnom cloud upisu. Stari import/export i manuscript compile ostaju u Backups & Export. Store v10 dodaje opcione metapodatke, bez prepisivanja starih projekata; cloud validator proverava nove vrednosti. Provere: project-settings, cloud roundtrip/izolacija/otkazivanje brisanja, migracije i regresije; browser QA na sintetičkom projektu: Save/reload, serija, upload korice, Dashboard prikaz, arhiva/restore, blokada Delete i postojeći izvoz.

> **2026-11-15 — Kraći natpisi:** dugmad na dnu levog panela sada glase Expand i Collapse. Akcije i ostali meniji ostaju isti.

> **Undo/Redo i automatska linija — aktuelno:** Undo/Redo dugmad u traci, Ctrl+Z, Ctrl+Y i Ctrl+Shift+Z rade nad aktivnim editorom. Istorija je odvojena po otvorenom editoru, u memoriji, do 100 snimaka; grupiše uzastopno kucanje i čuva HTML/poziciju selekcije. Reload, zatvaranje editora ili spoljna zamena teksta počinju novu istoriju, bez vraćanja zastarelih cloud snimaka. Browserov globalni Undo nije korišćen jer je QA pokazao da može menjati drugi Split panel. Samostalni red --- pretvara se u hr odmah pri trećoj otkucanoj crtici, bez Entera/razmaka; dodaje prazan pasus za nastavak. Paste, Undo/Redo, proza, code/pre, naslovi i liste ne pokreću automatsku konverziju. Undo vraća crtice bez ponovne konverzije. Nema nove šeme ni browser skladišta. Provere: editor-history, editor-divider, editor-headings, postojeći editor/paste/link testovi, TypeScript i produkcijski build; browser QA dva Split panela, prečica/dugmadi, trenutno nastajanje linije i Save/reload na sintetičkoj biblioteci.

> **2026-11-15 — H1–H6:** definisana semantička vizuelna hijerarhija u zajedničkom editoru (2 / 1.6 / 1.35 / 1.2 / 1.1 / 1 em), težina, prored i razmaci; prvi naslov nema dodatni gornji razmak. Padajući meni čuva selekciju dok toolbar dobije fokus, pouzdano primenjuje h1–h6/p na odgovarajući editor i odmah pokreće postojeći Save tok. Nivo se čita iz DOM položaja kursora, bez queryCommandValue zavisnosti. Ctrl+Alt+1–6 postavlja nivo, Ctrl+Alt+0 običan pasus. Nema prepisivanja rukopisa ili izmene šeme. Provere: editor-headings, rich-editor, TypeScript, produkcijski build; browser QA svih šest nivoa, veličina, Enter u običan pasus i Save/reload na sintetičkoj noti. Referenca za semantiku: https://obsidian.md/help/syntax (veličine su Katchamak skala, ne tvrdnja o identičnoj Obsidian temi).

> **2026-11-14 — Desni klik u praznom prostoru stabla:** kontekstni meni na praznom delu levog panela nudi Create top-level note, Expand all i Collapse all. Kreiranje ignoriše prethodno izabranu podnotu i dodaje na osnovni nivo aktivne sekcije; u tabu foldera kreira unutar tog foldera. Na samoj noti ostaje njen postojeći meni, a tekstualno preimenovanje zadržava browser meni. Otvaranje menija ne menja sadržaj niti briše izbor. Provere: TypeScript, regresija stabla, produkcijski build i browser QA na sintetičkim podacima.

> **2026-11-14 — Move to top level:** direktna opcija u zajedničkom meniju note (tri tačkice i desni klik) premešta notu sa celim podstablom na osnovni nivo iste sekcije. Na već osnovnom nivou je onemogućena. Identitet, tekst, metapodaci i veze ostaju isti; premestena nota ostaje selektovana. Iz folder taba prelazi na sekciju da se nova lokacija vidi. Provere: TypeScript, postojeća tree regresija, produkcijski build i browser QA sa Locations unutar Codex note.

> **2026-11-14 — Desni klik na notu:** otvara potpuno isti postojeći meni kao tri tačkice, bez dupliranja opcija ili akcija. Kliknuta nota se označava; Shift+F10/Context Menu taster otvaraju isti meni iz fokusiranog reda. Preimenovanje zadržava standardni tekstualni kontekstni meni. Provere: TypeScript, tastaturna regresija, produkcijski build i browser provera identičnih opcija/akcije Rename na sintetičkom projektu.

> **2026-11-14 — Navigacija stabla tastaturom:** klik na notu zadržava fokus na njenom redu. Gore/dole biraju prethodnu/sledeću vidljivu notu, prate otvorena podstabla i scope; skrivene i zatvorene podnote se preskaču. Levo/desno zatvara/otvara podnote i prelazi na roditelja/prvo dete; Home/End bira početak/kraj. Izbor se skroluje u vidljivo polje i koristi postojeći select (drugi Split panel ostaje isti). Inputi, meniji i modifikovane strelice ostaju neizmenjeni. Regresioni DOM test pokriva Chapter 10, fokus, granice, skriveno/zatvoreno, preimenovanje, scope, tab foldera i Split. Postojeći test redosleda usklađen je sa preimenovanjem starog Timeline prikaza u Outline iz prethodnog upstream commita.

> **2026-11-14 — Raspored radnih tabova:** Trash je izdvojen uz desnu ivicu srednjeg dela gornje trake i ostaje vidljiv nezavisno od horizontalnog skrolovanja. Binder/Codex i dodatne kartice sa dugmetom plus nalaze se levo od njega. Sačuvan je paralelni rad na kalendarima i Timeline-u sa GitHub main.

> **2026-11-14 — 0.3.2, Timeline i kalendar:** vremenska osa sa trajanjem/preklapanjem, mesečni Calendar i Chronicle prikazuju iste datirane note jedne knjige. Dosadašnji redosled kartica sačuvan kao Outline. Calendar settings uređuje mesece, nedelju, sate/minute, nazive era i prestupne cikluse; promena kalendara čuva apsolutnu poziciju događaja. Grupe sa bojama/filterima, zum, Go to date, Fit events, pomeranje događaja i kraja prevlačenjem. Događaj može da koristi postojeću notu i otvara njen tekst; uklanjanje datuma ili grupe ne briše sadržaj. Store v9 čuva staru strukturu bez izmišljanja datuma. Provere: story-calendar, cloud roundtrip, migracija/Trash, postojeće note/link regresije, TypeScript i browser QA sa sintetičkim podacima.

> **2026-11-14 — 0.3.1, Codex uz rukopis:** Link/Ctrl+K preuzima označeno ime, nudi postojeće note i Create and link za novu praznu običnu Codex notu, na osnovnom nivou ili unutar izabrane Codex note. Kreiranje ne napušta rukopis i čuva eksplicitnu vezu u Details. Umetanje linka čuva postojeće formatiranje, prazne pasuse i označene završne razmake (Chromium insertHTML regresija). Klik na internu vezu otvara pregled, Ctrl+click otvara notu; Open beside prikazuje cilj u drugom Split panelu. Plava strelica vraća prethodnu notu, tab foldera i oba panela/režim. Kratak trag navigacije živi samo u tekućoj sesiji, ne u cloud sadržaju niti browser skladištu. Mentions dodaje All notes/Manuscript i pretragu referenci. Nema novih tipova entiteta, AI-ja ni izmene šeme; store ostaje v8. Provere: note-workflow, React note-link-dialog, postojeće editor/link/cloud regresije, TypeScript i produkcijski build; browser QA samo na sintetičkom projektu.

> **Integrisana celina 0.3.0:** objedinjeni rad na aliasima, stabilnim inline vezama i povratnim referencama sa paralelnim GitHub izmenama: per-occurrence Codex linkovi sa izborom cilja/preskakanjem, tabovi foldera i Timeline. Timeline poštuje aktivnu sekciju i folder; otvaranje reference zadržava Write/Split režim. Izvoz nudi izbor Binder nota i odvojeno čitljivu kopiju svih sekcija. Postojeća istorija i sadržaj projekata ostaju sačuvani.

> **14.11.2026 — Važeći proizvodni smer:** postojeći Katchamak razvijati kao autorski studio bez ugrađenog AI-ja: slobodne note, rukopis i Codex, stabilne veze i povratne reference, jednostavna navigacija i izvoz. Korisnik je odobrio samostalno sređivanje na osnovu ranijih ideja, uz očuvanje podataka i postojećeg dizajna. PRODUCT_DIRECTION.md beleži pregledane izvore i granice aktuelne nadogradnje. Verzija 0.3.0, store v8 (opcioni aliasi); cloud ostaje dok korisnik ponovo ne odobri lokalnu fazu.

> **Važeća odluka 13.11.2026:** razvojna aplikacija koristi isključivo Sites cloud storage po ChatGPT nalogu. Preview i browser dele biblioteku. Ne vraćati root pickere, lokalni Save ili installer dok korisnik ponovo ne zatraži lokalnu fazu. D1 indeks + R2 privatni sadržaj, optimistička revizija za zaštitu od konflikata. Postojeći lokalni fajlovi ostaju netaknuti. Istorijske lokalne upute ispod nisu trenutni zahtev.

# PROJEKT-KONTEKST — Kachamak (pročitaj ovo prvo!)

> **Aktuelni razvoj: Windows desktop, `C:\Katchamak`.** Koristiti postojeći GitHub main i [DESKTOP.md](DESKTOP.md). Korisnik je 11.11.2026. odobrio lokalni razvoj, Tauri, offline rad i automatski commit/push tek posle provera. Istorijske Sites/GLM instrukcije ispod ne određuju novi razvojni tok. Rukopisi ostaju u odvojenom lokalnom profilu, izvan Git backupa.

> **Ovaj fajl je uputstvo za novu sesiju.** Ako je korisnik (Nikola) poslao ovde,
> znači da nastavlja rad na projektu iz prethodnih sesija. Sve što treba da
> znaš je u ovom fajlu + u `KACHAMAK-ARHITEKTURA.md` (u korenu projekta).
> **Obavezan redosled čitanja:** `AGENTS.md` (pravila) → ovaj fajl →
> `PROJECT_STATUS.md` (aktuelni status) → `KACHAMAK-ARHITEKTURA.md` (spec).
> Ne menjaj ništa bez da pitaš. Radi tačno ono što Nikola kaže, redom.

---

## 0. RESTORE U NOVOJ SESIJI — uradi ovo prvo ako ti projekat fascikla ne sadrži kod

Svaka sesija ima svoju kopiju okruženja — kod NE dolazi automatski. Backup
uvek postoji na dva mesta:

1. **Cloud link (probaj prvo)** — aplikacija je javno dostupna i backup je
   njen statički fajl:
   ```
   https://preview-dev-4f587c10a7748191b994b7e55b02828c.space-z.ai/kachamak-aplikacija.zip
   ```
   ```bash
   cd /home/z/my-project
   curl -o backup.zip "https://preview-dev-4f587c10a7748191b994b7e55b02828c.space-z.ai/kachamak-aplikacija.zip"
   unzip -o backup.zip -d .        # kod + oba dokumenta (PROJEKT-KONTEKST.md, KACHAMAK-ARHITEKTURA.md)
   bun install && bun run build    # node_modules/.next nisu u zipu
   ```
   Dokumenti direktno: `.../PROJEKT-KONTEKST.md` i `.../KACHAMAK-ARHITEKTURA.md`
   (isti prefiks URL-a). Ako curl radi — nastavi iz tačke 3 dole.
   Napomena: ovaj URL je zabeležen iz konfiguracije; ako ne radi, otvori
   **preview link aplikacije koji platforma prikazuje Nikoli** (njegov UI zna
   tačan URL) i dodaj `/kachamak-aplikacija.zip` — fajlovi su verifikovano
   servisirani od strane aplikacije (localhost 200 proveren).
2. **Nikola otpremi zip** (ako link ne radi): `download/kachamak-aplikacija.zip`
   je uvek najnoviji; Nikola ga skine iz prethodne sesije i otpremi ovde;
   `unzip -o` u koren projekta.

Posle restora: pročitaj ostatak ovog fajla (§3 status, §4 šta je sledeće,
§5 otvorena pitanja) i **nastavi od tačke koja je prva nerealizovana**.

---

## 1. Šta je ovo projekat

**Kachamak** — privatna pisalačka radionica u Next.js-u za roman
**„Morana: Bloodline"**. Nikola ga originalno pravi na ChatGPT Sites, a ovde
ga replikiramo piksel-po-piksel po njegovim screenshotovima i arhitekturi.

- Next.js 16 (App Router) + React + TypeScript + Tailwind + shadcn/ui + Zustand
- Podaci se čuvaju u **localStorage** (persist + migrate, store verzija **4**)
- Aplikacija je **app-shell**: `html,body{height:100%;overflow:hidden}` —
  stranica nikad ne skroluje, skroluju samo unutrašnji kontejneri

## 2. Kako Nikola radi — VRLO VAŽNO

- **„Ajmo redom"** — tačka po tačka, strogo po redu, bez preskakanja.
- **ZABRANJENE su neistražene izmene.** Ništa „usput", ništa „pošto već tu sam".
- Sve po njegovim rečima i screenshotovima **doslovno**. Njegova izjava:
  > „Ako ti ja budem davao slike i precizne instrukcije a ti budeš pravio ono
  > što ti želiš onda ova saradnja nema smisla... mislim da sam kristalno jasan"
- Posle svake tačke: build + screenshot provera + **prijava na srpskom** + čekaj potvrdu.
- Komunikacija **isključivo na srpskom**.

## 3. STATUS — šta je ZAVRŠENO (provereno u kodu, store v4, build 08.11. 23:41)

Svih **5 zahteva** iz prethodne sesije je implementirano:

1. ✅ **Donja traka radne površine** (`NotesSection.tsx` red 379–385):
   full-width traka ispod centralnog dela — **Target ikonica skroz levo**,
   **word count u sredini** (`novelWords(novel)` format „71,257 words").
2. ✅ **Everything is a Note** — svaki tab je isti note sistem, Codex uključen
   (store migrate v3→v4: stari Codex categories/entries → obične notes;
   `types.ts`: „every tab is the same note system").
3. ✅ **Slobodna hijerarhija** — novi notes su uvek `kind:"doc"`, korisnik sam
   bira ime/ikonu/boju (stari act/chapter/scene/folder su samo za legacy podatke).
4. ✅ **Klik na ikonu nota → icon picker popup** (`NoteTree.tsx`: Popover na
   ikonu, `pickerOpen`; radi i preko menija „Change icon" sa 100ms delay-em
   da se ne bi zatvorio uz dropdown cleanup).
5. ✅ **Tri-dot meni** na kraju reda (vidljiv na hover / dok je meni otvoren),
   tačna struktura iz dokumenta: `Create note` | Rename, Duplicate, Export,
   Move, Delete (crveno) | Sort sub-pages | Hide/Show | Collapse, Expand |
   Change icon + **Move dijalog** (izbor bilo kog section root-a ili note-a kao
   novi parent; selekcija pušta toast „Moved … to …").

Dodatno već postoje:

- **Trash tab** sa restore-om (`TrashView.tsx`, `TrashItem` sa parentId/section,
  `deleteNode` → Trash, restore vraća na mesto; Delete taster na tastaturi radi).
- **Top bar (jedna traka, h-10)**: Home+Search levo (zona levog panela), tabovi
  Binder/Codex/Planning/Research/Templates/Prompts/Trash u sredini, svi u
  jednom redu (zlatna aktivna: `border-[#ad7e2e]/80 bg-[#3a2c18]
  text-[#fbe4a6]`), Tree Scope dropdown (All/Folders only/Top level only) +
  Save (toast „Saved locally · vreme") + Account avatar (inijali →
  `AccountDialog`) + Settings (→ `SettingsDialog`) desno (zona desnog
  panela). **Druga traka (h-10, poravnata)** ispod: header levog panela |
  editor toolbar (jedan red, px-4) | Info/Details/Mentions tabovi desno —
  bez ikonica i bez okvira, svetli samo selektovani zlatnom pilulom; ukupno
  dve trake od vrha.
- **Levi panel**: header sa tab imenom, +(add), •••, Expand/Collapse all; stablo
  sa strelicom+ikonom+naslovom+tri-dot; **levo-donja traka**: ⓘ dugme
  (Popover: Save/Recovery/Copy feedback) — fiksno, ne skroluje sa stablom.
- **Donja traka radne površine**: Target ikonica skroz levo, word count u
  sredini, **Split | Write | Grid | List uz desnu ivicu srednjeg panela**
  (09.11. premešteno iz levog panela po Nikoli).
- **Desni panel**: Label + Status + boja u istom redu (`RightPanel.tsx`),
  Synopsis/Notes, hide dugme; `NoteMetaBar` dole — Label i Status „wrap“ oko
  svog teksta, uz levu ivicu panela (na uzom panelu se skupljaju/seku,
  `overflow-hidden`).
- **Corkboard / ListView / WriteArea** (rich editor), `NoteMetaBar`, resizer-i
  za oba panela (levi 240–560px, desni 190–680px, persistovano).
- Fix od ranije: `sr-only` span leak (svugde `relative` roditelji) +
  `html,body{overflow:hidden}` u `globals.css` — stranica se više ne pomera.
- **✅ Tačka 6 — GRID (uradjeno 09.11., ime ispravljeno po Nikoli):**
  `Corkboard.tsx` zamenio GridView (obrisan) — ali **naziv moda je „Grid"**,
  po Nikolaovoj ispravci („NISAM TI DOZVOLIO DA PROMENIŠ Grid u Corkboard —
  taj naziv Grid je ispravan"). Klasične Scrivener index kartice: **ikona +
  naslov + Synopsis**, papir boje `#efe6cf` na tamnoj pluti `#241c12`, caption
  „GRID · <nivo>" zlatno. **Jedan nivo hijerarhije**: deca selektovanog
  kontejnera / sama leaf nota / top nivo sekcije kad ništa nije selektovano.
  **Dupli klik** otvara notu u Write modu. **Drag & drop reorder** (HTML5 DnD,
  zlatna ivica-ubacivač pre/posle, drop na plutu = na kraj) preko novog
  opcionog `destIndex` parametra u `moveNodeTo`. Store **v5** (migracija:
  sačuvani `view:"grid"` → `"corkboard"` interno). „+ New note" dodaje u
  otvoreni nivo. Testirano: render, nivoi, dupli klik, drag reorder +
  persistencija posle reload-a, build + tsc čisti.
- **✅ Ispravke po Nikolinoj prijavi (09.11.):**
  1. **Header linije poravnate** — vertikalne linije topbara bile su 1px
     ukrivo u odnosu na linije panela (levo header 255 vs body 256; desno
     header 1152 vs body 1151). Fix: header zone width = panelWidth + 1
     (pokriva 1px resizer kolonu). Mereno pikselima: 256=256, 1151=1151.
  2. **Mod prikaza (Split/Write/Grid/List) se VIŠE NE RESETUJE** —
     openNovel/createNovel/importNovel više ne postavljaju view; ostaje
     uvek na poslednjem aktivnom modu (kroz tabove, izbor fajla, izlaz na
     dashboard i ponovno otvaranje — testirano).

## 4. Šta je SLEDEĆE (po redu — iz arhitektura dokumenta)

**Tačke 1–6 završene.** Sledeća je tačka 7.

7. **Inspector reorg** — desni panel u 3 taba: **Info** (Synopsis + Notes
   vertikalno, **draggable razdelnik** između njih), **Details** (povezivanje
   sa Codex notama, pretraživo), **Mentions** (ko pominje ovu notu); panel ostaje
   collapsible.
8. **Toolbar dopune** — postojeći dizajn ostaje (Segoe UI 16px, 1.5 line-height,
   B I U S, liste, citat, poravnanje, palette, highlight, Tx); dodati: **Text
   Style dropdown (podrazumevano „Normal")** + dugmad **Copy, Delete, Link**.
9. **Tabovi — pravila**: obavezni (ne mogu se brisati/preimenovati):
   **Binder, Codex, Trash**; brisljivi: Planning, Research, Templates, Prompts;
   podrška za **korisničke (custom) tabove**.
10. **Top bar — „Current Note" dropdown** umesto/dopuna Tree Scope (po
    dokumentu: ime aktivne note u topbaru, desno).
11. **Storage/eksport** — Vault (Markdown fajlovi) + **Master Backup_&lt;Project&gt;.json**;
    eksport: Importable Master, HTML, Markdown, JSON. (Note-level JSON eksport
    već postoji — `exportNoteJson`.)
12. **Dashboard** (po dokumentu, početni ekran projekta).

## 5. Otvorena pitanja (pitati Nikolu kada dođe na red)

- Meni u kodu piše **„Create note"**, a na njegovom screenshotu menija piše
  **„Create sub-page"** — pitati koje ime želi.
- Screenshot menija sadrži i stavku **„Edit permissions"** (između Sort
  sub-pages i Hide) koju arhitektura dokument NE pominje — pitati da li je treba.

## 6. Mapa ključnih fajlova

```
src/lib/kachamak/
  types.ts      NoteNode, SectionKey, TABS, TreeScope, ViewMode
  store.ts      Zustand + localStorage persist, version:4 + migrate (v0→v4)
  seed.ts       inicijalni podaci (Morana: Bloodline), DEFAULT_STATUSES
  icons.tsx     NOTE_ICONS + rowIcon pomoćnik
  utils.ts      novelWords, nodeWords, id, itd.
src/components/kachamak/
  Workspace.tsx   top bar (tabovi, TreeScope, Save, Account, Settings) + telo
  NotesSection.tsx levi panel + stablo + resizer + centralni deo + DONJA TRAKA
  NoteTree.tsx    stablo: redovi, rename, tri-dot meni, icon picker, Move dialog
  GridView.tsx / ListView.tsx / WriteArea.tsx  prikazi centralnog dela
  RightPanel.tsx  desni panel (Label/Status/boja, Synopsis, Notes)
  TrashView.tsx   Trash tab (restore)
  Home.tsx        početna (novel cover, dugmad)
  AccountDialog.tsx, RichEditor.tsx
src/app/page.tsx + layout.tsx + globals.css   app-shell, kachamak-scroll
```

## 7. Tehnički workflow (kako se radi i proverava)

```bash
cd /home/z/my-project
bun run build          # produkcijski build (mora proći pre svake prijave)
bunx tsc --noEmit      # tipovi (greške su OK samo u examples/ i skills/)
bun run start          # server na localhost:3000 (pre toga: pkill -f "next start")
```

- Testiranje UI: **agent-browser** skill (open, find role/text, eval, screenshot).
- Provera scrollbar/fiksiranost: `eval` sa `scrollTop` / `scrollHeight`.
- crop skripte: `scripts/crop_bottom.py`, izlazi u `scripts/crops/` (PIL, 3x zoom).
- Reference screenshotovi (original aplikacija): `upload/pasted_image_*.png` —
  `…2830380.png` i `…3055590.png` = donja traka originala; `…6486876.png` =
  **tri-dot meni originala** (Create sub-page / Rename / Duplicate / Export /
  Move / Delete / Sort sub-pages / Edit permissions / Hide / Collapse all /
  Expand all / Change icon).
- **Nikad ne menjati fajlove u `upload/`** — to su Nikolaovi ulazni materijali.
- Store migracije: svaka promena šeme podataka = **novi `version`** + migrate
  grana (trenutno v4). Ne dirati postojeće migracione grane.

## 8. Dizajn sistem (zabeleženo sa screenshotova)

- Pozadina `#0d0d0d`; paneli `#1b1b1b` / `black/20`; skoro crno, tanke
  svetlosive linije (`border-white/10`), donje trake `border-amber-500/25`.
- Zlatni akcenti: aktivni tab `#ad7e2e/#3a2c18/#fbe4a6`; ⓘ i Target
  `text-amber-400/90`; list dugmad aktivna `border-amber-400/70
  bg-amber-400/15 text-amber-300`; ranije i orange akcenti (`orange-500/40`).
- Meniji/dijalozi: tamna pozadina, `font-serif` u dropdown meniju (po originalu).
- Statusi (DEFAULT_STATUSES): N/A, To Do, First Draft, Revised Draft, Final
  Draft, Done. Labeli = slobodan tekst sa bojom.
- Editor spec iz dokumenta: **Segoe UI, 16px, line-height 1.5**.

## 9. Backup

`download/kachamak-aplikacija.zip` — kod trenutka 08.11.2026. (bez
node_modules/.next). **Za novi backup: `bash scripts/backup.sh`** — snapshot u
`backups/` (čuva se 12), osvežava download i public kopije, secrets-guard
(bez `.env`/ključeva), git commit; dnevno se sam pokreće cron-om u 03:00.
Detalji: `PROJECT_STATUS.md` §6.

## 10. Reference

- **`KACHAMAK-ARHITEKTURA.md`** (koren projekta) — snimak Nikolaovog
  arhitektura dokumenta (23 poglavlja) = **autoritativna specifikacija**.
  Kada ovaj kontekst-fajl i dokument kažu različito, **dokument pobeđuje**,
  a Nikolaova trenutna reč pobeđuje sve.
