"""Case packs: for every case and language, a ZIP with the printable summary (PDF), each felt chart (PNG),
the chart data and the sources (CSV) and a short README. Run after build_cases.py (which writes the pack pages
into _mock/pack/). Uses headless Chrome for PDF and PNG, served by a throw-away local web server.

    python _build/make_packs.py
"""
import csv, functools, html as htmlmod, http.server, io, json, re, socketserver, subprocess, sys, threading, zipfile
from PIL import Image
import numpy as np
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
BUILD = SITE / "_build"
OUT = SITE / "packs"
PACKS = SITE / "_mock" / "pack"
CHROME = next(p for p in [Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
                          Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")] if p.exists())
LANGS = ["en", "it", "de", "es", "fr"]
README = {
 "en": "Pandas Lab case pack - Case {n}\n\nInside:\n- summary.pdf: the whole case (question, evidence, model, verdict, every source with its link)\n- chart_*.png: the felt charts, in high resolution\n- data.csv: the values behind the charts and the list of sources with their certainty labels\n\nFree for personal and classroom use with credit (Pandas Lab, pandaslab.it). Not for resale.\nThe case online: {url}\n",
 "it": "Fascicolo Pandas Lab - Caso {n}\n\nContiene:\n- summary.pdf: il caso completo (domanda, prove, modello, verdetto, ogni fonte con il suo link)\n- chart_*.png: i grafici in feltro, in alta risoluzione\n- data.csv: i valori dei grafici e l'elenco delle fonti con le etichette di certezza\n\nGratuito per uso personale e in classe, citando la fonte (Pandas Lab, pandaslab.it). Non rivendibile.\nIl caso online: {url}\n",
 "de": "Pandas-Lab-Fallpaket - Fall {n}\n\nInhalt:\n- summary.pdf: der ganze Fall (Frage, Beweise, Modell, Urteil, jede Quelle mit Link)\n- chart_*.png: die Filzdiagramme in hoher Auflösung\n- data.csv: die Werte der Diagramme und die Quellenliste mit ihren Sicherheitsetiketten\n\nKostenlos für den privaten Gebrauch und den Unterricht mit Quellenangabe (Pandas Lab, pandaslab.it). Kein Weiterverkauf.\nDer Fall online: {url}\n",
 "es": "Expediente de Pandas Lab - Caso {n}\n\nContiene:\n- summary.pdf: el caso completo (pregunta, pruebas, modelo, veredicto, cada fuente con su enlace)\n- chart_*.png: los gráficos de fieltro en alta resolución\n- data.csv: los valores de los gráficos y la lista de fuentes con sus etiquetas de certeza\n\nGratis para uso personal y en clase, citando la fuente (Pandas Lab, pandaslab.it). Prohibida la reventa.\nEl caso en línea: {url}\n",
 "fr": "Dossier Pandas Lab - Affaire {n}\n\nContenu :\n- summary.pdf : l'affaire complète (question, preuves, modèle, verdict, chaque source avec son lien)\n- chart_*.png : les graphiques en feutre, en haute résolution\n- data.csv : les valeurs des graphiques et la liste des sources avec leurs étiquettes de certitude\n\nGratuit pour un usage personnel et en classe, avec mention de la source (Pandas Lab, pandaslab.it). Revente interdite.\nL'affaire en ligne : {url}\n",
}


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=str(SITE))
    srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


def chrome(*args):
    subprocess.run([str(CHROME), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--run-all-compositor-stages-before-draw",
                    "--virtual-time-budget=6000", *args], check=True, capture_output=True, timeout=120)


def strip(s):
    return htmlmod.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def main():
    sys.path.insert(0, str(BUILD))
    OUT.mkdir(exist_ok=True)
    srv, port = serve()
    base = f"http://127.0.0.1:{port}"
    tmp = PACKS / "_out"
    tmp.mkdir(parents=True, exist_ok=True)
    for cdir in sorted(p for p in PACKS.iterdir() if p.is_dir() and p.name.isdigit()):
        n = cdir.name
        case = json.loads((BUILD / "cases" / f"{n}.json").read_text(encoding="utf-8"))
        for lang in LANGS:
            page = cdir / f"{lang}.html"
            if not page.exists():
                continue
            pdf = tmp / f"{n}_{lang}.pdf"
            chrome("--no-pdf-header-footer", f"--print-to-pdf={pdf}", f"{base}/_mock/pack/{n}/{lang}.html")
            pngs = []
            for cp in sorted(cdir.glob(f"{lang}_chart_*.html")):
                key = cp.stem.split("_chart_")[1]
                png = tmp / f"{n}_{lang}_chart_{key}.png"
                chrome(f"--screenshot={png}", "--window-size=1500,1100", "--force-device-scale-factor=1",
                       f"{base}/_mock/pack/{n}/{cp.name}")
                im = Image.open(png).convert("RGB")     # trim the empty felt under the chart
                a = np.asarray(im).max(2).max(1)
                rows = np.nonzero(a > 200)[0]
                if len(rows):
                    im.crop((0, 0, im.width, min(im.height, int(rows[-1]) + 36))).save(png, optimize=True)
                pngs.append((key, png))
            # data.csv from the rendered pack page (same numbers the reader sees) + the source list
            html = page.read_text(encoding="utf-8")
            buf = io.StringIO()
            w = csv.writer(buf)
            w.writerow(["section", "item", "value", "bar_percent_of_axis"])
            for fig in re.findall(r'<figure class="fchart.*?</figure>', html, re.S):
                title = strip(re.search(r'class="fc-title">(.*?)</div>', fig, re.S).group(1))
                for lab, wv, val in re.findall(r'class="fc-lab">(.*?)</span>.*?<i class="fc-bar" style="--w:([\d.]+)%"></i>.*?class="fc-val">(.*?)</span>', fig, re.S):
                    w.writerow([title, strip(lab), strip(val), wv])
            w.writerow([])
            w.writerow(["claim", "certainty_label", "source", "links", "read"])
            for li in re.findall(r"<li><b>(C\d+)</b> <span class=\"label[^\"]*\">(\w+)</span>.*?<span class=\"cite\">(.*?)</span>(.*?)</li>", html, re.S):
                claim, label, cite, rest = li
                links = " ".join(htmlmod.unescape(u) for u in re.findall(r'href="([^"]+)"', rest))
                name, _, read = strip(cite).rpartition(" · ")
                w.writerow([claim, label, name, links, read.split(":", 1)[-1].strip()])
            url = "https://pandaslab.it" + (f"/cases/{n}/" if lang == "en" else f"/{lang}/cases/{n}/")
            zp = OUT / f"pandaslab-case-{n}-{lang}.zip"
            with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
                z.write(pdf, "summary.pdf")
                for key, png in pngs:
                    z.write(png, f"chart_{key}.png")
                z.writestr("data.csv", "\ufeff" + buf.getvalue())
                z.writestr("README.txt", README[lang].format(n=n, url=url))
            print(zp.name, f"{zp.stat().st_size // 1024} KB", flush=True)
    srv.shutdown()


if __name__ == "__main__":
    main()
