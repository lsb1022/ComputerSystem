#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077
mkdir -p ../../backups
backup_name="study-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
docker compose exec -T app node --input-type=module - <<'JS'
import {DatabaseSync,backup} from 'node:sqlite';
const db=new DatabaseSync('/data/study.sqlite');
await backup(db,'/data/backup.sqlite');db.close();
JS
docker compose cp app:/data/backup.sqlite "../../backups/$backup_name"
printf 'Backup: backups/%s\n' "$backup_name"
