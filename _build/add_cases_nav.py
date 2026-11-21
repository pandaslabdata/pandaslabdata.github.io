"""One-off (21/11/2026): add "Cases" to the menu and footer of the existing pages, in 5 languages.
Home · Cases · Stories · About · Shop. The link follows the chosen language (/cases/, /it/cases/ ...).
Safe to run twice: pages that already have the link are skipped."""
import json, re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PAGES = ["index.html", "stories.html", "about.html", "shop.html", "kit.html"]
NAME = {"en": "Cases", "de": "Fälle", "es": "Casos", "it": "Casi", "fr": "Affaires"}
LINK = '<a href="/cases/" data-i="nav_cases">Cases</a>'
STORIES = re.compile(r'<a href="stories\.html"[^>]*data-i="nav_stories"[^>]*>')
HOOK = "document.documentElement.lang=l;"
FOLLOW = HOOK + ('document.querySelectorAll(\'a[data-i="nav_cases"]\').forEach(a=>a.href=l==="en"?"/cases/":"/"+l+"/cases/");')

for name in PAGES:
    p = SITE / name
    h = p.read_text(encoding="utf-8")
    if 'data-i="nav_cases"' in h:
        print(f"{name}: already has the link, skipped")
        continue
    n_links = len(STORIES.findall(h))
    h = STORIES.sub(lambda m: LINK + m.group(0), h)
    m = re.search(r"const I18N=(\{.*?\});\n", h, re.S)
    d = json.loads(m.group(1))
    for l, v in NAME.items():
        d[l]["nav_cases"] = v
    h = h[:m.start(1)] + json.dumps(d, ensure_ascii=False) + h[m.end(1):]
    assert h.count(HOOK) == 1, name
    h = h.replace(HOOK, FOLLOW)
    p.write_text(h, encoding="utf-8", newline="")
    print(f"{name}: link added in {n_links} places, 5 languages, follows the language")
