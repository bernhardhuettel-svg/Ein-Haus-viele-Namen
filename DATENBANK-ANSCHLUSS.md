# Datenbankanschluss – 18. Oktober 2026

Vorbereiteter Entwicklungsstand. Noch keine produktive Freischaltung.

## Implementiert und geprüft

- Google-Anmeldung mit sitzungsbezogener Authentifizierung, Betreiberprüfung über owners/{uid}.enabled.
- Private Buchungen, eindeutige Zahlungsreferenzen, unveränderliche Prüfereignisse und bereinigte öffentliche Namenseinträge getrennt.
- Eingang, Namenseinwilligung, Widerruf und dokumentierte Rückzahlung als atomare Firestore-Transaktionen mit gemeinsamem Gesamtstand.
- Gleichzeitige Buchungen erhalten den Gesamtbetrag; erneuter Versuch nur bei nachweislich geändertem gemeinsamen Audit-Marker. Doppelte Referenzen erzeugen keine zweite Buchung.
- Leerer Start wird ausdrücklich als noch nicht abgeglichen angezeigt.
- Altbestand projektDaten/stand und spender bleibt nur für den Betreiber lesbar; keine automatische Übernahme.
- Zehn neue Emulatorfälle bestanden. Zusätzlich bestehende 17 Sicherheitsregressionen mit der neuen Regelfassung geprüft; Ergebnis im Arbeitsstand dokumentiert.

## Reproduzieren

Node.js, Java 21, npm install und npm test. Tests verweigern jeden anderen Firestore-Endpunkt als 127.0.0.1:8087 und verwenden ausschließlich erfundene Daten im demo-Projekt. Firebase SDK 13.0.0 ist für Browser und Tests identisch festgelegt.

## Vor produktivem Anschluss

1. Konkrete Freigabe für Google-Anmeldeanbieter, Domain bernhardhuettel-svg.github.io, ausschließlich Bernhards tatsächliche Auth-UID als Betreiber und diese eingeschränkten Datenzugriffsregeln einholen.
2. Google-Anmeldung aktivieren, Domain hinterlegen, Betreiberseite veröffentlichen und Bernhards tatsächliche Auth-UID über die Anmeldung ermitteln; keine UID erfinden.
3. owners/{uid} mit enabled=true administrativ setzen; geprüfte firestore.rules veröffentlichen. Keine Browser-Selbstfreigabe möglich.
4. Leeren Buchungsbereich über die Betreiberseite initialisieren. Produktiv nur lesend prüfen, keine erfundenen Zahlungen oder Namen eintragen.
5. Öffentlichen Datenabruf und tatsächliche Datenschutzhinweise nach den bestehenden konkreten Dienstprüfungen konsistent aktivieren. Der Startschalter privacyAndServicesVerified bleibt in diesem Stand unverändert false; keine Prüfung wird durch dieses Paket als erledigt behauptet.

PayPal bleibt deaktiviert. Es werden keine Rückzahlungen ausgelöst, sondern ausschließlich schon erfolgte Vorgänge dokumentiert.

## Quellen

Bestehende Homepage: Commit 17e31d89c51d97ad4b6461bbb649aa319f4fa1cb.
Firebase-Konsole am 18.10.2026: Projekt hausprojekt-4aa29, Spark, Datenbank (default), eur3; Altbestand ohne nachgewiesene Zahlung-/Einwilligungsfelder.
Offizielle SDK-Anleitung, geprüft 18.10.2026: https://firebase.google.com/docs/web/alt-setup (Stand 13.10.2026).
Transaktionen: https://firebase.google.com/docs/firestore/manage-data/transactions
Google-Anmeldung: https://firebase.google.com/docs/auth/web/google-signin
