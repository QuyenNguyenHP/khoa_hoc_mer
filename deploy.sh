#!/usr/bin/env sh
# Install or update the course site on the server (Docker). Run from anywhere:
#   sh deploy.sh
# Safe to run again: it never touches backend/storage (accounts, orders, blog, uploads, videos).
set -e
cd "$(dirname "$0")"

# 1. Files from the old layout (data kept inside Git) block `git pull`. Back them up, then reset.
old=""
for f in backend/data.json backend/blog.json backend/site-config.json; do
  if [ -f "$f" ] && git ls-files --error-unmatch "$f" >/dev/null 2>&1; then old="$old $f"; fi
done
if [ -n "$old" ]; then
  backup="backup-old-layout-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$backup"; cp $old "$backup"/
  [ -d backend/private ] && cp -r backend/private "$backup"/ || true
  git checkout -- $old
  echo "Old data files backed up to $backup/"
fi

# 2. Get the latest code.
git pull --ff-only

# 3. First run: create .env with secrets and the first admin account.
if [ ! -f .env ]; then
  admin_password=$(openssl rand -hex 8)
  {
    echo "# Secrets for this server. Never commit this file."
    echo "JWT_SECRET=$(openssl rand -hex 32)"
    echo "# First admin account, used only when backend/storage/data.json does not exist yet."
    echo "ADMIN_EMAIL=admin@comernganhmay.online"
    echo "ADMIN_PASSWORD=$admin_password"
    echo "# Key for the Claude blog skill (same value as COMER_CONTENT_API_KEY on your computer). Optional."
    echo "CONTENT_AGENT_KEY="
  } > .env
  chmod 600 .env
  echo ""
  echo "Created .env. First admin login (change the password after signing in):"
  echo "  email:    admin@comernganhmay.online"
  echo "  password: $admin_password"
  echo ""
fi

# 4. Build and (re)start. Data lives in backend/storage on the host.
mkdir -p backend/storage
docker compose up -d --build --remove-orphans

# 5. Quick checks.
sleep 3
docker compose ps
if curl -fsS -o /dev/null http://127.0.0.1:18090; then echo "Site OK on http://127.0.0.1:18090"; else echo "WARNING: site not answering on 127.0.0.1:18090, see: docker compose logs api"; fi
