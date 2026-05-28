# DIN-276 KG Sub-Group Fields — Proposal

**Status:** Awaiting user confirmation before insert.
**Source of truth:** `C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\DIN-276.md` (DIN 276:2018-12, Tab.1 Cost breakdown, lines 459–1012).
**Target:** 8 worksheet templates `DIN-276-09` through `DIN-276-16` (KG 100–800), Supabase project `vadsmshzebefjreqcicl`.

## Layout convention

- **Section C — Worksheet-Specific Content**: all input fields (3rd-level codes + leaf 2nd-level codes), `data_type='number'`, `unit='EUR'`, `is_required=false`, `clause_reference='§5.4, Tab.1 KG <code>'`, `verification_status='imported_unverified'`.
- **Section D — Derived Values / Calculations**: sub-group totals (2nd-level codes that *have* sub-codes) + the existing 1st-level total. Same data_type/unit. Same clause_reference.
- **Equations** (one per derived total): formula sums all sibling 3rd-level codes; the 1st-level total sums all 2nd-level sub-totals + any 2nd-level leaf codes that have no sub-codes.
- **Existing `kg_X00_total` fields** stay untouched (just gain a new equation that derives them).

Field-symbol convention: `kg_<code>` for inputs (e.g. `kg_211`), `kg_<X10>_total` for sub-totals (e.g. `kg_210_total`).

German labels follow DIN 276:2018-12 vocabulary; English labels follow the markdown source.

## Counts

| KG | Worksheet | Section C inputs | Section D derived | Equations | Total new fields |
|---|---|---:|---:|---:|---:|
| 100 | DIN-276-09 | 13 | 2 | 3 | 15 |
| 200 | DIN-276-10 | 23 | 4 | 5 | 27 |
| 300 | DIN-276-11 | 68 | 9 | 10 | 77 |
| 400 | DIN-276-12 | 62 | 9 | 10 | 71 |
| 500 | DIN-276-13 | 60 | 9 | 10 | 69 |
| 600 | DIN-276-14 | 8 | 1 | 2 | 9 |
| 700 | DIN-276-15 | 38 | 7 | 8 | 45 |
| 800 | DIN-276-16 | 5 | 0 | 1 | 5 |
| **Total** | | **277** | **41** | **49** | **318** |

(The existing 8 `kg_X00_total` fields are not counted as new — they stay; the 49 new equations include the 8 that re-derive them.)

---

## KG 100 — Grundstück · `DIN-276-09`

### Section C — Inputs (13)

| Code | Symbol | label_de | label_en |
|---|---|---|---|
| 110 | `kg_110` | Grundstückswert | Property value |
| 121 | `kg_121` | Vermessungsgebühren | Surveying fees |
| 122 | `kg_122` | Gerichtsgebühren | Court fees |
| 123 | `kg_123` | Notarsgebühren | Notary fees |
| 124 | `kg_124` | Grunderwerbsteuer | Real estate transfer tax |
| 125 | `kg_125` | Untersuchungen | Investigations |
| 126 | `kg_126` | Wertermittlungen | Valuations |
| 127 | `kg_127` | Genehmigungsgebühren | Authorisation fees |
| 128 | `kg_128` | Bodenordnung | Land readjustment |
| 129 | `kg_129` | Sonstiges zu KG 120 | Miscellaneous for KG 120 |
| 131 | `kg_131` | Abfindungen | Severance payments |
| 132 | `kg_132` | Ablösen dinglicher Rechte | Redemption of rights in rem |
| 139 | `kg_139` | Sonstiges zu KG 130 | Miscellaneous for KG 130 |

### Section D — Derived (2 new + 1 existing)

| Symbol | label_de | label_en |
|---|---|---|
| `kg_120_total` | KG 120 Gesamt | Total incidental property costs |
| `kg_130_total` | KG 130 Gesamt | Total third-party rights |
| `kg_100_total` *(existing)* | KG 100 Gesamt | Total property cost |

### Equations (3)

| Output | Formula |
|---|---|
| `kg_120_total` | `kg_121 + kg_122 + kg_123 + kg_124 + kg_125 + kg_126 + kg_127 + kg_128 + kg_129` |
| `kg_130_total` | `kg_131 + kg_132 + kg_139` |
| `kg_100_total` | `kg_110 + kg_120_total + kg_130_total` |

---

## KG 200 — Vorbereitende Maßnahmen · `DIN-276-10`

### Section C — Inputs (23)

| Code | Symbol | label_de | label_en |
|---|---|---|---|
| 211 | `kg_211` | Sicherungsmaßnahmen | Security measures |
| 212 | `kg_212` | Abbruchmaßnahmen | Demolition measures |
| 213 | `kg_213` | Altlastenbeseitigung | Removal of contaminated sites |
| 214 | `kg_214` | Herrichten der Geländeoberfläche | Levelling the ground surface |
| 215 | `kg_215` | Kampfmittelräumung | Explosive ordnance clearance |
| 216 | `kg_216` | Kulturhistorische Funde | Cultural-historical finds |
| 219 | `kg_219` | Sonstiges zu KG 210 | Miscellaneous for KG 210 |
| 221 | `kg_221` | Abwasserentsorgung | Wastewater disposal |
| 222 | `kg_222` | Wasserversorgung | Water supply |
| 223 | `kg_223` | Gasversorgung | Gas supply |
| 224 | `kg_224` | Fernwärmeversorgung | District heating supply |
| 225 | `kg_225` | Stromversorgung | Power supply |
| 226 | `kg_226` | Telekommunikation | Telecommunications |
| 227 | `kg_227` | Verkehrserschließung | Traffic development |
| 228 | `kg_228` | Abfallentsorgung | Waste disposal |
| 229 | `kg_229` | Sonstiges zu KG 220 | Miscellaneous for KG 220 |
| 230 | `kg_230` | Nichtöffentliche Erschließung | Non-public development |
| 241 | `kg_241` | Ausgleichsmaßnahmen | Equalisation measures |
| 242 | `kg_242` | Ausgleichsabgaben | Equalisation levies |
| 249 | `kg_249` | Sonstiges zu KG 240 | Miscellaneous for KG 240 |
| 251 | `kg_251` | Bauliche Maßnahmen | Structural measures |
| 252 | `kg_252` | Organisatorische Maßnahmen | Organisational measures |
| 259 | `kg_259` | Sonstiges zu KG 250 | Miscellaneous for KG 250 |

### Section D — Derived (4 new + 1 existing)

| Symbol | label_de | label_en |
|---|---|---|
| `kg_210_total` | KG 210 Gesamt | Total preparation |
| `kg_220_total` | KG 220 Gesamt | Total public development |
| `kg_240_total` | KG 240 Gesamt | Total compensatory measures and levies |
| `kg_250_total` | KG 250 Gesamt | Total transitional measures |
| `kg_200_total` *(existing)* | KG 200 Gesamt | Total preparatory measures |

### Equations (5)

| Output | Formula |
|---|---|
| `kg_210_total` | `kg_211 + kg_212 + kg_213 + kg_214 + kg_215 + kg_216 + kg_219` |
| `kg_220_total` | `kg_221 + kg_222 + kg_223 + kg_224 + kg_225 + kg_226 + kg_227 + kg_228 + kg_229` |
| `kg_240_total` | `kg_241 + kg_242 + kg_249` |
| `kg_250_total` | `kg_251 + kg_252 + kg_259` |
| `kg_200_total` | `kg_210_total + kg_220_total + kg_230 + kg_240_total + kg_250_total` |

---

## KG 300 — Bauwerk-Baukonstruktionen · `DIN-276-11`

### Section C — Inputs (68)

**KG 310 Baugrube/Erdbau:** 311 Herstellen · 312 Umschließung · 313 Wasserhaltung · 314 Vortrieb · 319 Sonstiges zu KG 310

**KG 320 Gründung, Unterbau:** 321 Baugrundverbesserung · 322 Flachgründungen, Bodenplatten · 323 Tiefgründungen · 324 Unterböden, Bodenbeläge · 325 Bauwerksabdichtungen · 326 Dränungen · 329 Sonstiges zu KG 320

**KG 330 Außenwände/Vertikale Baukonstruktionen, außen:** 331 Tragende Außenwände · 332 Nichttragende Außenwände · 333 Außenstützen · 334 Außentüren und -fenster · 335 Außenwandbekleidungen, außen · 336 Außenwandbekleidungen, innen · 337 Elementierte Außenwandkonstruktionen · 338 Sonnenschutz zu KG 330 · 339 Sonstiges zu KG 330

**KG 340 Innenwände/Vertikale Baukonstruktionen, innen:** 341 Tragende Innenwände · 342 Nichttragende Innenwände · 343 Innenstützen · 344 Innentüren und -fenster · 345 Innenwandbekleidungen · 346 Elementierte Innenwandkonstruktionen · 347 Sonnenschutz zu KG 340 · 349 Sonstiges zu KG 340

**KG 350 Decken/Horizontale Baukonstruktionen:** 351 Deckenkonstruktionen · 352 Deckenöffnungen · 353 Deckenbeläge · 354 Deckenbekleidungen · 355 Elementierte Deckenkonstruktionen · 359 Sonstiges zu KG 350

**KG 360 Dächer:** 361 Dachkonstruktionen · 362 Dachöffnungen · 363 Dachbeläge · 364 Dachbekleidungen · 365 Elementierte Dachkonstruktionen · 366 Sonnenschutz zu KG 360 · 369 Sonstiges zu KG 360

**KG 370 Infrastrukturanlagen:** 371 Anlagen für den Straßenverkehr · 372 Anlagen für den Schienenverkehr · 373 Anlagen für den Luftverkehr · 374 Wasserbauliche Anlagen · 375 Abwasserentsorgungsanlagen · 376 Wasserversorgungsanlagen · 377 Energie- und Informationsversorgungsanlagen · 378 Abfallentsorgungsanlagen · 379 Sonstiges zu KG 370

**KG 380 Baukonstruktive Einbauten:** 381 Allgemeine Einbauten · 382 Besondere Einbauten · 383 Landschaftsgestalterische Einbauten · 384 Mechanische Einbauten · 385 Einbauten in Ingenieurbauwerken · 386 Orientierungs- und Informationssysteme · 387 Schutzeinbauten · 389 Sonstiges zu KG 380

**KG 390 Sonstige Maßnahmen für Baukonstruktionen:** 391 Baustelleneinrichtung · 392 Gerüste · 393 Sicherungsmaßnahmen · 394 Abbruchmaßnahmen · 395 Instandsetzungen · 396 Materialentsorgung · 397 Zusätzliche Maßnahmen · 398 Provisorische Baukonstruktionen · 399 Sonstiges zu KG 390

### Section D — Derived (9 new + 1 existing)

`kg_310_total`, `kg_320_total`, `kg_330_total`, `kg_340_total`, `kg_350_total`, `kg_360_total`, `kg_370_total`, `kg_380_total`, `kg_390_total`, plus existing `kg_300_total`.

### Equations (10)

- `kg_310_total = kg_311+kg_312+kg_313+kg_314+kg_319`
- `kg_320_total = kg_321+kg_322+kg_323+kg_324+kg_325+kg_326+kg_329`
- `kg_330_total = kg_331+kg_332+kg_333+kg_334+kg_335+kg_336+kg_337+kg_338+kg_339`
- `kg_340_total = kg_341+kg_342+kg_343+kg_344+kg_345+kg_346+kg_347+kg_349`
- `kg_350_total = kg_351+kg_352+kg_353+kg_354+kg_355+kg_359`
- `kg_360_total = kg_361+kg_362+kg_363+kg_364+kg_365+kg_366+kg_369`
- `kg_370_total = kg_371+kg_372+kg_373+kg_374+kg_375+kg_376+kg_377+kg_378+kg_379`
- `kg_380_total = kg_381+kg_382+kg_383+kg_384+kg_385+kg_386+kg_387+kg_389`
- `kg_390_total = kg_391+kg_392+kg_393+kg_394+kg_395+kg_396+kg_397+kg_398+kg_399`
- `kg_300_total = kg_310_total+kg_320_total+kg_330_total+kg_340_total+kg_350_total+kg_360_total+kg_370_total+kg_380_total+kg_390_total`

---

## KG 400 — Bauwerk-Technische Anlagen · `DIN-276-12`

### Section C — Inputs (62)

**KG 410 Abwasser-, Wasser-, Gasanlagen:** 411 Abwasseranlagen · 412 Wasseranlagen · 413 Gasanlagen · 419 Sonstiges zu KG 410

**KG 420 Wärmeversorgungsanlagen:** 421 Wärmeerzeugungsanlagen · 422 Wärmeverteilnetze · 423 Raumheizflächen · 424 Verkehrsheizflächen · 429 Sonstiges zu KG 420

**KG 430 Raumlufttechnische Anlagen:** 431 Lüftungsanlagen · 432 Teilklimaanlagen · 433 Klimaanlagen · 434 Kälteanlagen · 439 Sonstiges zu KG 430

**KG 440 Elektrische Anlagen:** 441 Hoch- und Mittelspannungsanlagen · 442 Eigenstromversorgungsanlagen · 443 Niederspannungsschaltanlagen · 444 Niederspannungsinstallationsanlagen · 445 Beleuchtungsanlagen · 446 Blitzschutz- und Erdungsanlagen · 447 Fahrleitungssysteme · 449 Sonstiges zu KG 440

**KG 450 Kommunikations-, sicherheits- und informationstechnische Anlagen:** 451 Telekommunikationsanlagen · 452 Such- und Signalanlagen · 453 Zeitdienstanlagen · 454 Elektroakustische Anlagen · 455 Audiovisuelle Medien- und Antennenanlagen · 456 Gefahrenmelde- und Alarmanlagen · 457 Datenübertragungsnetze · 458 Verkehrsbeeinflussungsanlagen · 459 Sonstiges zu KG 450

**KG 460 Förderanlagen:** 461 Aufzugsanlagen · 462 Fahrtreppen, Fahrsteige · 463 Befahranlagen · 464 Transportanlagen · 465 Krananlagen · 466 Hydraulikanlagen · 469 Sonstiges zu KG 460

**KG 470 Nutzungsspezifische und verfahrenstechnische Anlagen:** 471 Küchentechnische Anlagen · 472 Wäscherei-, Reinigungs- und badetechnische Anlagen · 473 Medienversorgungsanlagen, medizin- und labortechnische Anlagen · 474 Feuerlöschanlagen · 475 Prozesswärme-, kälte- und -luftanlagen · 476 Weitere nutzungsspezifische Anlagen · 477 Verfahrenstechnische Anlagen, Wasser, Abwasser und Gase · 478 Verfahrenstechnische Anlagen, Feststoffe, Wertstoffe und Abfälle · 479 Sonstiges zu KG 470

**KG 480 Gebäude- und Anlagenautomation:** 481 Automationseinrichtungen · 482 Schaltschränke, Automationsschwerpunkte · 483 Automationsmanagement · 484 Kabel, Leitungen und Verlegesysteme · 485 Datenübertragungsnetze · 489 Sonstiges zu KG 480

**KG 490 Sonstige Maßnahmen für Technische Anlagen:** 491 Baustelleneinrichtung · 492 Gerüste · 493 Sicherungsmaßnahmen · 494 Abbruchmaßnahmen · 495 Instandsetzungen · 496 Materialentsorgung · 497 Zusätzliche Maßnahmen · 498 Provisorische Technische Anlagen · 499 Sonstiges zu KG 490

### Section D — Derived (9 new + 1 existing)

`kg_410_total`, `kg_420_total`, …, `kg_490_total`, plus existing `kg_400_total`.

### Equations (10)

Analog zu KG 300: jedes `kg_NN0_total` = Summe seiner 9 (oder weniger) Sub-Codes; `kg_400_total = kg_410_total+...+kg_490_total`.

---

## KG 500 — Außenanlagen & Freiflächen · `DIN-276-13`

### Section C — Inputs (60)

**KG 510 Erdarbeiten:** 511 Herstellen · 512 Umschließung · 513 Wasserhaltung · 514 Vortrieb · 519 Sonstiges zu KG 510

**KG 520 Gründung, Unterbau:** 521 Baugrundverbesserung · 522 Flachgründungen, Bodenplatten · 523 Unterböden, Bodenbeläge · 524 Bauwerksabdichtungen · 525 Dränungen · 529 Sonstiges zu KG 520

**KG 530 Oberbau, Deckschichten:** 531 Wege · 532 Straßen · 533 Plätze, Höfe, Terrassen · 534 Stellplätze · 535 Sportplatzflächen · 536 Spielplatzflächen · 537 Gleisanlagen · 538 Flugplatzflächen · 539 Sonstiges zu KG 530

**KG 540 Baukonstruktionen:** 541 Einfriedungen · 542 Schutzkonstruktionen · 543 Wandkonstruktionen · 544 Rampen, Treppen, Tribünen · 545 Überdachungen · 546 Brücken · 547 Kanal- und Schachtbauten · 548 Wasserbecken · 549 Sonstiges zu KG 540

**KG 550 Technische Anlagen:** 551 Abwasseranlagen · 552 Wasseranlagen · 553 Gas- und Flüssigkeitsanlagen · 554 Wärmeversorgungsanlagen · 555 Raumlufttechnische Anlagen · 556 Elektrische Anlagen · 557 Kommunikations-, sicherheits- und informationstechnische Anlagen, Automation · 558 Nutzungsspezifische Anlagen · 559 Sonstiges zu KG 550

**KG 560 Einbauten in Außenanlagen und Freiflächen:** 561 Allgemeine Einbauten · 562 Besondere Einbauten · 563 Orientierungs- und Informationssysteme · 569 Sonstiges zu KG 560

**KG 570 Vegetationsflächen:** 571 Vegetationstechnische Bodenbearbeitung · 572 Sicherungsbauweisen · 573 Pflanzflächen · 574 Rasen- und Saatflächen · 579 Sonstiges zu KG 570

**KG 580 Wasserflächen:** 581 Befestigungen · 582 Abdichtungen · 583 Bepflanzungen · 589 Sonstiges zu KG 580

**KG 590 Sonstige Maßnahmen für Außenanlagen und Freiflächen:** 591 Baustelleneinrichtung · 592 Gerüste · 593 Sicherungsmaßnahmen · 594 Abbruchmaßnahmen · 595 Instandsetzungen · 596 Materialentsorgung · 597 Zusätzliche Maßnahmen · 598 Provisorische Außenanlagen und Freiflächen · 599 Sonstiges zu KG 590

### Section D — Derived (9 new + 1 existing)

`kg_510_total` ... `kg_590_total`, plus existing `kg_500_total`.

### Equations (10)

Analog: 9 Sub-Sums + `kg_500_total = kg_510_total+...+kg_590_total`.

---

## KG 600 — Ausstattung & Kunstwerke · `DIN-276-14`

### Section C — Inputs (8)

| Code | Symbol | label_de | label_en |
|---|---|---|---|
| 610 | `kg_610` | Allgemeine Ausstattung | General equipment |
| 620 | `kg_620` | Besondere Ausstattung | Special equipment |
| 630 | `kg_630` | Informationstechnische Ausstattung | Information technology equipment |
| 641 | `kg_641` | Kunstobjekte | Objects of art |
| 642 | `kg_642` | Künstlerische Gestaltung des Bauwerks | Artistic design of the building |
| 643 | `kg_643` | Künstlerische Gestaltung der Außenanlagen | Artistic design of outdoor facilities |
| 649 | `kg_649` | Sonstiges zu KG 640 | Miscellaneous for KG 640 |
| 690 | `kg_690` | Sonstige Ausstattung | Other equipment |

### Section D — Derived (1 new + 1 existing)

`kg_640_total`, plus existing `kg_600_total`.

### Equations (2)

- `kg_640_total = kg_641 + kg_642 + kg_643 + kg_649`
- `kg_600_total = kg_610 + kg_620 + kg_630 + kg_640_total + kg_690`

---

## KG 700 — Baunebenkosten · `DIN-276-15`

### Section C — Inputs (38)

**KG 710 Bauherrenaufgaben:** 711 Projektleitung · 712 Bedarfsplanung · 713 Projektsteuerung · 714 Sicherheits- und Gesundheitsschutzkoordination · 715 Vergabeverfahren · 719 Sonstiges zu KG 710

**KG 720 Vorbereitung der Objektplanung:** 721 Untersuchungen · 722 Wertermittlungen · 723 Städtebauliche Leistungen · 724 Landschaftsplanerische Leistungen · 725 Wettbewerbe · 729 Sonstiges zu KG 720

**KG 730 Objektplanung:** 731 Gebäude und Innenräume · 732 Außenanlagen · 733 Ingenieurbauwerke · 734 Verkehrsanlagen · 739 Sonstiges zu KG 730

**KG 740 Fachplanung:** 741 Tragwerksplanung · 742 Technische Ausrüstung · 743 Bauphysik · 744 Geotechnik · 745 Ingenieurvermessung · 746 Lichttechnik, Tageslichttechnik · 747 Brandschutz · 748 Altlasten, Kampfmittel, kulturhistorische Funde · 749 Sonstiges zu KG 740

**KG 750 Künstlerische Leistungen:** 751 Kunstwettbewerbe · 752 Honorare · 759 Sonstiges zu KG 750

**KG 760 Allgemeine Baunebenkosten:** 761 Gutachten und Beratung · 762 Prüfungen, Genehmigungen, Abnahmen · 763 Betriebskosten · 764 Bemusterungskosten · 765 Betriebskosten nach Abnahme · 766 Versicherungen · 769 Sonstiges zu KG 760

**KG 790 Sonstige Baunebenkosten:** 791 Bestandsdokumentation · 799 Sonstiges zu KG 790

### Section D — Derived (7 new + 1 existing)

`kg_710_total`, `kg_720_total`, `kg_730_total`, `kg_740_total`, `kg_750_total`, `kg_760_total`, `kg_790_total`, plus existing `kg_700_total`.

### Equations (8)

Analog: 7 Sub-Sums + `kg_700_total = kg_710_total+kg_720_total+kg_730_total+kg_740_total+kg_750_total+kg_760_total+kg_790_total`.

---

## KG 800 — Finanzierung · `DIN-276-16`

### Section C — Inputs (5)

| Code | Symbol | label_de | label_en |
|---|---|---|---|
| 810 | `kg_810` | Finanzierungsnebenkosten | Ancillary financing costs |
| 820 | `kg_820` | Fremdkapitalzinsen | Interest on borrowed capital |
| 830 | `kg_830` | Eigenkapitalzinsen | Interest on equity |
| 840 | `kg_840` | Bürgschaften | Guarantees |
| 890 | `kg_890` | Sonstige Finanzierungskosten | Other financing costs |

### Section D — Derived (0 new + 1 existing)

Only existing `kg_800_total` (no 2nd-level sub-totals needed — all KG 800 codes are leaves).

### Equations (1)

- `kg_800_total = kg_810 + kg_820 + kg_830 + kg_840 + kg_890`

---

## Implementation notes (script)

- Idempotent: `INSERT … ON CONFLICT (worksheet_template_id, symbol) DO NOTHING` for fields; equations have no unique constraint beyond PK, so check by `(worksheet_template_id, output_symbol)` before insert (skip if exists).
- Existing `kg_X00_total` fields are NOT modified.
- All new fields: `is_required=false`, `verification_status='imported_unverified'`, `unit='EUR'`, `data_type='number'`.
- Equations: `equation_number='KG<X>-<NN>'` (e.g. `KG2-01`), `output_unit='EUR'`, `clause_reference='§5.4, Tab.1 KG <code>'`, `verification_status='imported_unverified'`.
- `order_index`: Section C uses ascending integer matching code (e.g. 211→211, 121→121); Section D uses 910, 920, ..., 990 to keep sub-totals before grand-total (which is 999).
- `clause_reference`: each input field gets `'§5.4, Tab.1 KG <code>'` matching the existing kg_X00_total pattern.
