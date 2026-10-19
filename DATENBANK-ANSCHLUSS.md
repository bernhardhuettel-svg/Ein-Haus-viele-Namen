# Datenbankanschluss – 19. Oktober 2026

Der geschützte Betreiberanschluss ist produktiv eingerichtet. Google-Anmeldung, ausschließlich das verifizierte Betreiberkonto, gezielte Firestore-Regeln und leere Initialisierung sind abgeschlossen. Speichern und erneutes Laden wurden live bestätigt. Der Spark-Tarif bleibt erhalten. Öffentliche Besucherabrufe und Zahlungen sind weiterhin deaktiviert.

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

## Tatsächlich abgeschlossen

- Google-Anbieter und Homepage-Domain aktiviert; Betreiberkonto anhand echter Auth-UID zugeordnet.
- Geprüfte Regeln aktiv, keine offenen Client-Schreibrechte; keine automatische Übernahme alter Einträge.
- Veröffentlichung über PR #1, Merge-Commit a3cb55154b97d9345346cba9464cbe2702ace151.
- Initialisierung und erneutes Laden am 19.10.2026 erfolgreich. Keine erfundenen Produktionszahlungen.
- Datenschutzhinweise auf aktuelle Betreiberanmeldung und Datenbanknutzung angepasst. Öffentliche Daten sind technisch von privaten getrennt; ein freigegebener Name wird bereits über den öffentlichen Endpunkt abrufbar.

## Noch offene Startpunkte

Die bestehenden Hinweise zu Vertragspartner/Kontobedingungen und zum privaten Projektmodell sind nicht allein durch einen erfolgreichen technischen Test geklärt. Der öffentliche Startschalter bleibt bis zum belegten Abschluss false. PayPal benötigt den Abgleich des tatsächlichen Kontos, Kontotyps, Verwendungszwecks und der Zahlungsart; keinen fiktiven Nachweis einsetzen.

PayPal bleibt deaktiviert. Es werden keine Rückzahlungen ausgelöst, sondern ausschließlich schon erfolgte Vorgänge dokumentiert.

## Quellen

Bestehende Homepage: Commit 17e31d89c51d97ad4b6461bbb649aa319f4fa1cb.
Firebase-Konsole am 18.10.2026: Projekt hausprojekt-4aa29, Spark, Datenbank (default), eur3; Altbestand ohne nachgewiesene Zahlung-/Einwilligungsfelder.
Offizielle SDK-Anleitung, geprüft 18.10.2026: https://firebase.google.com/docs/web/alt-setup (Stand 13.10.2026).
Transaktionen: https://firebase.google.com/docs/firestore/manage-data/transactions
Google-Anmeldung: https://firebase.google.com/docs/auth/web/google-signin

Datenschutzquellen geprüft am 19.10.2026: https://firebase.google.com/support/privacy/ ; https://firebase.google.com/docs/firestore/locations ; https://firebase.google.com/terms ; https://cloud.google.com/terms/data-processing-addendum .
