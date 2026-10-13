# -*- coding: utf-8 -*-
"""Fetch deployment logs from AI Builder Space."""
from __future__ import annotations

import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


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
    req = urllib.request.Request(
        "https://space.ai-builders.com/backend/v1/deployments/kuailv-logistics/logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        print(resp.read().decode("utf-8", errors="replace"))


if __name__ == "__main__":
    main()
