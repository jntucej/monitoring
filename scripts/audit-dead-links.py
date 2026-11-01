#!/usr/bin/env python3
import re, glob, os, json
os.chdir("/opt/monitoring/compose")

def normalize(d):
    parts = [s for s in d.split("/") if s and not (s.startswith("(") and s.endswith(")")) and not s.startswith("[")]
    return "/" + "/".join(parts)

existing = set()
for f in glob.glob("src/app/**/*.tsx", recursive=True):
    if f.endswith("page.tsx"):
        existing.add(normalize(os.path.relpath(os.path.dirname(f), "src/app")))
existing.discard("")

refs = {}
files = glob.glob("src/app/**/*.tsx", recursive=True) + glob.glob("src/components/**/*.tsx", recursive=True) + ["src/lib/page-meta.ts", "src/hooks/useNavigation.ts"]
pats = [r'href="(/[^"{}?#]+)"', r"href: ?'(/[^'{}?#]+)'", r'href: ?"(/[^"{}?#]+)"',
        r'\.push\(\s*[\'"](/[^\'"?#]+)', r'replace\(\s*[\'"](/[^\'"?#]+)']
for f in files:
    if not os.path.exists(f):
        continue
    for i, line in enumerate(open(f), 1):
        for p in pats:
            for m in re.findall(p, line):
                m = m if isinstance(m, str) else m[0]
                base = m.split("?")[0].split("#")[0].rstrip("/") or "/"
                if not any(base == e or e.startswith(base + "/") for e in existing):
                    refs.setdefault(base, set()).add(f)

print(f"TOTAL MISSING: {len(refs)}")
for r in sorted(refs):
    print(f"  {r}")
    for ff in sorted(refs[r]):
        print(f"    - {ff}")
