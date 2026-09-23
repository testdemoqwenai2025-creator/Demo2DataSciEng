#!/usr/bin/env python3
"""Trigger the sync-to-public workflow manually + check status."""
import sys, json, time, urllib.request, urllib.error

GH_PAT = sys.argv[1]
OWNER = "testdemoqwenai2025-creator"
REPO = "AppDataSci-Advanced"
WORKFLOW = "sync-to-public.yml"
API = f"https://api.github.com/repos/{OWNER}/{REPO}"
HDR = {
    "Authorization": f"token {GH_PAT}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
}

def api(method, url, data=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers=HDR)
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read().decode()
            return r.status, (json.loads(text) if text else {})
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

print("== Triggering sync-to-public workflow on private repo ==")
status, body = api("POST", f"{API}/actions/workflows/{WORKFLOW}/dispatches", {"ref": "main"})
print(f"   Dispatch returned HTTP {status} ({'OK - workflow queued' if status == 204 else body})")

print("\n== Waiting for workflow run to start ==", flush=True)
for _ in range(15):
    time.sleep(2)
    status, runs = api("GET", f"{API}/actions/runs?per_page=3")
    if runs.get("workflow_runs"):
        latest = runs["workflow_runs"][0]
        if latest["name"] == "Mirror to public preview repo":
            print(f"   Found run #{latest['run_number']} (id={latest['id']}) status={latest['status']} conclusion={latest.get('conclusion')}")
            print(f"   URL: {latest['html_url']}")
            break
else:
    print("   Workflow not visible yet — may take a few more seconds")

print("\n== Recent workflow runs on private repo ==")
status, runs = api("GET", f"{API}/actions/runs?per_page=5")
for r in runs.get("workflow_runs", []):
    print(f"   - {r['name']} #{r['run_number']} | {r['status']} | {r.get('conclusion','-')} | {r['html_url']}")

print("\n== Repo summary ==")
status, priv = api("GET", f"https://api.github.com/repos/{OWNER}/{REPO}")
status_pub, pub = api("GET", f"https://api.github.com/repos/{OWNER}/DemoAppDataSci")
print(f"   Private: {priv.get('html_url')}  (size={priv.get('size')}KB, private={priv.get('private')})")
print(f"   Public:  {pub.get('html_url')}  (size={pub.get('size')}KB, private={pub.get('private')})")
