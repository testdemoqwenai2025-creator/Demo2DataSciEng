#!/usr/bin/env python3
"""
Set SYNC_FROM_PRIVATE_PAT secret on Demo2DataSciEng so that the
sync-from-private.yml workflow can pull from AppDataSci-Advanced.

Uses the same classic PAT already embedded in the local git remote
URLs (it has 'repo' scope — sufficient for read on AppDataSci-Advanced
and for write on Demo2DataSciEng via the workflow's GITHUB_TOKEN).

Encrypts the secret with the repo's public key (libsodium sealed box)
and PUTs it via the GitHub Actions secrets API.
"""
import base64
import json
import subprocess
import sys
import urllib.request

from nacl import public, encoding

OWNER = "testdemoqwenai2025-creator"
PUBLIC_REPO = "Demo2DataSciEng"
SECRET_NAME = "SYNC_FROM_PRIVATE_PAT"


def git_token_for_remote(remote: str) -> str:
    url = subprocess.check_output(
        ["git", "config", "--get", f"remote.{remote}.url"],
        text=True,
    ).strip()
    # URL format: https://USER:TOKEN@github.com/USER/REPO.git
    if "@" not in url:
        raise RuntimeError(f"remote {remote} URL has no embedded token: {url}")
    creds, _ = url.split("@", 1)[0].split("://", 1)[1], None
    # Split off the protocol prefix first.
    protocol_split = url.split("://", 1)
    if len(protocol_split) != 2:
        raise RuntimeError(f"unexpected remote url: {url}")
    creds = protocol_split[1].split("@", 1)[0]
    user, _, token = creds.partition(":")
    if not token:
        raise RuntimeError(f"no token in remote url: {url}")
    return token


def api(method: str, path: str, token: str, body: dict | None = None) -> dict:
    url = f"https://api.github.com/repos/{OWNER}/{PUBLIC_REPO}/{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        if resp.status in (200, 201, 204):
            text = resp.read().decode()
            return json.loads(text) if text else {}
    raise RuntimeError(f"unexpected status: {resp.status}")


def main() -> int:
    token = git_token_for_remote("private")
    print(f"Using PAT of length {len(token)} (starts {token[:4]}...)")

    # 1. Fetch repo public key for Actions secrets encryption.
    pub_key_data = api("GET", "actions/secrets/public-key", token)
    pub_key_id = pub_key_data["key_id"]
    pub_key_b64 = pub_key_data["key"]
    print(f"Public key id: {pub_key_id}")

    pub_key = public.PublicKey(pub_key_b64.encode(), encoding.Base64Encoder())
    sealed_box = public.SealedBox(pub_key)

    # 2. Encrypt the secret value (the PAT itself).
    encrypted = sealed_box.encrypt(token.encode())
    encrypted_b64 = base64.b64encode(encrypted).decode()

    # 3. PUT the secret.
    api(
        "PUT",
        f"actions/secrets/{SECRET_NAME}",
        token,
        body={
            "encrypted_value": encrypted_b64,
            "key_id": pub_key_id,
        },
    )
    print(f"✅ Set secret {SECRET_NAME} on {OWNER}/{PUBLIC_REPO}")

    # 4. Verify by listing secrets.
    secrets = api("GET", "actions/secrets", token)
    print(f"Secrets now on {PUBLIC_REPO}: {secrets['total_count']}")
    for s in secrets.get("secrets", []):
        print(f"  - {s['name']} (created {s['created_at']})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
