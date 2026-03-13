#!/bin/bash
# PAGANINI AIOS — Deploy via SSH
# Usage: ./deploy.sh user@host [branch]

set -euo pipefail

HOST="${1:?Usage: ./deploy.sh user@host [branch]}"
BRANCH="${2:-main}"
REPO_URL="git@github.com:art-182/paganini-aios.git"
REMOTE_DIR="/opt/paganini-aios"

echo "🎻 PAGANINI AIOS — Deploying to ${HOST}"
echo "   Branch: ${BRANCH}"
echo "   Remote: ${REMOTE_DIR}"

# 1. Ensure remote directory exists
ssh "$HOST" "mkdir -p ${REMOTE_DIR}"

# 2. Clone or pull
ssh "$HOST" "
  if [ -d ${REMOTE_DIR}/.git ]; then
    cd ${REMOTE_DIR} && git fetch origin && git checkout ${BRANCH} && git pull origin ${BRANCH}
  else
    git clone -b ${BRANCH} ${REPO_URL} ${REMOTE_DIR}
  fi
"

# 3. Install dependencies
ssh "$HOST" "cd ${REMOTE_DIR} && pip install -e '.[all]' --quiet"

# 4. Copy corpus if not present
ssh "$HOST" "[ -d ${REMOTE_DIR}/data/corpus/fidc ] || echo 'WARN: Corpus not found. Run: scp -r data/corpus/ ${HOST}:${REMOTE_DIR}/data/'"

# 5. Run ingest if needed
ssh "$HOST" "cd ${REMOTE_DIR} && paganini status"

echo "✅ Deploy complete. Run: ssh ${HOST} 'cd ${REMOTE_DIR} && paganini status'"
