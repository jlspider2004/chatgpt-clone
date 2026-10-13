# -*- coding: utf-8 -*-
"""Check AI Builder Space deployment status."""
from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "deploy-config.json").read_text(encoding="utf-8"))


def load_token() -> str:
    token = os.environ.get("AI_BUILDER_TOKEN")
    if token:
        return token.strip()
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("AI_BUILDER_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("AI_BUILDER_TOKEN missing")


def main() -> None:
    token = load_token()
    name = CONFIG["service_name"]
    req = urllib.request.Request(
        f"https://space.ai-builders.com/backend/v1/deployments/{name}",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        print(json.dumps(json.loads(resp.read().decode("utf-8")), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
