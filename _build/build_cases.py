"""Pandas Lab — Case pages for pandaslab.it, generated from the case files.

    python _build/build_cases.py            build every case in _build/cases/ (5 languages) + archive + sitemap
    python _build/build_cases.py --check    run only the consistency check, write nothing

Rules:
- Facts, certainty labels and URLs come from the ENGINE case file (Motore Vox/cases/caseNNN.json), read-only.
- Numbers exist only in the case's "numbers" block and appear in the texts as {name} (or {name|count} to animate).
- [LABEL] in a text becomes a certainty patch; labels stay in English in every language.
- The build STOPS if any language differs from English in: placeholders, labels, digits, list lengths, or if a
  claim/label/URL does not match the engine case file.
"""
import html, json, re, shutil, sys
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

BUILD = Path(__file__).resolve().parent
SITE = BUILD.parent
ROOT = SITE.parent                      # "Little big PANDA"
BASE = "https://pandaslab.it"
LANGS = ["en", "de", "es", "it", "fr"]
LANG_NAMES = {"en": "English", "de": "Deutsch", "es": "Español", "it": "Italiano", "fr": "Français"}
OG_LOCALE = {"en": "en_US", "de": "de_DE", "es": "es_ES", "it": "it_IT", "fr": "fr_FR"}
LABELS = ["OBSERVED", "ESTIMATE", "SIMULATION", "SCENARIO", "HYPOTHESIS"]
SEP = {"en": (".", ","), "de": (",", "."), "es": (",", "."), "it": (",", "."), "fr": (",", " ")}
CHANNELS = [  # the same official profiles linked in the footer of the current site
    {"name": "YouTube", "url": "https://www.youtube.com/@pandaslab_data"},
    {"name": "Instagram", "url": "https://www.instagram.com/pandaslab_data/"},
    {"name": "TikTok", "url": "https://www.tiktok.com/@pandaslab_data"},
]
PH = re.compile(r"\{([a-z0-9_]+)(\|count)?\}")
LB = re.compile(r"\[(" + "|".join(LABELS) + r")\]")
TAG = re.compile(r"<[^>]+>")


class CheckError(Exception):
    pass


# ---------- numbers ----------
def _num(v, d, lang):
    ds, ts = SEP[lang]
    s = f"{v:,.{d}f}"                      # 41,000.0 -> python style
    s = s.replace(",", "\x00").replace(".", ds).replace("\x00", ts)
    if lang == "es" and abs(v) < 10000 and d == 0:   # RAE: no separator for 4-digit numbers
        s = s.replace(ts, "")
    return s


def fmt(spec, lang):
    if "raw" in spec:
        return spec["raw"]
    pre, u = spec.get("pre", ""), spec.get("u", "")
    if lang in ("de", "fr", "es", "it") and u == "%":
        u = " %" if lang in ("de", "fr") else "%"
    if "r" in spec:
        d = spec.get("d", 0)
        d0, d1 = (d if isinstance(d, list) else [d, d])
        return f"{pre}{_num(spec['r'][0], d0, lang)}{spec.get('sep', '–')}{_num(spec['r'][1], d1, lang)}{u}"
    return f"{pre}{_num(spec['v'], spec.get('d', 0), lang)}{u}"


def render(s, lang, nums):
    def ph(m):
        name, count = m.group(1), m.group(2)
        if name not in nums:
            raise CheckError(f"unknown number {{{name}}}")
        spec, txt = nums[name], fmt(nums[name], lang)
        if count and "v" in spec:
            pre, u = spec.get("pre", ""), txt[len(spec.get("pre", "")):]
            core = _num(spec["v"], spec.get("d", 0), lang)
            rest = u[len(core):]
            return f'{html.escape(pre)}<span data-to="{spec["v"]}" data-dec="{spec.get("d", 0)}" data-ds="{SEP[lang][0]}">{core}</span>{rest}'
        return txt
    out = PH.sub(ph, s)
    out = LB.sub(lambda m: f'<span class="label l-{m.group(1).lower()}">{m.group(1)}</span>', out)
    if lang == "fr":   # French typography: thin no-break space before ; : ! ?
        out = re.sub(r" ([;:!?])", " \\1", out)
    return out


# ---------- consistency check ----------
def _signature(s):
    phs = sorted(m.group(1) for m in PH.finditer(s))
    lbs = sorted(LB.findall(s))
    bare = TAG.sub("", LB.sub("", PH.sub("", s)))
    digits = sorted(re.findall(r"\d+", bare))
    return phs, lbs, digits


def check_case(c, engine):
    errs = []
    src = {s["claim"]: s for s in engine.get("sources", [])}
    nums = c["numbers"]
    en = c["i18n"]["en"]

    def walk(a, b, path, lang):
        if isinstance(a, dict):
            if set(a) != set(b):
                errs.append(f"[{lang}] {path}: keys differ {sorted(set(a) ^ set(b))}")
            for k in a:
                if k in b:
                    walk(a[k], b[k], f"{path}.{k}", lang)
        elif isinstance(a, list):
            if len(a) != len(b):
                errs.append(f"[{lang}] {path}: {len(b)} items, EN has {len(a)}")
            for i, (x, y) in enumerate(zip(a, b)):
                walk(x, y, f"{path}[{i}]", lang)
        elif isinstance(a, str):
            sa, sb = _signature(a), _signature(b)
            for what, x, y in zip(("numbers", "labels", "digits"), sa, sb):
                if x != y:
                    errs.append(f"[{lang}] {path}: {what} differ  EN={x}  {lang.upper()}={y}")
            for m in PH.finditer(b):
                if m.group(1) not in nums:
                    errs.append(f"[{lang}] {path}: unknown number {{{m.group(1)}}}")

    for lang in LANGS:
        if lang not in c["i18n"]:
            errs.append(f"missing language {lang}")
            continue
        walk(en, c["i18n"][lang], "i18n", lang)

    # claims, labels, URLs against the engine case file
    for x in c["exhibits"]:
        if x["claim"] not in src:
            errs.append(f"exhibit {x['claim']}: not in engine sources")
    for k in c["source_order"]:
        if k not in src:
            errs.append(f"source {k}: not in engine sources")
            continue
        if src[k]["label"] not in LABELS:
            errs.append(f"source {k}: unknown label {src[k]['label']}")
        for key in ("url", "url2"):
            if src[k].get(key) and not src[k][key].startswith("https://"):
                errs.append(f"source {k}: {key} is not https")
        if k not in en["src"]:
            errs.append(f"source {k}: no description")
    missing = set(src) - set(c["source_order"])
    if missing:
        errs.append(f"engine claims not shown on the page: {sorted(missing)}")
    if c["dominant_label"] not in LABELS:
        errs.append("dominant_label is not a certainty label")
    return errs


# ---------- build ----------
def read_kind(c, s):
    o = c.get("read_override", {}).get(s["claim"])
    if o:
        return o
    r = s.get("read", "")
    if "ABSTRACT" in r.upper():
        return "abstract"
    return "full" if r else "data"


def date_str(iso, ui):
    d = date.fromisoformat(iso)
    return ui["date_fmt"].format(d=d.day, M=ui["months"][d.month - 1], y=d.year)


def case_paths(num):
    return {l: (f"/cases/{num}/" if l == "en" else f"/{l}/cases/{num}/") for l in LANGS}


def archive_paths():
    return {l: ("/cases/" if l == "en" else f"/{l}/cases/") for l in LANGS}


def js_safe(obj):
    """JSON for an inline <script>: no '</' sequence can close the tag."""
    return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")


def host(u):
    return re.sub(r"^https://(www\.)?", "", u).split("/")[0]


def build_case(c, engine, ui_all, env, ver, write=True, pool=None):
    num, nums = c["case"], c["numbers"]
    src = {s["claim"]: s for s in engine["sources"]}
    alts = case_paths(num)
    img = f"/img/cases/{num}"
    built = {}
    for lang in LANGS:
        t_raw, ui = c["i18n"][lang], ui_all[lang]
        R = lambda s: render(s, lang, nums)
        t = json.loads(json.dumps(t_raw))
        for k in ("title_html", "lede", "q_h2", "q_note", "e_h2", "m_h2", "v_h2", "f_h2", "w_h2"):
            t[k] = R(t[k])
        for k in ("q_p", "m_p", "v_p"):
            t[k] = [R(p) for p in t[k]]
        exhibits = []
        for i, x in enumerate(c["exhibits"]):
            tx = t_raw["ex"][i]
            s = src[x["claim"]]
            exhibits.append({"claim": x["claim"], "label": s["label"], "img": x["img"], "alt": tx["alt"],
                             "big": R(tx.get("big", x.get("big", ""))), "text": R(tx["text"]),
                             "name": c["source_names"][x["claim"]], "url": s["url"], "host": host(s["url"])})
        # charts drawn in code: "e" sits in The Evidence, "m" in the model section; numbers only from "numbers"
        charts = {}
        for key, cd in c.get("charts", {}).items():
            ct = t_raw["chart_" + key]
            rows = []
            for i, r in enumerate(cd["rows"]):
                w = r["share"] * 100 if "share" in r else r["width"] / cd["axis_max"] * 100
                rows.append({"label": ct["rows"][i], "color": r["color"], "w": round(w, 1), "val": fmt(nums[r["val"]], lang)})
            charts[key] = {"title": ct["title"], "sub": R(ct["sub"]), "note": R(ct["note"]) if ct.get("note") else "",
                           "axis": [f"{a}{cd.get('axis_u', '')}" for a in cd.get("axis", [])], "rows": rows}
        sources = []
        for k in c["source_order"]:
            s = src[k]
            urls = [s[u] for u in ("url", "url2") if s.get(u)]
            sources.append({"claim": k, "label": s["label"], "desc": R(t_raw["src"][k]), "name": c["source_names"][k],
                            "urls": urls, "read": ui["read_" + read_kind(c, s)]})
        labels_used = sorted({s["label"] for s in engine["sources"]})
        claims_line = ui["claims"].format(n=len(engine["sources"]), m=len(labels_used))
        jsonld = js_safe({"@context": "https://schema.org", "@type": "Article", "headline": t_raw["title"],
                          "description": t_raw["description"], "inLanguage": lang, "dateModified": c["updated"],
                          "image": BASE + f"{img}/{c['images']['og']}", "url": BASE + alts[lang],
                          "publisher": {"@type": "Organization", "name": "Pandas Lab", "url": BASE + "/"},
                          "citation": [u for s in sources for u in s["urls"]]})
        toc = [{"id": "q", "n": "01", "name": ui["sec_q"]}, {"id": "e", "n": "02", "name": ui["sec_e"]},
               {"id": "m", "n": "03", "name": ui["sec_m"][c["dominant_label"]]}, {"id": "v", "n": "04", "name": ui["sec_v"]},
               {"id": "f", "n": "05", "name": ui["sec_f"]}, {"id": "w", "n": "06", "name": ui["sec_w"]}]
        page = env.get_template("case.html").render(
            lang=lang, langs=LANGS, lang_names=LANG_NAMES, ui=ui, base=BASE, alts=alts, alts_json=js_safe(alts),
            prefix="" if lang == "en" else f"/{lang}", page_kind="case", ver=ver,
            seo_title=t_raw["seo_title"], og_title=t_raw["title"], description=t_raw["description"], og_type="article",
            og_image=f"{img}/{c['images']['og']}", og_locale=OG_LOCALE[lang], jsonld=jsonld,
            c=c, t=t, exhibits=exhibits, charts=charts, sources=sources,
            sec_m=ui["sec_m"][c["dominant_label"]], toc=toc, img=img, claims_line=claims_line,
            updated=date_str(c["updated"], ui), posts=c.get("posts", []), channels=CHANNELS,
            related=[{"href": case_paths(o["case"])[lang], "title": o["i18n"][lang]["title"], "case": o["case"],
                      "cover": f"/img/cases/{o['case']}/{o['images']['cover']}"} for o in (pool or []) if o["case"] != num])
        built[lang] = page
        if write:
            out = SITE / alts[lang].strip("/") / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(page, encoding="utf-8")
    return built


def build_archive(cases, ui_all, env, ver):
    alts = archive_paths()
    for lang in LANGS:
        ui = ui_all[lang]
        files = []
        for c, engine in cases:
            from collections import Counter
            cnt = Counter(s["label"] for s in engine["sources"])
            labels = [c["dominant_label"]] + [l for l, _ in cnt.most_common() if l != c["dominant_label"]][:1]
            files.append({"case": c["case"], "href": case_paths(c["case"])[lang], "title": c["i18n"][lang]["title"],
                          "cover": f"/img/cases/{c['case']}/{c['images']['cover']}", "labels": labels, "status": c["status"]})
        files.sort(key=lambda f: f["case"], reverse=True)
        page = env.get_template("archive.html").render(
            lang=lang, langs=LANGS, lang_names=LANG_NAMES, ui=ui, base=BASE, alts=alts, alts_json=js_safe(alts),
            prefix="" if lang == "en" else f"/{lang}", page_kind="archive", ver=ver,
            seo_title=f"{ui['archive_title']} | Pandas Lab", og_title=ui["archive_title"], description=ui["archive_intro"],
            og_type="website", og_image=files[0]["cover"] if files else "/home-hero.jpg", og_locale=OG_LOCALE[lang],
            jsonld=None, files=files)
        out = SITE / alts[lang].strip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page, encoding="utf-8")


SOCIALS = [  # same official profiles and icons as the current site
    {"name": "YouTube", "url": "https://www.youtube.com/@pandaslab_data", "icon": "M23 7.2a4 4 0 0 0-2.8-2.9C18.2 4 12 4 12 4s-6.2 0-8.2.3A4 4 0 0 0 1 7.2 42 42 0 0 0 .7 12 42 42 0 0 0 1 16.8a4 4 0 0 0 2.8 2.9C5.8 20 12 20 12 20s6.2 0 8.2-.3a4 4 0 0 0 2.8-2.9A42 42 0 0 0 23.3 12 42 42 0 0 0 23 7.2zM9.8 15.5v-7l6 3.5z"},
    {"name": "Instagram", "url": "https://www.instagram.com/pandaslab_data/", "icon": "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.3.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.3.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.2-2.3-.4a3.9 3.9 0 0 1-1.4-.9c-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.9.4-2.3.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.3-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.1a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4zm0 11a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zm8.5-11.3a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0z"},
    {"name": "TikTok", "url": "https://www.tiktok.com/@pandaslab_data", "icon": "M16.6 3c.4 2.1 1.7 3.6 3.9 3.8v2.9c-1.5.1-2.8-.3-4.3-1.2v6.3c0 4.4-3.4 6.6-6.7 5.9-2.6-.5-4.7-2.9-4.5-5.8.2-3.1 2.8-5.3 5.9-5.2l.9.1v3c-.4-.1-.8-.2-1.2-.1-1.4.1-2.5 1.2-2.5 2.6 0 1.5 1.3 2.7 2.8 2.6 1.4-.1 2.4-1.2 2.4-2.8V3h3.3z"},
    {"name": "Facebook", "url": "https://www.facebook.com/1430869260102071", "icon": "M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V5c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7V11H8.3v3h2.4v7h2.8z"},
    {"name": "LinkedIn", "url": "https://www.linkedin.com/company/pandas-lab", "icon": "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9.5 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.5c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21h-4V9z"},
]
WORLDS_NAV = {"en": "Worlds", "it": "Mondi", "de": "Welten", "es": "Mundos", "fr": "Mondes"}


def home_paths():
    return {l: ("/" if l == "en" else f"/{l}/") for l in LANGS}


def build_home(cases, ui_all, env, ver):
    """the investigation room: board with the latest case, the filing cabinet, the drawers, the method"""
    hj = json.loads((BUILD / "ui_home.json").read_text(encoding="utf-8"))
    dj = json.loads((BUILD / "dossiers.json").read_text(encoding="utf-8"))
    geo = json.loads((BUILD / "board_geometry.json").read_text(encoding="utf-8"))
    alts = home_paths()
    latest_c, latest_e = sorted(cases, key=lambda ce: ce[0]["case"])[-1]
    for lang in LANGS:
        ui = dict(ui_all[lang], worlds_nav=WORLDS_NAV[lang])
        h = hj[lang]
        lc = latest_c
        latest = {"case": lc["case"], "title": lc["i18n"][lang]["title"], "href": case_paths(lc["case"])[lang],
                  "cover": f"/img/cases/{lc['case']}/{lc['images']['cover']}", "label": lc["dominant_label"]}
        files = []
        for c, _ in sorted(cases, key=lambda ce: ce[0]["case"], reverse=True):
            files.append({"href": case_paths(c["case"])[lang], "external": False, "img": f"/img/cases/{c['case']}/{c['images']['cover']}",
                          "kind": ui["case"], "n": c["case"], "title": c["i18n"][lang]["title"], "stamp": ui["status"][c["status"]], "navy": False, "wide": False})
        for d in dj["dossiers"]:
            has_page = (BUILD / "dossiers" / f"D{d['n']}.json").exists()
            files.append({"href": dossier_paths(d["n"])[lang] if has_page else d["url"], "external": not has_page, "img": d["thumb"], "kind": h["dossier"], "n": d["n"], "title": d["title"],
                          "stamp": "YOUTUBE", "navy": True, "wide": True})
        worlds = []
        for i, k in enumerate(["space", "earth", "life", "history"]):
            a, l = geo["drawer_areas"][i], geo["drawer_labels"][i]
            aw, ah = a[2] - a[0], a[3] - a[1]
            rel = [round((l[0] - a[0]) / aw * 100, 2), round((l[1] - a[1]) / ah * 100, 2),
                   round((l[2] - l[0]) / aw * 100, 2), round((l[3] - l[1]) / ah * 100, 2)]   # label box inside the drawer, %
            k_fit = round(min(1.0, 5.0 / len(h["w"][k])), 3)        # long words (Geschichte, Histoire) shrink to fit the holder
            pre = "" if lang == "en" else f"/{lang}"
            worlds.append({"name": h["w"][k], "desc": h["wd"][k], "href": pre + dj["world_links"][k], "area": a, "rel": rel, "fit": k_fit})
        method = [{"key": k, "text": h["d"][k]} for k in LABELS]
        jsonld = js_safe({"@context": "https://schema.org", "@type": "WebSite", "name": "Pandas Lab", "url": BASE + "/",
                          "inLanguage": LANGS, "description": h["description"]})
        page = env.get_template("home.html").render(
            lang=lang, langs=LANGS, lang_names=LANG_NAMES, ui=ui, base=BASE, alts=alts, alts_json=js_safe(alts),
            prefix="" if lang == "en" else f"/{lang}", page_kind="home", ver=ver,
            seo_title=h["seo_title"], og_title=h["seo_title"], description=h["description"], og_type="website",
            og_image=latest["cover"], og_locale=OG_LOCALE[lang], jsonld=jsonld,
            h=h, g=geo, latest=latest, files=files, worlds=worlds, method=method, socials=SOCIALS)
        out = SITE / alts[lang].strip("/") / "index.html" if lang != "en" else SITE / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page, encoding="utf-8")


PAGE_KICKER = {
    "stories": {"en": "CASE ARCHIVE · DOSSIERS", "it": "ARCHIVIO DEI CASI · DOSSIER", "de": "FALLARCHIV · DOSSIERS", "es": "ARCHIVO DE CASOS · DOSIERES", "fr": "ARCHIVES · DOSSIERS"},
    "about": {"en": "PERSONNEL FILES", "it": "SCHEDE DEL PERSONALE", "de": "PERSONALAKTEN", "es": "FICHAS DEL PERSONAL", "fr": "DOSSIERS DU PERSONNEL"},
    "shop": {"en": "THE EVIDENCE LOCKER", "it": "L'ARMADIETTO DELLE PROVE", "de": "DER BEWEISSCHRANK", "es": "EL ARMARIO DE PRUEBAS", "fr": "LE CASIER À PREUVES"},
}
PAGE_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSc3-X8BLaDtu4r_aQWDvJe6gLbH7yJetHiXEZn76VxUAYTzuA/viewform"


def page_paths(name):
    return {l: (f"/{name}.html" if l == "en" else f"/{l}/{name}.html") for l in LANGS}


def build_pages(ui_all, env, ver):
    """stories (dossiers), about (personnel files), shop + kit (evidence locker): same URLs as before for EN"""
    old = json.loads((BUILD / "ui_pages_old.json").read_text(encoding="utf-8"))   # translations of the previous site
    hj = json.loads((BUILD / "ui_home.json").read_text(encoding="utf-8"))
    dj = json.loads((BUILD / "dossiers.json").read_text(encoding="utf-8"))
    geo = json.loads((BUILD / "board_geometry.json").read_text(encoding="utf-8"))
    for lang in LANGS:
        o, ui = old[lang], dict(ui_all[lang], worlds_nav=WORLDS_NAV[lang])
        common = dict(lang=lang, langs=LANGS, lang_names=LANG_NAMES, ui=ui, base=BASE, ver=ver, o=o, g=geo,
                      prefix="" if lang == "en" else f"/{lang}", og_type="website", og_locale=OG_LOCALE[lang], jsonld=None,
                      og_image="/assets/board/room_16x9.webp", dossier_word=hj[lang]["dossier"])
        pages = {
            "stories": dict(kicker=PAGE_KICKER["stories"][lang], title=o["st_title"], intro=o["st_intro"],
                            open_file={"en": "Open the file", "it": "Apri il fascicolo", "de": "Akte öffnen", "es": "Abrir el expediente", "fr": "Ouvrir le dossier"}[lang],
                            topics=[{"key": k, "name": o["t_" + k]} for k in ("all", "dino", "space", "map", "evo")],
                            dossiers=[dict(x, page=dossier_paths(x["n"])[lang] if (BUILD / "dossiers" / f"D{x['n']}.json").exists() else None) for x in dj["dossiers"]],
                            coming=dj["coming"]),
            "about": dict(kicker=PAGE_KICKER["about"][lang], title=o["ab_title"], intro=o["ab_intro"],
                          people=[{"name": "Michele Barison", "img": "/michele.jpg", "role": o["m_role"], "bio": o["m_bio"], "stamp": "LAB FOUNDER"},
                                  {"name": "Mike", "img": "/mike.jpg", "role": o["mk_role"], "bio": o["mk_bio"], "stamp": "WOOL TWIN"}],
                          howto=[{"t": o["p1t"], "b": o["p1b"]}, {"t": o["p2t"], "b": o["p2b"]}, {"t": o["p3t"], "b": o["p3b"]}]),
            "shop": dict(kicker=PAGE_KICKER["shop"][lang], title=o["sh_title"], intro=o["sh_intro"], hint=o["howworks"],
                         kits=[{"title": "Pandas Lab Chart Kit", "img": "/chartkit.jpg", "blurb": o["k1_b"], "href": PAGE_FORM, "btn": o["get_btn"], "stamp": o["free"]},
                               {"title": "EP 3 Data Kit · T. rex & the Giants", "img": "https://i.ytimg.com/vi/k_eJcF2WMfw/hqdefault.jpg", "blurb": o["ksoon_b"], "href": None, "btn": o["soon"], "stamp": o["soon"].upper()},
                               {"title": "EP 6 Data Kit · Meteorites", "img": "https://i.ytimg.com/vi/SGAB3sh-rvs/hqdefault.jpg", "blurb": o["ksoon_b"], "href": None, "btn": o["soon"], "stamp": o["soon"].upper()}]),
            "kit": dict(kicker=PAGE_KICKER["shop"][lang], title=o["kd_title"], intro=o["kd_intro"], hint=o["kd_more"],
                        kits=[{"title": "Pandas Lab Chart Kit", "img": "/chartkit.jpg", "blurb": o["k1_b"], "href": "/pandas-lab-chart-kit.zip", "download": True, "btn": o["dl_btn"], "stamp": o["free"]}]),
        }
        for name, extra in pages.items():
            alts = page_paths(name)
            html_ = env.get_template("pages.html").render(page=name, page_kind=name, alts=alts, alts_json=js_safe(alts),
                                                          seo_title=f"{extra['title']} | Pandas Lab", og_title=extra["title"],
                                                          description=extra["intro"], **common, **extra)
            out = SITE / alts[lang].lstrip("/")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html_, encoding="utf-8")


# ---------- DOSSIERS (the long episodes, re-checked) ----------
ERRATA = {
    "en": ("Corrections", "Re-checking the episode against the sources, we found things the published video got wrong or overstated. Here is the correct version."),
    "it": ("Correzioni", "Ricontrollando l'episodio sulle fonti abbiamo trovato punti che il video pubblicato diceva in modo sbagliato o esagerato. Ecco la versione corretta."),
    "de": ("Korrekturen", "Beim erneuten Prüfen der Folge anhand der Quellen haben wir Stellen gefunden, die das veröffentlichte Video falsch oder übertrieben darstellt. Hier ist die korrekte Fassung."),
    "es": ("Correcciones", "Al volver a comprobar el episodio con las fuentes encontramos puntos que el vídeo publicado decía mal o exageraba. Esta es la versión correcta."),
    "fr": ("Corrections", "En revérifiant l'épisode sur les sources, nous avons trouvé des points que la vidéo publiée présentait de façon erronée ou exagérée. Voici la version correcte."),
}
READ_KEY = {"full text": "read_full", "abstract only": "read_abstract", "data": "read_data"}


def _digits(s):
    s = re.sub(r"(?<=\d)[.,   ](?=\d{3}\b)", "", TAG.sub("", s))   # drop thousands separators (locale-neutral)
    return sorted(re.findall(r"\d+", s))


def dossier_files():
    return sorted((BUILD / "dossiers").glob("D*.json"))


def dossier_paths(n):
    return {l: (f"/dossiers/{n}/" if l == "en" else f"/{l}/dossiers/{n}/") for l in LANGS}


def check_dossier(d):
    errs, en = [], d["i18n"]["en"]
    ids = [c["id"] for c in d["claims"]]
    for c in d["claims"]:
        if c["label"] not in LABELS:
            errs.append(f"{c['id']}: bad label {c['label']}")
        for s in c["sources"]:
            if not s["url"].startswith("https://"):
                errs.append(f"{c['id']}: non-https source {s['url']}")
            if s["read"] not in READ_KEY:
                errs.append(f"{c['id']}: unknown reading status {s['read']}")
    for x in d["exhibits"]:
        if x not in ids:
            errs.append(f"exhibit {x} is not a claim")
    for lang in LANGS:
        t = d["i18n"].get(lang)
        if not t:
            errs.append(f"missing language {lang}"); continue
        if set(t["claims"]) != set(ids):
            errs.append(f"[{lang}] claims differ from the claim list")
        if len(t.get("errata", [])) != len(en.get("errata", [])):
            errs.append(f"[{lang}] errata count differs")
        pairs = [("lede", t["lede"], en["lede"]), ("question", t["question"], en["question"]), ("verdict", t["verdict"], en["verdict"])]
        pairs += [(f"claim {k}", t["claims"].get(k, ""), en["claims"][k]) for k in ids]
        pairs += [(f"errata {i}", a, b) for i, (a, b) in enumerate(zip(t.get("errata", []), en.get("errata", [])))]
        for name, a, b in pairs:
            if _digits(a) != _digits(b):
                errs.append(f"[{lang}] {name}: digits differ EN={_digits(b)} {lang.upper()}={_digits(a)}")
    return errs


def build_dossiers(ui_all, env, ver, write=True):
    hj = json.loads((BUILD / "ui_home.json").read_text(encoding="utf-8"))
    built = []
    for f in dossier_files():
        d = json.loads(f.read_text(encoding="utf-8"))
        errs = check_dossier(d)
        if errs:
            raise CheckError(f"Dossier {d['n']}: " + "; ".join(errs))
        alts = dossier_paths(d["n"])
        for lang in LANGS:
            ui, t = dict(ui_all[lang], worlds_nav=WORLDS_NAV[lang]), d["i18n"][lang]
            fr = (lambda s: re.sub(r" ([;:!?])", " \\1", s)) if lang == "fr" else (lambda s: s)
            cl = {c["id"]: c for c in d["claims"]}
            claims = [{"id": c["id"], "short": c["id"].split("-")[1], "label": c["label"], "text": fr(t["claims"][c["id"]]),
                       "sources": [{"name": s["name"], "url": s["url"], "read": ui[READ_KEY[s["read"]]]} for s in c["sources"]]}
                      for c in d["claims"]]
            exhibits = [{"id": x.split("-")[1], "label": cl[x]["label"], "text": fr(t["claims"][x]), "src": cl[x]["sources"][0]["name"]} for x in d["exhibits"]]
            has_err = bool(t.get("errata"))
            toc = [{"id": "q", "n": "01", "name": ui["sec_q"]}, {"id": "e", "n": "02", "name": ui["sec_e"]}, {"id": "f", "n": "03", "name": ui["sec_f"]}]
            if has_err:
                toc.append({"id": "c", "n": "04", "name": ERRATA[lang][0]})
            toc += [{"id": "v", "n": f"{len(toc) + 1:02d}", "name": ui["sec_v"]}, {"id": "w", "n": f"{len(toc) + 2:02d}", "name": ui["sec_w"]}]
            labels_used = sorted({c["label"] for c in d["claims"]})
            jsonld = js_safe({"@context": "https://schema.org", "@type": "Article", "headline": t["title"], "description": t["lede"],
                              "inLanguage": lang, "dateModified": d["updated"], "url": BASE + alts[lang],
                              "image": f"https://i.ytimg.com/vi/{d['yt']}/hqdefault.jpg",
                              "video": {"@type": "VideoObject", "name": t["title"], "embedUrl": f"https://www.youtube.com/embed/{d['yt']}",
                                        "thumbnailUrl": f"https://i.ytimg.com/vi/{d['yt']}/hqdefault.jpg", "uploadDate": d.get("upload", d["updated"])},
                              "publisher": {"@type": "Organization", "name": "Pandas Lab", "url": BASE + "/"},
                              "citation": sorted({s["url"] for c in d["claims"] for s in c["sources"]})})
            page = env.get_template("dossier.html").render(
                lang=lang, langs=LANGS, lang_names=LANG_NAMES, ui=ui, base=BASE, alts=alts, alts_json=js_safe(alts),
                prefix="" if lang == "en" else f"/{lang}", page_kind="case", ver=ver,
                seo_title=f"{t['title']} | {hj[lang]['dossier']} {d['n']} | Pandas Lab", og_title=t["title"], description=t["lede"],
                og_type="article", og_image=f"https://i.ytimg.com/vi/{d['yt']}/hqdefault.jpg", og_locale=OG_LOCALE[lang],
                jsonld=jsonld, d=d, t={**t, "lede": fr(t["lede"]), "question": fr(t["question"]), "verdict": fr(t["verdict"]),
                                         "errata": [fr(e) for e in t.get("errata", [])]},
                dossier_word=hj[lang]["dossier"], stamp="RE-CHECKED", exhibits=exhibits, claims=claims, toc=toc,
                claims_line=ui["claims"].format(n=len(claims), m=len(labels_used)), updated=date_str(d["updated"], ui),
                errata_title=ERRATA[lang][0], errata_intro=ERRATA[lang][1],
                errata_num="04", verdict_num=f"{4 + has_err:02d}", watch_num=f"{5 + has_err:02d}")
            if write:
                out = SITE / alts[lang].strip("/") / "index.html"
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_text(page, encoding="utf-8")
        built.append(d["n"])
    return built


def update_sitemap(groups, today):
    """Keep the existing site entries, replace the generated ones, add hreflang alternates."""
    sm = SITE / "sitemap.xml"
    old = sm.read_text(encoding="utf-8")
    generated = {BASE + p for alts, _ in groups for p in alts.values()}
    keep = [u for u in re.findall(r"<url>.*?</url>", old, re.S)
            if "/cases/" not in u and re.search(r"<loc>(.*?)</loc>", u).group(1) not in generated]
    new = []
    for alts, prio in groups:
        links = "".join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{BASE}{alts[l]}"/>' for l in LANGS)
        links += f'<xhtml:link rel="alternate" hreflang="x-default" href="{BASE}{alts["en"]}"/>'
        for l in LANGS:
            new.append(f"<url><loc>{BASE}{alts[l]}</loc><lastmod>{today}</lastmod><priority>{prio}</priority>{links}</url>")
    body = "\n  ".join(keep + new)
    sm.write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                  'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n  ' + body + "\n</urlset>\n", encoding="utf-8")


def main():
    only_check = "--check" in sys.argv
    ui_all = json.loads((BUILD / "ui.json").read_text(encoding="utf-8"))
    env = Environment(loader=FileSystemLoader(BUILD / "templates"), autoescape=True)
    cases, all_errs = [], []
    for f in sorted((BUILD / "cases").glob("*.json")):
        c = json.loads(f.read_text(encoding="utf-8"))
        engine = json.loads((ROOT / c["engine_case"]).read_text(encoding="utf-8"))
        errs = check_case(c, engine)
        try:
            build_case(c, engine, ui_all, env, "0", write=False, pool=[x for x, _ in cases] + [c])   # rendering errors count as check errors
        except (CheckError, KeyError) as e:
            errs.append(f"render: {e!r}")
        all_errs += [f"Case {c['case']}: {e}" for e in errs]
        cases.append((c, engine))
    if all_errs:
        print("CHECK FAILED — nothing written:")
        print("\n".join("  " + e for e in all_errs))
        sys.exit(1)
    print(f"CHECK OK: {len(cases)} case(s) x {len(LANGS)} languages — numbers, labels, digits and sources consistent")
    if only_check:
        return
    ver = date.today().strftime("%Y%m%d")
    (SITE / "assets" / "case").mkdir(parents=True, exist_ok=True)
    for name in ("case.css", "case.js"):
        shutil.copyfile(BUILD / "static" / name, SITE / "assets" / "case" / name)
    for c, engine in cases:
        dst = SITE / "img" / "cases" / c["case"]
        dst.mkdir(parents=True, exist_ok=True)
        srcdir = (SITE / c["images"]["src_dir"]).resolve()
        for out_name, in_name in c["images"]["copy"].items():
            from PIL import Image as _I                       # light copies for the phone: max 900 px wide
            im = _I.open(srcdir / in_name).convert("RGB")
            if im.width > 720:
                im = im.resize((720, round(im.height * 720 / im.width)), _I.LANCZOS)
            im.save(dst / out_name, "JPEG", quality=76, optimize=True, progressive=True)
        build_case(c, engine, ui_all, env, ver, pool=[x for x, _ in cases])
    build_archive(cases, ui_all, env, ver)
    groups = [(archive_paths(), "0.8")] + [(case_paths(c["case"]), "0.9") for c, _ in cases]
    if "--home" in sys.argv:            # the investigation-room home replaces the old one only when asked
        build_home(cases, ui_all, env, ver)
        groups = [(home_paths(), "1.0")] + groups
    if "--dossiers" in sys.argv:        # the long episodes, re-checked, 5 languages
        done = build_dossiers(ui_all, env, ver)
        groups += [(dossier_paths(n), "0.9") for n in done]
    if "--pages" in sys.argv:           # stories / about / shop / kit in the board style, 5 languages
        build_pages(ui_all, env, ver)
        groups += [(page_paths("stories"), "0.9"), (page_paths("shop"), "0.8"), (page_paths("about"), "0.7")]
    update_sitemap(groups, date.today().isoformat())
    print(f"BUILT: {len(cases)} case page(s) + archive, {len(LANGS)} languages each; sitemap updated")


if __name__ == "__main__":
    main()
