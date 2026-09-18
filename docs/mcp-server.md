# MCP-Server — EKOWAI in der Claude-App

Ein Ingenieur trägt in der Claude-App eine URL ein, meldet sich mit seinem
normalen EKOWAI-Konto an und kann danach Projekte anlegen, Arbeitsblätter
befüllen und den Stand abfragen, ohne die App zu öffnen. Der typische Anlass ist
eine Kundenmail: Angaben hineinkopieren, Claude ordnet sie den Feldern zu, der
Ingenieur prüft das Ergebnis in der App.

## Wie die Anmeldung funktioniert

Es gibt **keinen eigenen OAuth-Server**. Supabase Auth ist seit Dezember 2025
ein vollwertiger OAuth-2.1-Provider nach MCP-Spezifikation und übernimmt
Discovery, Client-Registrierung und Tokens. Der Ablauf:

1. Claude ruft `/api/mcp` auf und bekommt `401` mit Verweis auf
   `/.well-known/oauth-protected-resource`.
2. Dort steht die Supabase-Projekt-URL als Authorization Server.
3. Claude registriert sich dort selbst (Dynamic Client Registration) und
   schickt den Ingenieur auf `/oauth/consent`.
4. Nach „Zugriff erlauben" (`/api/oauth/decision`) erhält Claude ein Token.
5. Jeder Werkzeugaufruf kommt mit diesem Token; `verifyMcpToken` löst es gegen
   GoTrue zum Nutzer auf.

**Der Zugriff ist nicht weiter gehend als im Browser.** Jedes Werkzeug prüft
`resolveProjectAccess` und verlangt `scope: 'internal'`. Externe Beteiligte
(Kunden, Planungsbüros) können über MCP nichts sehen, was sie in der App nicht
sehen könnten.

## Der Kniff mit der Identität

Die rund 73 Server-Actions ermitteln den Nutzer über `createClient()` aus
`@/lib/supabase/server`, das die Session aus Cookies liest. Eine MCP-Anfrage hat
keine Cookies, sondern ein Bearer-Token. Statt alle Actions umzuschreiben,
öffnet die MCP-Route einen `AsyncLocalStorage`-Bereich
(`src/lib/mcp/auth-context.ts`), den `createClient()` **vor** den Cookies prüft.
Damit lösen die bestehenden Actions unverändert denselben Nutzer auf wie im
Browser.

`AsyncLocalStorage` gilt pro Aufrufkette — zwei gleichzeitige Anfragen sehen
jeweils ihren eigenen Nutzer. Das darf **niemals** durch eine Modulvariable
ersetzt werden; das würde die Identität eines Anfragenden an andere ausliefern.

## Supabase-Konfiguration (erledigt)

Der OAuth-2.1-Server der Prod-Instanz `vadsmshzebefjreqcicl` ist **aktiv**,
Authorization Path und Dynamic Client Registration sind gesetzt. Gegengeprüft
am Discovery-Dokument:

```
https://vadsmshzebefjreqcicl.supabase.co/auth/v1/.well-known/oauth-authorization-server
→ 200, registration_endpoint: .../auth/v1/oauth/clients/register, PKCE S256
```

**Der Issuer ist `<projekt>.supabase.co/auth/v1`, nicht die nackte Projekt-URL.**
Genau diesen Wert trägt `src/app/.well-known/oauth-protected-resource/route.ts`
als Authorization Server ein. Auf Root-Ebene (`<projekt>.supabase.co/.well-known/…`)
antwortet Supabase mit 404 — wer dort sucht, hält das Feature fälschlich für
abgeschaltet.

Wenn sich an dieser Konfiguration etwas ändern muss: **nur über das Dashboard**
(Authentication → OAuth Server). Der Supabase-MCP hat dafür kein Werkzeug, und
der `config.toml`-Weg der CLI gilt ausschließlich für lokale Instanzen.

> ⚠️ **Niemals `supabase config push` gegen dieses Projekt.** Die
> `supabase/config.toml` im Repo ist die lokale Dev-Konfiguration und enthält
> `site_url = "http://127.0.0.1:3000"`. Ein Push würde das auf Produktion
> schreiben und alle Magic-Link-Logins brechen.

> Dynamic Client Registration erlaubt es *jedem* MCP-Client, sich zu
> registrieren. Der Zugriff entsteht erst durch die bewusste Zustimmung eines
> angemeldeten Ingenieurs auf der Consent-Seite — deshalb nennt diese Seite
> Anwendungsname und Rückleitungsziel. Registrierte Clients stehen in
> `auth.oauth_clients` und sollten gelegentlich durchgesehen werden.

## Anschließen (pro Ingenieur)

In der Claude-App unter Connectors einen eigenen Connector hinzufügen, mit der
URL `https://<umgebung>/api/mcp`. Den Rest — Registrierung, Login, Zustimmung —
führt die App selbst durch.

## Verfügbare Werkzeuge

| Werkzeug | Zweck |
|---|---|
| `list_projects` | Projekte des Ingenieurs, liefert die `projectId` |
| `get_project` | Stammdaten samt zugeordneter Normen |
| `create_project` | Neues Projekt in der eigenen Organisation |
| `list_standards` | Normbibliothek, liefert den `standardCode` |
| `add_standard_to_project` | Norm zuordnen und Arbeitsblätter anlegen |
| `remove_standard_from_project` | Norm entfernen (mit Begründung) |
| `archive_project` | Archivieren bzw. reaktivieren |
| `list_worksheets` | Arbeitsblätter des Projekts, liefert die `instanceId` |
| `get_worksheet` | Felder mit Einheit, Typ, Auswahlwerten und aktuellem Wert |
| `set_field_values` | Werte schreiben, mit Zitat und Kundenangabe-Markierung |
| `flag_uncertain_value` | Mehrdeutige Angabe zur Klärung vormerken |
| `get_standard_progress` | Fortschritt und nächster Schritt je Norm |
| `get_document_links` | PDF-Links (Bericht, Konformitätserklärung, …) |
| `transition_worksheet` | Status ändern (einreichen, genehmigen, …) |

### Herkunft von Werten

`set_field_values` nimmt je Wert ein `sourceQuote` — den wörtlichen Satz aus der
Kundenunterlage. Er wird als Zitat am Feld hinterlegt (`citation_sources`, mit
dem `label:`-Präfix für Klartextquellen) und das Feld als **Kundenangabe**
markiert (`client_supplied`), was die AGB-Haftungsabgrenzung für vom Kunden
gelieferte Eingabefehler auslöst. Der Beleg hängt damit am Feld, nicht im
Chatverlauf.

Bleibt eine Angabe mehrdeutig — „Teich ca. 80 m²" kann Wasserfläche oder
Gesamtanlage sein —, ist `flag_uncertain_value` das richtige Werkzeug: es
schreibt **keinen** Wert, sondern hinterlegt die Rückfrage am Feld.

## Was bewusst nicht automatisch passiert

- **Kein Genehmigen im Vorbeigehen.** `transition_worksheet` kann einreichen und
  genehmigen, aber die Werkzeugbeschreibung weist das Modell an, das nur auf
  ausdrückliche Anweisung zu tun. Genehmigung bleibt Ingenieursentscheidung.
- **Keine Werte ohne Typprüfung.** `toFieldValue` lehnt „80 m²" für ein
  Zahlenfeld ab, statt es still zu 80 zu verkürzen — die Einheit könnte eine
  andere sein als die des Feldes.
- **Kein Schreiben in genehmigte Arbeitsblätter.** Die bestehende Schreibsperre
  aus `saveWorksheet` gilt unverändert.

## Noch nicht abgedeckt

Kosten, Angebote, CO2-Bilanz, Monitoring, Aufwandserfassung, Leads,
Dokumenten-Upload und die Verifikations-Workflows haben noch keine Werkzeuge.
Die Infrastruktur trägt sie — ein weiteres Werkzeug ist ein `defineTool`-Aufruf
über der vorhandenen Action.
