# -*- coding: utf-8 -*-
"""Trigger AI Builder Space deployment."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "deploy-config.json").read_text(encoding="utf-8"))


def load_token() -> str:
    token = os.environ.get("AI_BUILDER_TOKEN")
    if token:
        return token.strip()
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("AI_BUILDER_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("AI_BUILDER_TOKEN not found in env or .env")


def main() -> None:
    token = load_token()
    branch = sys.argv[1] if len(sys.argv) > 1 else CONFIG.get("branch", "main")
    body = {
        "repo_url": CONFIG["repo_url"],
        "service_name": CONFIG["service_name"],
        "branch": branch,
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        "https://space.ai-builders.com/backend/v1/deployments",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            print(f"STATUS {resp.status}")
            print(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        print(f"STATUS {exc.code}")
        print(exc.read().decode("utf-8"))
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
