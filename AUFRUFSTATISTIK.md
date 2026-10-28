# Aufrufstatistik – Integrationskandidat vom 28. Oktober 2026

Vorbereitet, noch nicht aktiviert. Veröffentlichung separat im Arbeitsstand nachweisen. Bestehende firestore.rules unverändert; traffic-config.js bleibt enabled:false. Keine aktuellen Besucherzahlen verfügbar.

## Fertige Komponenten
- Startseite: freiwillige Zustimmung, maximal eine Anfrage pro geladenem Dokument, kein Cookie, localStorage, Nutzerkonto oder Geräte-Identifier; Ablehnen und Fehler blockieren die Website nicht.
- Daten: trafficDaily/{UTC-Tagesnummer}, genau day und count. Atomarer Firestore-Transform verhindert verlorene Inkremente bei parallelen Anfragen. Keine Roh-IP, Referrer, URLs, Namen oder Zahlungsreferenzen in dieser Sammlung. Der Anbieter erhält dennoch technische Verbindungsdaten.
- Private Anzeige im vorhandenen Betreiberbereich mit bestehender Google-Anmeldung: 30 Tage, Summe, fehlende Messdaten, Tageslimit. Neue Abfrage nur auf Klick; Ausloggen entfernt Werte und verhindert verspätete Anzeige.
- Separate Regeldatei als geprüfter Kandidat; bestehende produktive Regeln werden nicht ersetzt. Nur Tageszähler können um eins erhöht werden; Besucher dürfen Statistiken nicht lesen, historische Tage nicht beschreiben und keine Zusatzfelder einschleusen. Private Buchungen und Altbestand bleiben unter bestehenden Regeln.

## Ehrliche Grenzen
Dies ist eine Statistik freiwillig zugelassener Aufrufe, keine vollständige Besucherzahl. Zustimmung, Werbeblocker, Verbindungsfehler und eine falsche Geräteuhr beeinflussen die Zählung. Kein Wiederholungsversuch nach unklarer Netzwerkantwort verhindert zusätzliche automatische Zählung. Neuladen kann erneut zählen. Manipulierte direkte Anfragen können Zahlen erhöhen; die Obergrenze von 2.000 pro UTC-Tag begrenzt erfolgreiche Schreiboperationen, ist aber KEIN vollständiger Bot- oder DoS-Schutz. Abgelehnte Anfragen/Netzwerktraffic lassen sich dadurch nicht begrenzen. Statistiken nie für Zahlungen, Einwilligung oder verbindliche Reichweitenaussagen nutzen.

Spark unverändert erhalten. Firebase nennt 20.000 kostenlose Dokument-Schreiboperationen je Tag mit Reset nach Pacific-Zeit: https://firebase.google.com/docs/firestore/quotas . Durch abweichende Tagesgrenzen können bis zu zwei UTC-Zähler-Tage in ein Abrechnungsfenster fallen. Das Tageslimit garantiert nicht die Verfügbarkeit anderer Projektfunktionen unter Angriff.

## Vor Aktivierung
1. Konkrete Firebase-Vertragsfrage und Datenschutzhinweise für den zusätzlichen Besucheraufruf klären; die Hinweise kennzeichnen den Zähler derzeit an beiden Textstellen als deaktiviert und müssen vor Aktivierung um Zweck, Einwilligung, Empfänger, Speicherdauer und technische Verbindungsdaten ergänzt werden.
2. Reale aktuelle Regeln sichern, Diff mit Kandidat prüfen. Sicherheitsrelevante Freigabe unmittelbar vor Regelveröffentlichung einholen. Keine pauschale Besucher-Schreibfreigabe.
3. Kandidat erst nach bestandenen Emulatorprüfungen übernehmen, danach gezielter produktiver Test mit ausdrücklich als Test dokumentiertem Zählaufruf. enabled erst nach Regel- und Datenschutzauslieferung umstellen; keine anderen Startschalter ändern.
4. Leere Tage bleiben unbekannt. Testaufrufe nicht als echte Besucher ausgeben. Nach Aktivierung Dashboard, Ablehnung und Fehlerpfad live prüfen. Bei Fehlern enabled:false und ursprüngliche Regeln wiederherstellen; vorhandene Buchungsdaten unberührt.

## Supportstand
Google antwortete am 28.10.2026, 09:18 Uhr Berlin: technische Unterstützung kann Vertragsberechtigung nicht bestätigen, verweist auf Cloud Sales. https://cloud.google.com/contact/ zeigte in diesem Browser auch nach Neuladen „Site Unavailable“. Formular nicht versendet. PayPal-Support verlangt Anmeldung; keine neue Chatnachricht versendet.

## Durchgeführte Prüfungen
5 Offline-Zählertests und 16 bestehende Zahlungs-/Dialogtests bestanden. 15 Emulatorprüfungen bestanden: 10 bestehende Betreiber-/Buchungsprüfungen gegen den neuen Regelkandidaten sowie 5 Zählerprüfungen (Parallelität, Leseschutz, Feld-/Tagprüfung, Limit/Manipulation, private Zugriffe, echter REST-Commit). JavaScript-Syntax und Git-Diff geprüft. Keine produktiven Zählanfragen; kein echter mobiler oder angemeldeter Dashboard-Browsertest behauptet.
