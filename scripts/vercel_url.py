"""Print the production URL from a Vercel --json deploy log."""

import json
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text()
start = text.find("{")
data = json.loads(text[start:])
deployment = data.get("deployment") or {}
url = deployment.get("productionUrl") or deployment.get("url") or data.get("url") or ""
if url and not url.startswith("http"):
    url = "https://" + url
if not url:
    raise SystemExit("no url in " + sys.argv[1])
print(url.rstrip("/"))
