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
        return f"{pre}{_num(spec['r'][0], d0, lang)}–{_num(spec['r'][1], d1, lang)}{u}"
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
            if key in src[k] and not src[k][key].startswith("https://"):
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


def build_case(c, engine, ui_all, env, ver, write=True):
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
        ct, cht = t_raw["chart_tide"], c["charts"]["tide"]
        chart_tide = {"title": ct["title"], "sub": R(ct["sub"]),
                      "rows": [{"label": ct["rows"][i], "color": r["color"], "w": round(r["share"] * 100, 1),
                                "val": fmt(nums[r["val"]], lang)} for i, r in enumerate(cht["rows"])]}
        cl, chl = t_raw["chart_tilt"], c["charts"]["tilt"]
        chart_tilt = {"title": cl["title"], "sub": R(cl["sub"]), "note": R(cl["note"]),
                      "axis": [f"{a}°" for a in chl["axis"]],
                      "rows": [{"label": cl["rows"][i], "color": r["color"],
                                "w": round(r["width"] / chl["axis_max"] * 100, 1),
                                "val": fmt(nums[r["val"]], lang)} for i, r in enumerate(chl["rows"])]}
        sources = []
        for k in c["source_order"]:
            s = src[k]
            urls = [s[u] for u in ("url", "url2") if u in s]
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
            c=c, t=t, exhibits=exhibits, chart_tide=chart_tide, chart_tilt=chart_tilt, sources=sources,
            sec_m=ui["sec_m"][c["dominant_label"]], toc=toc, img=img, claims_line=claims_line,
            updated=date_str(c["updated"], ui), posts=c.get("posts", []), channels=CHANNELS, related=[])
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


def update_sitemap(groups, today):
    """Keep the existing site entries, replace the generated ones, add hreflang alternates."""
    sm = SITE / "sitemap.xml"
    old = sm.read_text(encoding="utf-8")
    keep = [u for u in re.findall(r"<url>.*?</url>", old, re.S) if "/cases/" not in u]
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
            build_case(c, engine, ui_all, env, "0", write=False)   # rendering errors count as check errors
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
            shutil.copyfile(srcdir / in_name, dst / out_name)
        build_case(c, engine, ui_all, env, ver)
    build_archive(cases, ui_all, env, ver)
    update_sitemap([(archive_paths(), "0.8")] + [(case_paths(c["case"]), "0.9") for c, _ in cases], date.today().isoformat())
    print(f"BUILT: {len(cases)} case page(s) + archive, {len(LANGS)} languages each; sitemap updated")


if __name__ == "__main__":
    main()
