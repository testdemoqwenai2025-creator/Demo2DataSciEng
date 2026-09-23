#!/usr/bin/env python3
"""
Configure the SYNC_TO_PUBLIC_PAT secret on the private repo so the
sync-to-public.yml workflow can authenticate to push to the public repo.

Usage: python3 scripts/set-sync-secret.py <github_pat>
"""
import sys, base64, json, urllib.request, urllib.error

GH_PAT = sys.argv[1]
OWNER = "testdemoqwenai2025-creator"
REPO = "AppDataSci-Advanced"
SECRET_NAME = "SYNC_TO_PUBLIC_PAT"
API = f"https://api.github.com/repos/{OWNER}/{REPO}/actions/secrets"

def api(method, url, data=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Authorization": f"token {GH_PAT}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read().decode()
            return r.status, (json.loads(text) if text else {})
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

print("1) Fetching repo public key for secrets encryption...")
status, key_resp = api("GET", f"{API}/public-key")
if status != 200:
    print(f"   Failed (HTTP {status}): {key_resp}")
    sys.exit(1)

key_id = key_resp["key_id"]
pub_b64 = key_resp["key"]
print(f"   Key fetched (id={key_id}, len={len(pub_b64)})")

print("2) Encrypting PAT with NaCl sealed box...")
from nacl import public, encoding
pub_key = public.PublicKey(pub_b64.encode(), encoding.Base64Encoder())
sealed_box = public.SealedBox(pub_key)
ciphertext = sealed_box.encrypt(GH_PAT.encode())
encrypted_b64 = base64.b64encode(ciphertext).decode()
print(f"   Encrypted (cipher len={len(ciphertext)})")

print(f"3) PUT /repos/.../actions/secrets/{SECRET_NAME}...")
status, body = api(
    "PUT",
    f"{API}/{SECRET_NAME}",
    {"encrypted_value": encrypted_b64, "key_id": key_id},
)
if status in (201, 204):
    print(f"   ✓ Secret {SECRET_NAME} configured (HTTP {status})")
else:
    print(f"   ✗ Failed (HTTP {status}): {body}")
    sys.exit(1)

print("\n✓ Secret setup complete. The sync workflow can now authenticate to push to the public repo.")
