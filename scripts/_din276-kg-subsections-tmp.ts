/**
 * Generator for DIN-276 KG sub-section restructuring.
 *
 * For each of the 8 KG worksheets, this:
 *  - Creates child worksheet_sections under Section C, one per 2nd-level KG code
 *    (e.g. "KG 110", "KG 310", …) with the German DIN 276 name as title.
 *  - Re-parents the input fields (kg_111, kg_311, …) and the sub-totals
 *    (kg_X10_total) to the new sub-sections.
 *  - Sub-totals get order_index = 9999 so they sort to the bottom of each group.
 *  - kg_X00_total (grand total) stays in Section D.
 *
 * Idempotent via SELECT-then-INSERT pattern + UPDATE (re-running is a no-op).
 *
 * Emits one PL/pgSQL DO-block per worksheet to .tmp-din276-subsections/<code>.sql.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type SubCode = readonly [code: string, labelDe: string, labelEn: string];

type SecondLevel = {
  code: string;
  labelDe: string;
  labelEn: string;
  subCodes: readonly SubCode[];
};

type KG = {
  worksheet: string;
  kgCode: string;
  entries: readonly SecondLevel[];
};

// Same structure as the fields generator — kept inline so the script is
// self-contained and re-runnable.
const KG_SPECS: readonly KG[] = [
  { worksheet: 'DIN-276-09', kgCode: '100', entries: [
    { code: '110', labelDe: 'Grundstückswert', labelEn: 'Property value', subCodes: [] },
    { code: '120', labelDe: 'Grundstücksnebenkosten', labelEn: 'Incidental property costs', subCodes: [
      ['121','Vermessungsgebühren','Surveying fees'],['122','Gerichtsgebühren','Court fees'],
      ['123','Notarsgebühren','Notary fees'],['124','Grunderwerbsteuer','Real estate transfer tax'],
      ['125','Untersuchungen','Investigations'],['126','Wertermittlungen','Valuations'],
      ['127','Genehmigungsgebühren','Authorisation fees'],['128','Bodenordnung','Land readjustment'],
      ['129','Sonstiges zu KG 120','Miscellaneous for KG 120'],
    ] },
    { code: '130', labelDe: 'Rechte Dritter', labelEn: 'Third party rights', subCodes: [
      ['131','Abfindungen','Severance payments'],['132','Ablösen dinglicher Rechte','Redemption of rights in rem'],
      ['139','Sonstiges zu KG 130','Miscellaneous for KG 130'],
    ] },
  ] },
  { worksheet: 'DIN-276-10', kgCode: '200', entries: [
    { code: '210', labelDe: 'Herrichten', labelEn: 'Preparation', subCodes: [
      ['211','Sicherungsmaßnahmen','Security measures'],['212','Abbruchmaßnahmen','Demolition measures'],
      ['213','Altlastenbeseitigung','Removal of contaminated sites'],['214','Herrichten der Geländeoberfläche','Levelling the ground surface'],
      ['215','Kampfmittelräumung','Explosive ordnance clearance'],['216','Kulturhistorische Funde','Cultural-historical finds'],
      ['219','Sonstiges zu KG 210','Miscellaneous for KG 210'],
    ] },
    { code: '220', labelDe: 'Öffentliche Erschließung', labelEn: 'Public development', subCodes: [
      ['221','Abwasserentsorgung','Wastewater disposal'],['222','Wasserversorgung','Water supply'],
      ['223','Gasversorgung','Gas supply'],['224','Fernwärmeversorgung','District heating supply'],
      ['225','Stromversorgung','Power supply'],['226','Telekommunikation','Telecommunications'],
      ['227','Verkehrserschließung','Traffic development'],['228','Abfallentsorgung','Waste disposal'],
      ['229','Sonstiges zu KG 220','Miscellaneous for KG 220'],
    ] },
    { code: '230', labelDe: 'Nichtöffentliche Erschließung', labelEn: 'Non-public development', subCodes: [] },
    { code: '240', labelDe: 'Ausgleichsmaßnahmen und -abgaben', labelEn: 'Compensatory measures and levies', subCodes: [
      ['241','Ausgleichsmaßnahmen','Equalisation measures'],['242','Ausgleichsabgaben','Equalisation levies'],
      ['249','Sonstiges zu KG 240','Miscellaneous for KG 240'],
    ] },
    { code: '250', labelDe: 'Übergangsmaßnahmen', labelEn: 'Transitional measures', subCodes: [
      ['251','Bauliche Maßnahmen','Structural measures'],['252','Organisatorische Maßnahmen','Organisational measures'],
      ['259','Sonstiges zu KG 250','Miscellaneous for KG 250'],
    ] },
  ] },
  { worksheet: 'DIN-276-11', kgCode: '300', entries: [
    { code: '310', labelDe: 'Baugrube/Erdbau', labelEn: 'Excavation/earthworks', subCodes: [
      ['311','Herstellen','Manufacture'],['312','Umschließung','Enclosure'],['313','Wasserhaltung','Dewatering'],
      ['314','Vortrieb','Propulsion'],['319','Sonstiges zu KG 310','Miscellaneous for KG 310'],
    ] },
    { code: '320', labelDe: 'Gründung, Unterbau', labelEn: 'Foundation, substructure', subCodes: [
      ['321','Baugrundverbesserung','Ground improvement'],['322','Flachgründungen, Bodenplatten','Shallow foundations and floor slabs'],
      ['323','Tiefgründungen','Deep foundations'],['324','Unterböden, Bodenbeläge','Foundation coverings'],
      ['325','Bauwerksabdichtungen','Sealing and cladding'],['326','Dränungen','Drainage systems'],
      ['329','Sonstiges zu KG 320','Miscellaneous for KG 320'],
    ] },
    { code: '330', labelDe: 'Außenwände/Vertikale Baukonstruktionen, außen', labelEn: 'Exterior walls/vertical building structures, exterior', subCodes: [
      ['331','Tragende Außenwände','Load-bearing exterior walls'],['332','Nichttragende Außenwände','Non-loadbearing exterior walls'],
      ['333','Außenstützen','External supports'],['334','Außentüren und -fenster','External wall openings'],
      ['335','Außenwandbekleidungen, außen','Exterior wall cladding, exterior'],['336','Außenwandbekleidungen, innen','Exterior wall cladding, interior'],
      ['337','Elementierte Außenwandkonstruktionen','Elementised exterior wall constructions'],['338','Sonnenschutz zu KG 330','Light protection for KG 330'],
      ['339','Sonstiges zu KG 330','Miscellaneous for KG 330'],
    ] },
    { code: '340', labelDe: 'Innenwände/Vertikale Baukonstruktionen, innen', labelEn: 'Interior walls/vertical building structures, interior', subCodes: [
      ['341','Tragende Innenwände','Load-bearing interior walls'],['342','Nichttragende Innenwände','Non-load-bearing interior walls'],
      ['343','Innenstützen','Internal supports'],['344','Innentüren und -fenster','Interior wall openings'],
      ['345','Innenwandbekleidungen','Interior wall panelling'],['346','Elementierte Innenwandkonstruktionen','Elementised interior wall constructions'],
      ['347','Sonnenschutz zu KG 340','Light protection for KG 340'],['349','Sonstiges zu KG 340','Miscellaneous for KG 340'],
    ] },
    { code: '350', labelDe: 'Decken/Horizontale Baukonstruktionen', labelEn: 'Ceilings/horizontal building structures', subCodes: [
      ['351','Deckenkonstruktionen','Ceiling constructions'],['352','Deckenöffnungen','Ceiling openings'],
      ['353','Deckenbeläge','Ceiling coverings'],['354','Deckenbekleidungen','Ceiling panelling'],
      ['355','Elementierte Deckenkonstruktionen','Elementised ceiling constructions'],['359','Sonstiges zu KG 350','Miscellaneous for KG 350'],
    ] },
    { code: '360', labelDe: 'Dächer', labelEn: 'Roofs', subCodes: [
      ['361','Dachkonstruktionen','Roof constructions'],['362','Dachöffnungen','Roof openings'],
      ['363','Dachbeläge','Roof coverings'],['364','Dachbekleidungen','Roof panelling'],
      ['365','Elementierte Dachkonstruktionen','Elementised roof constructions'],['366','Sonnenschutz zu KG 360','Light protection for KG 360'],
      ['369','Sonstiges zu KG 360','Miscellaneous for KG 360'],
    ] },
    { code: '370', labelDe: 'Infrastrukturanlagen', labelEn: 'Infrastructure facilities', subCodes: [
      ['371','Anlagen für den Straßenverkehr','Systems for road traffic'],['372','Anlagen für den Schienenverkehr','Systems for rail transport'],
      ['373','Anlagen für den Luftverkehr','Installations for air traffic'],['374','Wasserbauliche Anlagen','Hydraulic engineering facilities'],
      ['375','Abwasserentsorgungsanlagen','Wastewater disposal systems'],['376','Wasserversorgungsanlagen','Water supply systems'],
      ['377','Energie- und Informationsversorgungsanlagen','Energy and information supply systems'],['378','Abfallentsorgungsanlagen','Waste disposal facilities'],
      ['379','Sonstiges zu KG 370','Miscellaneous for KG 370'],
    ] },
    { code: '380', labelDe: 'Baukonstruktive Einbauten', labelEn: 'Structural fixtures', subCodes: [
      ['381','Allgemeine Einbauten','General fixtures'],['382','Besondere Einbauten','Special fixtures'],
      ['383','Landschaftsgestalterische Einbauten','Landscaping installations'],['384','Mechanische Einbauten','Mechanical installations'],
      ['385','Einbauten in Ingenieurbauwerken','Fixtures in civil engineering structures'],['386','Orientierungs- und Informationssysteme','Orientation and information systems'],
      ['387','Schutzeinbauten','Protective fittings'],['389','Sonstiges zu KG 380','Miscellaneous for KG 380'],
    ] },
    { code: '390', labelDe: 'Sonstige Maßnahmen für Baukonstruktionen', labelEn: 'Other measures for building structures', subCodes: [
      ['391','Baustelleneinrichtung','Construction site equipment'],['392','Gerüste','Scaffolding'],
      ['393','Sicherungsmaßnahmen','Security measures'],['394','Abbruchmaßnahmen','Demolition measures'],
      ['395','Instandsetzungen','Repairs'],['396','Materialentsorgung','Material disposal'],
      ['397','Zusätzliche Maßnahmen','Additional measures'],['398','Provisorische Baukonstruktionen','Temporary building structures'],
      ['399','Sonstiges zu KG 390','Miscellaneous for KG 390'],
    ] },
  ] },
  { worksheet: 'DIN-276-12', kgCode: '400', entries: [
    { code: '410', labelDe: 'Abwasser-, Wasser-, Gasanlagen', labelEn: 'Sewage, water and gas systems', subCodes: [
      ['411','Abwasseranlagen','Sewage systems'],['412','Wasseranlagen','Water systems'],
      ['413','Gasanlagen','Gas systems'],['419','Sonstiges zu KG 410','Miscellaneous for KG 410'],
    ] },
    { code: '420', labelDe: 'Wärmeversorgungsanlagen', labelEn: 'Heat supply systems', subCodes: [
      ['421','Wärmeerzeugungsanlagen','Heat generation systems'],['422','Wärmeverteilnetze','Heat distribution networks'],
      ['423','Raumheizflächen','Space heating surfaces'],['424','Verkehrsheizflächen','Traffic heating surfaces'],
      ['429','Sonstiges zu KG 420','Miscellaneous for KG 420'],
    ] },
    { code: '430', labelDe: 'Raumlufttechnische Anlagen', labelEn: 'Ventilation and air conditioning systems', subCodes: [
      ['431','Lüftungsanlagen','Ventilation systems'],['432','Teilklimaanlagen','Partial air conditioning systems'],
      ['433','Klimaanlagen','Air conditioning systems'],['434','Kälteanlagen','Refrigeration systems'],
      ['439','Sonstiges zu KG 430','Miscellaneous for KG 430'],
    ] },
    { code: '440', labelDe: 'Elektrische Anlagen', labelEn: 'Electrical systems', subCodes: [
      ['441','Hoch- und Mittelspannungsanlagen','High and medium-voltage systems'],['442','Eigenstromversorgungsanlagen','Own power supply systems'],
      ['443','Niederspannungsschaltanlagen','Low-voltage switchgear'],['444','Niederspannungsinstallationsanlagen','Low-voltage installations'],
      ['445','Beleuchtungsanlagen','Lighting systems'],['446','Blitzschutz- und Erdungsanlagen','Lightning protection and earthing systems'],
      ['447','Fahrleitungssysteme','Catenary systems'],['449','Sonstiges zu KG 440','Miscellaneous for KG 440'],
    ] },
    { code: '450', labelDe: 'Kommunikations-, sicherheits- und informationstechnische Anlagen', labelEn: 'Communication, security and information technology systems', subCodes: [
      ['451','Telekommunikationsanlagen','Telecommunications systems'],['452','Such- und Signalanlagen','Search and signalling systems'],
      ['453','Zeitdienstanlagen','Time service systems'],['454','Elektroakustische Anlagen','Electroacoustic systems'],
      ['455','Audiovisuelle Medien- und Antennenanlagen','Audiovisual media and antenna systems'],['456','Gefahrenmelde- und Alarmanlagen','Hazard detection and alarm systems'],
      ['457','Datenübertragungsnetze','Data transmission networks'],['458','Verkehrsbeeinflussungsanlagen','Traffic control systems'],
      ['459','Sonstiges zu KG 450','Miscellaneous for KG 450'],
    ] },
    { code: '460', labelDe: 'Förderanlagen', labelEn: 'Conveyor systems', subCodes: [
      ['461','Aufzugsanlagen','Lifts'],['462','Fahrtreppen, Fahrsteige','Escalators, moving walks'],
      ['463','Befahranlagen','Drive-on systems'],['464','Transportanlagen','Transport systems'],
      ['465','Krananlagen','Crane systems'],['466','Hydraulikanlagen','Hydraulic systems'],
      ['469','Sonstiges zu KG 460','Miscellaneous for KG 460'],
    ] },
    { code: '470', labelDe: 'Nutzungsspezifische und verfahrenstechnische Anlagen', labelEn: 'Utilisation-specific and process engineering systems', subCodes: [
      ['471','Küchentechnische Anlagen','Kitchen equipment'],['472','Wäscherei-, Reinigungs- und badetechnische Anlagen','Laundry, cleaning and bathing facilities'],
      ['473','Medienversorgungsanlagen, medizin- und labortechnische Anlagen','Media supply, medical and laboratory equipment'],['474','Feuerlöschanlagen','Fire extinguishing systems'],
      ['475','Prozesswärme-, kälte- und -luftanlagen','Process heating, cooling and air systems'],['476','Weitere nutzungsspezifische Anlagen','Other utilisation-specific systems'],
      ['477','Verfahrenstechnische Anlagen, Wasser, Abwasser und Gase','Process engineering systems, water, waste water and gases'],['478','Verfahrenstechnische Anlagen, Feststoffe, Wertstoffe und Abfälle','Process plants, solids, recyclables and waste'],
      ['479','Sonstiges zu KG 470','Miscellaneous for KG 470'],
    ] },
    { code: '480', labelDe: 'Gebäude- und Anlagenautomation', labelEn: 'Building and plant automation', subCodes: [
      ['481','Automationseinrichtungen','Automation equipment'],['482','Schaltschränke, Automationsschwerpunkte','Switch cabinets, automation focal points'],
      ['483','Automationsmanagement','Automation management'],['484','Kabel, Leitungen und Verlegesysteme','Cables, lines and installation systems'],
      ['485','Datenübertragungsnetze','Data transmission networks'],['489','Sonstiges zu KG 480','Miscellaneous for KG 480'],
    ] },
    { code: '490', labelDe: 'Sonstige Maßnahmen für Technische Anlagen', labelEn: 'Other measures for technical installations', subCodes: [
      ['491','Baustelleneinrichtung','Construction site equipment'],['492','Gerüste','Scaffolding'],
      ['493','Sicherungsmaßnahmen','Security measures'],['494','Abbruchmaßnahmen','Demolition measures'],
      ['495','Instandsetzungen','Repairs'],['496','Materialentsorgung','Material disposal'],
      ['497','Zusätzliche Maßnahmen','Additional measures'],['498','Provisorische Technische Anlagen','Provisional technical installations'],
      ['499','Sonstiges zu KG 490','Miscellaneous for KG 490'],
    ] },
  ] },
  { worksheet: 'DIN-276-13', kgCode: '500', entries: [
    { code: '510', labelDe: 'Erdarbeiten', labelEn: 'Earthworks', subCodes: [
      ['511','Herstellen','Manufacture'],['512','Umschließung','Enclosure'],['513','Wasserhaltung','Dewatering'],
      ['514','Vortrieb','Propulsion'],['519','Sonstiges zu KG 510','Miscellaneous for KG 510'],
    ] },
    { code: '520', labelDe: 'Gründung, Unterbau', labelEn: 'Foundation, substructure', subCodes: [
      ['521','Baugrundverbesserung','Ground improvement'],['522','Flachgründungen, Bodenplatten','Foundations and floor slabs'],
      ['523','Unterböden, Bodenbeläge','Foundation coverings'],['524','Bauwerksabdichtungen','Sealing and cladding'],
      ['525','Dränungen','Drainage systems'],['529','Sonstiges zu KG 520','Miscellaneous for KG 520'],
    ] },
    { code: '530', labelDe: 'Oberbau, Deckschichten', labelEn: 'Superstructure, surface courses', subCodes: [
      ['531','Wege','Paths'],['532','Straßen','Roads'],['533','Plätze, Höfe, Terrassen','Squares, courtyards, terraces'],
      ['534','Stellplätze','Pitches'],['535','Sportplatzflächen','Sports field areas'],['536','Spielplatzflächen','Playground areas'],
      ['537','Gleisanlagen','Track systems'],['538','Flugplatzflächen','Aerodrome areas'],['539','Sonstiges zu KG 530','Miscellaneous for KG 530'],
    ] },
    { code: '540', labelDe: 'Baukonstruktionen', labelEn: 'Building constructions', subCodes: [
      ['541','Einfriedungen','Enclosures'],['542','Schutzkonstruktionen','Protective structures'],
      ['543','Wandkonstruktionen','Wall constructions'],['544','Rampen, Treppen, Tribünen','Ramps, stairs, grandstands'],
      ['545','Überdachungen','Canopies'],['546','Brücken','Bridges'],['547','Kanal- und Schachtbauten','Channel and manhole constructions'],
      ['548','Wasserbecken','Water basin'],['549','Sonstiges zu KG 540','Miscellaneous for KG 540'],
    ] },
    { code: '550', labelDe: 'Technische Anlagen', labelEn: 'Technical installations', subCodes: [
      ['551','Abwasseranlagen','Sewage systems'],['552','Wasseranlagen','Water systems'],
      ['553','Gas- und Flüssigkeitsanlagen','Systems for gases and liquids'],['554','Wärmeversorgungsanlagen','Heat supply systems'],
      ['555','Raumlufttechnische Anlagen','Ventilation and air conditioning systems'],['556','Elektrische Anlagen','Electrical systems'],
      ['557','Kommunikations-, sicherheits- und informationstechnische Anlagen, Automation','Communication, security and information technology systems, automation'],['558','Nutzungsspezifische Anlagen','Utilisation-specific systems'],
      ['559','Sonstiges zu KG 550','Miscellaneous for KG 550'],
    ] },
    { code: '560', labelDe: 'Einbauten in Außenanlagen und Freiflächen', labelEn: 'Installations in outdoor facilities and open spaces', subCodes: [
      ['561','Allgemeine Einbauten','General fixtures'],['562','Besondere Einbauten','Special fixtures'],
      ['563','Orientierungs- und Informationssysteme','Orientation and information systems'],['569','Sonstiges zu KG 560','Miscellaneous for KG 560'],
    ] },
    { code: '570', labelDe: 'Vegetationsflächen', labelEn: 'Vegetation areas', subCodes: [
      ['571','Vegetationstechnische Bodenbearbeitung','Vegetation tillage'],['572','Sicherungsbauweisen','Fuse construction methods'],
      ['573','Pflanzflächen','Planting areas'],['574','Rasen- und Saatflächen','Lawns and seeded areas'],
      ['579','Sonstiges zu KG 570','Miscellaneous for KG 570'],
    ] },
    { code: '580', labelDe: 'Wasserflächen', labelEn: 'Water surfaces', subCodes: [
      ['581','Befestigungen','Attachments'],['582','Abdichtungen','Sealings'],
      ['583','Bepflanzungen','Plantings'],['589','Sonstiges zu KG 580','Miscellaneous for KG 580'],
    ] },
    { code: '590', labelDe: 'Sonstige Maßnahmen für Außenanlagen und Freiflächen', labelEn: 'Other measures for outdoor facilities and open spaces', subCodes: [
      ['591','Baustelleneinrichtung','Construction site equipment'],['592','Gerüste','Scaffolding'],
      ['593','Sicherungsmaßnahmen','Security measures'],['594','Abbruchmaßnahmen','Demolition measures'],
      ['595','Instandsetzungen','Repairs'],['596','Materialentsorgung','Material disposal'],
      ['597','Zusätzliche Maßnahmen','Additional measures'],['598','Provisorische Außenanlagen und Freiflächen','Provisional outdoor facilities and open spaces'],
      ['599','Sonstiges zu KG 590','Miscellaneous for KG 590'],
    ] },
  ] },
  { worksheet: 'DIN-276-14', kgCode: '600', entries: [
    { code: '610', labelDe: 'Allgemeine Ausstattung', labelEn: 'General equipment', subCodes: [] },
    { code: '620', labelDe: 'Besondere Ausstattung', labelEn: 'Special equipment', subCodes: [] },
    { code: '630', labelDe: 'Informationstechnische Ausstattung', labelEn: 'Information technology equipment', subCodes: [] },
    { code: '640', labelDe: 'Künstlerische Ausstattung', labelEn: 'Artistic equipment', subCodes: [
      ['641','Kunstobjekte','Objects of art'],['642','Künstlerische Gestaltung des Bauwerks','Artistic design of the building'],
      ['643','Künstlerische Gestaltung der Außenanlagen und Freiflächen','Artistic design of outdoor facilities and open spaces'],['649','Sonstiges zu KG 640','Miscellaneous for KG 640'],
    ] },
    { code: '690', labelDe: 'Sonstige Ausstattung', labelEn: 'Other equipment', subCodes: [] },
  ] },
  { worksheet: 'DIN-276-15', kgCode: '700', entries: [
    { code: '710', labelDe: 'Bauherrenaufgaben', labelEn: 'Client tasks', subCodes: [
      ['711','Projektleitung','Project management'],['712','Bedarfsplanung','Requirements planning'],
      ['713','Projektsteuerung','Project steering'],['714','Sicherheits- und Gesundheitsschutzkoordination','Health and safety coordination'],
      ['715','Vergabeverfahren','Award procedure'],['719','Sonstiges zu KG 710','Miscellaneous for KG 710'],
    ] },
    { code: '720', labelDe: 'Vorbereitung der Objektplanung', labelEn: 'Preparation of object planning', subCodes: [
      ['721','Untersuchungen','Investigations'],['722','Wertermittlungen','Valuations'],
      ['723','Städtebauliche Leistungen','Urban planning services'],['724','Landschaftsplanerische Leistungen','Landscape planning services'],
      ['725','Wettbewerbe','Competitions'],['729','Sonstiges zu KG 720','Miscellaneous for KG 720'],
    ] },
    { code: '730', labelDe: 'Objektplanung', labelEn: 'Project planning', subCodes: [
      ['731','Gebäude und Innenräume','Buildings and interiors'],['732','Außenanlagen','Outdoor facilities'],
      ['733','Ingenieurbauwerke','Civil engineering structures'],['734','Verkehrsanlagen','Transport facilities'],
      ['739','Sonstiges zu KG 730','Miscellaneous for KG 730'],
    ] },
    { code: '740', labelDe: 'Fachplanung', labelEn: 'Specialised planning', subCodes: [
      ['741','Tragwerksplanung','Structural design'],['742','Technische Ausrüstung','Technical equipment'],
      ['743','Bauphysik','Building physics'],['744','Geotechnik','Geotechnics'],
      ['745','Ingenieurvermessung','Engineering surveying'],['746','Lichttechnik, Tageslichttechnik','Lighting technology, daylight technology'],
      ['747','Brandschutz','Fire protection'],['748','Altlasten, Kampfmittel, kulturhistorische Funde','Contaminated sites, explosive ordnance, cultural-historical finds'],
      ['749','Sonstiges zu KG 740','Miscellaneous for KG 740'],
    ] },
    { code: '750', labelDe: 'Künstlerische Leistungen', labelEn: 'Artistic performances', subCodes: [
      ['751','Kunstwettbewerbe','Art competitions'],['752','Honorare','Fees'],
      ['759','Sonstiges zu KG 750','Miscellaneous for KG 750'],
    ] },
    { code: '760', labelDe: 'Allgemeine Baunebenkosten', labelEn: 'General ancillary construction costs', subCodes: [
      ['761','Gutachten und Beratung','Expertise and consulting'],['762','Prüfungen, Genehmigungen, Abnahmen','Tests, authorisations, approvals'],
      ['763','Betriebskosten','Operating costs'],['764','Bemusterungskosten','Sampling costs'],
      ['765','Betriebskosten nach Abnahme','Operating costs after acceptance'],['766','Versicherungen','Insurances'],
      ['769','Sonstiges zu KG 760','Miscellaneous for KG 760'],
    ] },
    { code: '790', labelDe: 'Sonstige Baunebenkosten', labelEn: 'Other ancillary construction costs', subCodes: [
      ['791','Bestandsdokumentation','Inventory documentation'],['799','Sonstiges zu KG 790','Miscellaneous for KG 790'],
    ] },
  ] },
  { worksheet: 'DIN-276-16', kgCode: '800', entries: [
    { code: '810', labelDe: 'Finanzierungsnebenkosten', labelEn: 'Ancillary financing costs', subCodes: [] },
    { code: '820', labelDe: 'Fremdkapitalzinsen', labelEn: 'Interest on borrowed capital', subCodes: [] },
    { code: '830', labelDe: 'Eigenkapitalzinsen', labelEn: 'Interest on equity', subCodes: [] },
    { code: '840', labelDe: 'Bürgschaften', labelEn: 'Guarantees', subCodes: [] },
    { code: '890', labelDe: 'Sonstige Finanzierungskosten', labelEn: 'Other financing costs', subCodes: [] },
  ] },
];

const esc = (s: string) => s.replace(/'/g, "''");

function genSql(kg: KG): string {
  const tag = `din276_subs_${kg.kgCode}`;
  let sql = `-- DIN-276 KG ${kg.kgCode} — restructure inputs into KG ${kg.kgCode[0]}NN sub-sections\n`;
  sql += `DO $${tag}$\n`;
  sql += `DECLARE\n`;
  sql += `  v_wt_id uuid;\n`;
  sql += `  v_sec_c_id uuid;\n`;
  sql += `  v_sub_id uuid;\n`;
  sql += `BEGIN\n`;
  sql += `  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt\n`;
  sql += `    JOIN standards s ON s.id = wt.standard_id\n`;
  sql += `    WHERE s.code = 'DIN-276' AND wt.code = '${kg.worksheet}';\n`;
  sql += `  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet ${kg.worksheet} not found'; END IF;\n`;
  sql += `  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';\n`;
  sql += `  IF v_sec_c_id IS NULL THEN RAISE EXCEPTION 'Section C missing for ${kg.worksheet}'; END IF;\n\n`;

  for (const sec of kg.entries) {
    const secCode = `KG ${sec.code}`;
    sql += `  -- ${secCode} — ${esc(sec.labelDe)}\n`;
    sql += `  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = '${secCode}';\n`;
    sql += `  IF v_sub_id IS NULL THEN\n`;
    sql += `    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)\n`;
    sql += `      VALUES (v_wt_id, v_sec_c_id, '${secCode}', '${esc(sec.labelDe)}', '${esc(sec.labelEn)}', ${parseInt(sec.code, 10)})\n`;
    sql += `      RETURNING id INTO v_sub_id;\n`;
    sql += `  END IF;\n`;

    if (sec.subCodes.length === 0) {
      // Leaf 2nd-level — move the single field kg_NN0 itself
      sql += `  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_${sec.code}';\n`;
    } else {
      const inputSyms = sec.subCodes.map(([c]) => `'kg_${c}'`).join(', ');
      sql += `  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN (${inputSyms});\n`;
      sql += `  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_${sec.code}_total';\n`;
    }
    sql += `\n`;
  }

  sql += `END\n$${tag}$;\n`;
  return sql;
}

const outDir = '.tmp-din276-subsections';
mkdirSync(outDir, { recursive: true });

let totalNewSections = 0;
for (const kg of KG_SPECS) {
  const sql = genSql(kg);
  const path = join(outDir, `${kg.worksheet}.sql`);
  writeFileSync(path, sql, 'utf8');
  totalNewSections += kg.entries.length;
  console.log(`✓ ${path} — ${kg.entries.length} sub-sections`);
}
console.log(`\nTotal: ${totalNewSections} new sub-sections across ${KG_SPECS.length} worksheets`);
