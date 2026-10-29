# Bastion · Dämmerwacht

Ein eigenständiges Fantasy-Tower-Defense-Spiel. Dieses Repository enthält die
spielbare Browserdemo **0.2.0** aus dem bereitgestellten Entwicklerpaket.

Wähle eine von fünf Fraktionen, stationiere und verbessere Truppen am Nebelpass
und verteidige deine Bastion gegen wachsende Gegnerwellen. Spielstände werden
zwischen Wellen lokal im Browser gespeichert.

## Demo herunterladen

Die spielbare Version 0.2.0 gibt es ohne Installation als fertigen Download:

- [ZIP mit Demo und Kurzanleitung herunterladen](https://github.com/jo1996-sketch/JJ/raw/refs/heads/main/downloads/Bastion_Demo_0.2.0.zip)
- [Einzelne HTML-Datei herunterladen](https://github.com/jo1996-sketch/JJ/raw/refs/heads/main/downloads/Bastion_Demo_0.2.0.html)

ZIP herunterladen, entpacken und `Bastion_Demo_0.2.0.html` am Computer in
Chrome, Edge, Firefox oder Safari öffnen. Bei einem privaten Repository musst du
bei GitHub mit einem berechtigten Konto angemeldet sein. Auf iPhone/iPad kann die
Dateivorschau das Spiel blockieren.

`downloads/` enthält feste Download-Kopien dieser Version. Nach Änderungen am
Spielcode müssen neue Download-Kopien ausdrücklich erzeugt werden.

## Entwickeln und spielen

Voraussetzungen: **Node.js 24** (siehe `.nvmrc`) und **Python 3**. Das Spiel hat
keine npm-Abhängigkeiten; `npm install` ist nicht erforderlich.

Alle Befehle im Projektverzeichnis ausführen:

```sh
npm test
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Den Entwicklungsserver anschließend im eigenen Browser unter
`http://127.0.0.1:8080` öffnen. Änderungen an HTML, CSS und JavaScript sind nach
dem Neuladen sichtbar. Der Server lässt sich mit `Ctrl+C` beenden.

Die Modulversion benötigt einen Webserver. Für eine einzelne, direkt zu
öffnende HTML-Datei:

```sh
npm run offline
```

Das erzeugt `Bastion_Demo_Offline.html` einschließlich der Grafiken. Die Datei
ist ein generiertes Ergebnis und wird nicht in Git versioniert. Auf dem Desktop
kann sie direkt im Browser geöffnet werden; die Dateivorschau auf iPhone/iPad
kann JavaScript blockieren.

## Bedienung

- Fraktion wählen und „Bastion verteidigen“ starten.
- Truppe wählen, freien Bauplatz antippen und die erste Welle starten.
- Stationierte Truppen auswählen, um sie zu verbessern oder zu verkaufen.
- `1`–`4`: Truppenwahl, `Leertaste`: Pause, `Q`: Bastionsfeuer,
  `Escape`: Auswahl oder Großansicht verlassen.

## Projektstruktur

| Pfad | Inhalt |
| --- | --- |
| `dist/index.html` | Spieloberfläche |
| `dist/engine.js` | Simulation, Fraktionen, Wirtschaft und Wellen |
| `dist/game.js` | Bedienung, Ablauf, Speicherung und Audio |
| `dist/renderer.js` | Canvas-Darstellung und Effekte |
| `dist/style.css`, `dist/polish.css` | Gestaltung und responsives Layout |
| `dist/assets/` | Gebündelte WebP-Grafiken |
| `tests/engine.test.js` | Elf Simulationstests |
| `scripts/offline.mjs` | Erzeugung der Offline-Demo |
| `docs/` | Originalanleitung, Spielkonzept und Grafikdokumentation |
| `downloads/` | Spielbare Download-Kopien der Version 0.2.0 |

`dist/` enthält in diesem Projekt den bearbeitbaren Spielcode und wird deshalb
versioniert. Es ist kein austauschbarer Build-Ordner.

## Projektunterlagen und nächste Schritte

Die Dokumente in `docs/` wurden aus dem ZIP übernommen. Der Masterprompt ist
eine Konzeptgrundlage mit geplanten Funktionen; er beschreibt nicht durchgehend
den bereits implementierten Stand. Die enthaltenen alten Hosting-Links sind
keine Veröffentlichung dieses Repositorys.

Für den nächsten Entwicklungsschritt sind mobile Bedienung, Grafik und
Animationen sowie zusätzliche Spielinhalte vorgesehen. Aktuell ist das Spiel
eine 2.5D-Browserdemo, keine native iPhone-App. Leistung und Bedienung auf echten
Mobilgeräten sowie App-Store-Vorbereitung stehen noch aus.
