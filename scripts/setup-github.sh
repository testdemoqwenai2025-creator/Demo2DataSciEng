#!/usr/bin/env bash
# =====================================================================
# End-to-end GitHub setup for the Northwind Data Platform reference.
# Usage: scripts/setup-github.sh <github_pat>
#
# Steps performed:
#   1. Verify PAT by hitting /user
#   2. Create the public  repo: DemoAppDataSci
#   3. Create the private repo: AppDataSci-Advanced
#   4. Add both as git remotes on the local working copy
#   5. Push current main branch to the private repo (source of truth)
#   6. Push the same commit to the public repo (initial mirror)
#   7. Configure the SYNC_TO_PUBLIC_PAT secret on the private repo
#      so the .github/workflows/sync-to-public.yml workflow can mirror
#      future pushes automatically.
#   8. Trigger the sync workflow once to validate the end-to-end loop.
# =====================================================================
set -euo pipefail

GH_PAT="${1:-}"
if [[ -z "$GH_PAT" ]]; then
  echo "ERROR: usage: $0 <github_pat>"
  exit 2
fi
shift || true

OWNER="testdemoqwenai2025-creator"
API="https://api.github.com"
API_HDR=(-H "Authorization: token ${GH_PAT}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")
GIT_AUTHOR_NAME="testdemoqwenai2025-creator"
GIT_AUTHOR_EMAIL="testdemoqwenai2025@gmail.com"

REPO_PRIVATE="AppDataSci-Advanced"
REPO_PUBLIC="DemoAppDataSci"

PRIVATE_URL="https://${OWNER}:${GH_PAT}@github.com/${OWNER}/${REPO_PRIVATE}.git"
PUBLIC_URL="https://${OWNER}:${GH_PAT}@github.com/${OWNER}/${REPO_PUBLIC}.git"

cd "$(dirname "$0")/.."

echo "== 1) Verifying token =="
USER_JSON=$(curl -s "${API_HDR[@]}" "${API}/user")
LOGIN=$(echo "$USER_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('login',''))" 2>/dev/null || echo "")
if [[ -z "$LOGIN" ]]; then
  echo "Token verification FAILED. Response:"
  echo "$USER_JSON" | head -c 400; echo
  exit 1
fi
echo "   Authenticated as: $LOGIN"

# Helper that creates a repo if it doesn't exist
ensure_repo() {
  local name="$1" description="$2" private="$3"
  echo
  echo "== Creating ${name} (private=${private}) =="
  RESPONSE=$(curl -s -X POST "${API_HDR[@]}" "${API}/user/repos" \
    -d "{\"name\":\"${name}\",\"description\":\"${description}\",\"private\":${private},\"auto_init\":false,\"has_issues\":true,\"has_wiki\":false}")
  HTML_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('html_url',''))" 2>/dev/null || echo "")
  ERR_MSG=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null || echo "")
  ERR_CODE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('errors',[{}])[0].get('code','') if isinstance(d.get('errors'),list) and d.get('errors') else '')" 2>/dev/null || echo "")
  if [[ -n "$HTML_URL" ]]; then
    echo "   Created: $HTML_URL"
  elif [[ "$ERR_MSG" == *"already exists"* || "$ERR_CODE" == "already_exists" ]]; then
    echo "   Already exists - will reuse"
    HTML_URL="https://github.com/${OWNER}/${name}"
    echo "   URL: $HTML_URL"
  else
    echo "   Failed: $ERR_MSG ($ERR_CODE)"
    echo "$RESPONSE" | head -c 400; echo
    exit 1
  fi
}

echo
echo "== 2) Creating repositories =="
ensure_repo "$REPO_PUBLIC"  "Public preview mirror - Northwind Data Platform reference architecture (synthetic data). No NDA required for browsing." "false"
ensure_repo "$REPO_PRIVATE" "Private source-of-truth - Northwind Data Platform reference architecture. Mirrored to DemoAppDataSci on every push to main." "true"

echo
echo "== 3) Configuring local git =="
git config user.name  "$GIT_AUTHOR_NAME"
git config user.email "$GIT_AUTHOR_EMAIL"
git config init.defaultBranch main

# Remove existing remotes (idempotent re-runs)
git remote remove private  2>/dev/null || true
git remote remove public   2>/dev/null || true
git remote remove origin   2>/dev/null || true

git remote add private "$PRIVATE_URL"
git remote add public  "$PUBLIC_URL"
echo "   Remotes:"
git remote -v | sed 's/^/   /'

echo
echo "== 4) Pushing to PRIVATE repo ($REPO_PRIVATE) =="
git push -u private main 2>&1 | sed 's/^/   /' || {
  echo "   Push failed - retrying with --force-with-lease (first push safety)"
  git push --force-with-lease -u private main 2>&1 | sed 's/^/   /'
}

echo
echo "== 5) Pushing to PUBLIC repo ($REPO_PUBLIC) =="
git push --force-with-lease public main 2>&1 | sed 's/^/   /'

echo
echo "== 6) Configuring SYNC_TO_PUBLIC_PAT secret on $REPO_PRIVATE =="
# Fetch the repo's public key for encrypting secrets
KEY_JSON=$(curl -s "${API_HDR[@]}" "${API}/repos/${OWNER}/${REPO_PRIVATE}/actions/secrets/public-key")
KEY_ID=$(echo "$KEY_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('key_id',''))" 2>/dev/null || echo "")
KEY_VAL=$(echo "$KEY_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('key',''))" 2>/dev/null || echo "")
if [[ -z "$KEY_ID" || -z "$KEY_VAL" ]]; then
  echo "   Could not fetch public key. Response:"
  echo "$KEY_JSON" | head -c 400; echo
  echo "   Skipping secret setup. You'll need to add SYNC_TO_PUBLIC_PAT manually."
else
  echo "   Public key fetched (id=$KEY_ID)"
  ENCRYPTED=$(python3 - "$GH_PAT" "$KEY_VAL" <<'PY'
import sys, base64
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import load_pem_public_key

pat, pub_b64 = sys.argv[1], sys.argv[2]
pub_pem = base64.b64decode(pub_b64)
pub = load_pem_public_key(pub_pem)
ciphertext = pub.encrypt(pat.encode(), padding.PKCS1v15())
print(base64.b64encode(ciphertext).decode())
PY
)
  if [[ -z "$ENCRYPTED" ]]; then
    echo "   Encryption failed - skipping secret setup."
  else
    SECRET_RESP=$(curl -s -o /tmp/secret_resp.json -w "%{http_code}" -X PUT "${API_HDR[@]}" \
      "${API}/repos/${OWNER}/${REPO_PRIVATE}/actions/secrets/SYNC_TO_PUBLIC_PAT" \
      -d "{\"encrypted_value\":\"${ENCRYPTED}\",\"key_id\":\"${KEY_ID}\"}")
    if [[ "$SECRET_RESP" == "201" || "$SECRET_RESP" == "204" ]]; then
      echo "   Secret SYNC_TO_PUBLIC_PAT configured (HTTP $SECRET_RESP)"
    else
      echo "   Secret setup returned HTTP $SECRET_RESP"
      cat /tmp/secret_resp.json | head -c 400; echo
    fi
  fi
fi

echo
echo "== 7) Triggering the sync workflow manually (validation) =="
# Push the workflow file (it's already in HEAD from the commit), then trigger it
WORKFLOW_RESP=$(curl -s -X POST "${API_HDR[@]}" \
  "${API}/repos/${OWNER}/${REPO_PRIVATE}/actions/workflows/sync-to-public.yml/dispatches" \
  -d '{"ref":"main"}')
echo "   Workflow dispatch sent. Response: ${WORKFLOW_RESP:-<empty - 204 OK>}"

echo
echo "== 8) Final state =="
echo "   Private: https://github.com/${OWNER}/${REPO_PRIVATE}"
echo "   Public:  https://github.com/${OWNER}/${REPO_PUBLIC}"
echo
echo "   Local commits on main:"
git log --oneline -5 | sed 's/^/     /'

echo
echo "✓ All done."
