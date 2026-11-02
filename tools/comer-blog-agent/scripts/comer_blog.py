#!/usr/bin/env python3
"""Small client for the CoMer Merchandising blog agent API (stdlib only).

Usage:
  python comer_blog.py blog <payload.json> [--cover <image>] [--image <file1> [--image <file2>]] [--dry-run]
      -> creates a DRAFT blog post; --cover uploads the image and sets "cover";
         each --image uploads one illustration and replaces the placeholder
         "![caption](image:N)" in "content" (N = 1, 2 in the order given)
  python comer_blog.py upload <image>
      -> uploads one cover image and prints its URL (rarely needed)

Prefer --cover over uploading separately and copying the URL by hand: the URL
never passes through the shell (Git Bash on Windows rewrites arguments that
start with "/", e.g. "/api/blog-images/..." -> "C:/Program Files/Git/api/...").

Environment:
  COMER_CONTENT_API_KEY  the agent key (same value as CONTENT_AGENT_KEY on the
                         server). On Windows the user-level variable is also
                         read, so a fresh `setx` works without restarting.
                         The key is never printed.
  COMER_API_BASE         optional, defaults to https://comernganhmay.online/api/agent
                         (use http://localhost:3002/api/agent for local tests).
"""
import base64
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.request

DEFAULT_BASE = "https://comernganhmay.online/api/agent"
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024
REQUIRED = ("title", "slug", "category", "excerpt", "content")
MAX_ILLUSTRATIONS = 2
# An image paragraph in content: "![caption](url)" alone on its own line.
IMAGE_LINE = re.compile(r"^!\[([^\]]*)\]\((\S+)\)$", re.M)
mimetypes.add_type("image/webp", ".webp")


def env(name):
    value = os.environ.get(name)
    if not value and sys.platform == "win32":
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
                value = winreg.QueryValueEx(k, name)[0]
        except OSError:
            value = None
    return value


def get_key():
    key = env("COMER_CONTENT_API_KEY")
    if not key:
        sys.exit("ERROR: COMER_CONTENT_API_KEY is not set. Ask the user to set it; do not ask them to paste it in chat.")
    return key


def base_url():
    return (env("COMER_API_BASE") or DEFAULT_BASE).rstrip("/")


def post(path, payload):
    req = urllib.request.Request(
        base_url() + path,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": "Bearer " + get_key(),
            "Content-Type": "application/json",
            "User-Agent": "comer-blog-agent/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            print(f"HTTP {resp.status}")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"HTTP {e.code}\n{body}")
        sys.exit(1)
    except urllib.error.URLError as e:
        sys.exit(f"ERROR: cannot reach {base_url()}: {e.reason}")


def valid_cover(url):
    return isinstance(url, str) and (url.startswith("/api/blog-images/") or url.startswith("https://"))


def upload(path, dry_run=False):
    if not os.path.isfile(path):
        sys.exit(f"ERROR: image not found: {path}")
    mime = mimetypes.guess_type(path)[0]
    if mime not in ALLOWED_TYPES:
        sys.exit(f"ERROR: {path} is {mime}; only PNG, JPEG, WEBP, GIF are supported (convert HEIC first)")
    size = os.path.getsize(path)
    if size > MAX_BYTES:
        sys.exit(f"ERROR: {path} is {size // 1024} KB; the server accepts at most 5 MB. Resize or compress it first.")
    filename = os.path.basename(path).lower().replace(" ", "-")
    if dry_run:
        url = f"/api/blog-images/DRYRUN-{filename}"
        print(f"[dry-run] would upload {path} -> {url}")
        return url
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode("ascii")
    result = post("/upload", {"filename": filename, "dataUrl": f"data:{mime};base64,{data}"})
    url = result.get("url")
    if not valid_cover(url):
        sys.exit(f"ERROR: upload returned an unexpected URL: {result}")
    print(f"Uploaded {path} -> {url}")
    return url


def check_payload(payload):
    missing = [k for k in REQUIRED if not str(payload.get(k) or "").strip()]
    payload["content"] = str(payload.get("content") or "").strip()  # the server trims it too
    if missing:
        sys.exit(f"ERROR: payload is missing {missing}")
    if len(payload["title"]) > 200:
        sys.exit("ERROR: title is longer than 200 characters")
    if len(payload["excerpt"]) > 300:
        sys.exit("ERROR: excerpt is longer than 300 characters")
    if len(payload["content"]) > 50000:
        sys.exit("ERROR: content is longer than 50,000 characters")
    if payload["content"].lstrip().startswith("# "):
        sys.exit("ERROR: content starts with a '# ' H1; the page already shows the title. Remove it.")
    for caption, url in IMAGE_LINE.findall(payload["content"]):
        if not (re.fullmatch(r"image:\d", url) or valid_cover(url)):
            sys.exit(f"ERROR: illustration URL {url!r} is not allowed; use a placeholder image:N with --image, or an https:// URL.")
        if not caption.strip():
            sys.exit(f"ERROR: illustration {url!r} has no caption; write ![Chú thích ngắn]({url}).")
    if payload.get("cover") and not valid_cover(payload["cover"]):
        sys.exit("ERROR: cover must start with /api/blog-images/ or https://. Use --cover to upload a local file.")
    payload.pop("published", None)  # the agent API always creates drafts


def check_illustrations(content, images):
    """Placeholders image:1..image:N in content must match the --image files exactly."""
    if len(images) > MAX_ILLUSTRATIONS:
        sys.exit(f"ERROR: at most {MAX_ILLUSTRATIONS} --image illustrations per post")
    used = sorted({int(n) for n in re.findall(r"\]\(image:(\d)\)", content)})
    expected = list(range(1, len(images) + 1))
    if used != expected:
        sys.exit(f"ERROR: content has placeholders {['image:%d' % n for n in used]} but {len(images)} --image file(s) were given; "
                 f"each --image needs exactly one '![Chú thích](image:N)' line, numbered from 1.")
    for n in used:
        if content.count(f"](image:{n})") != 1:
            sys.exit(f"ERROR: placeholder image:{n} appears more than once")


def create(json_path, covers, images, dry_run=False):
    with open(json_path, encoding="utf-8") as f:
        payload = json.load(f)
    if len(covers) > 1:
        sys.exit("ERROR: a blog post takes only one --cover")
    check_payload(payload)
    check_illustrations(payload["content"], images)
    if covers:
        payload["cover"] = upload(covers[0], dry_run)
    for n, image in enumerate(images, start=1):
        url = upload(image, dry_run)
        payload["content"] = payload["content"].replace(f"](image:{n})", f"]({url})")
    if dry_run:
        print("[dry-run] payload that would be sent to " + base_url() + "/blog:")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    result = post("/blog", payload)
    print(json.dumps({k: v for k, v in result.items() if k != "content"}, ensure_ascii=False, indent=2))

    problems = []
    if result.get("content") != payload["content"]:
        problems.append("content (with illustration URLs) differs from what was sent")
    if payload.get("cover") and result.get("cover") != payload.get("cover"):
        problems.append(f"cover is {result.get('cover')!r}, expected {payload.get('cover')!r}")
    if result.get("published") is not False:
        problems.append("post is not a draft")
    if problems:
        print("WARNING: created, but the response does not match: " + "; ".join(problems))
        sys.exit(2)
    print(f"OK: created draft '{result.get('slug')}' (id {result.get('id')})")


def main(argv):
    if len(argv) < 2 or argv[0] not in ("upload", "blog"):
        sys.exit(__doc__)
    cmd, path, rest = argv[0], argv[1], argv[2:]
    dry_run = "--dry-run" in rest
    if cmd == "upload":
        upload(path, dry_run)
        return
    covers = [rest[i + 1] for i, a in enumerate(rest) if a == "--cover" and i + 1 < len(rest)]
    images = [rest[i + 1] for i, a in enumerate(rest) if a == "--image" and i + 1 < len(rest)]
    create(path, covers, images, dry_run)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1:])
