#!/usr/bin/env bash
# App seed: dev auth user + authz → units → schedule sources + ingest.
# JSON lives under supabase/seed/. Requires supabase start, jq, curl.
#
#   SEED_AUTHZ_JSON=... SEED_MANIFEST=... SEED_UNITS_JSON=...
#   ./supabase/scripts/seed-app.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AUTHZ_JSON="${SEED_AUTHZ_JSON:-$REPO_ROOT/supabase/seed/authz.json}"
MANIFEST="${SEED_MANIFEST:-$REPO_ROOT/supabase/seed/manifest.json}"
DEV_USER_EMAIL="${SEED_DEV_USER_EMAIL:-its.amit.kat@gmail.com}"
DEV_USER_PASSWORD="${SEED_DEV_USER_PASSWORD:-22113355}"

if ! command -v jq &>/dev/null; then
  echo "seed-app: install jq (e.g. brew install jq)" >&2
  exit 1
fi

if ! command -v supabase &>/dev/null; then
  echo "seed-app: supabase CLI not found" >&2
  exit 1
fi

eval "$(supabase status -o env)" || {
  echo "seed-app: supabase status failed — run: supabase start" >&2
  exit 1
}

# If the Edge Runtime container exited (e.g. OOM 137), Kong still serves /rest but /functions/v1 returns 503.
# `supabase start` may report "already running" without restarting that container — start it explicitly.
ensure_local_edge_runtime_container() {
  if ! command -v docker &>/dev/null; then
    return 0
  fi
  local name
  name="$(
    docker ps -a --filter "name=supabase_edge_runtime" --format "{{.Names}}" 2>/dev/null | head -n 1
  )"
  if [[ -z "$name" ]]; then
    return 0
  fi
  local state
  state="$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || true)"
  if [[ "$state" == "exited" ]]; then
    echo "seed-app: Edge Runtime container was stopped (${name}); starting it" >&2
    if ! docker start "$name" >/dev/null 2>&1; then
      echo "seed-app: could not docker start ${name}; try: supabase stop && supabase start" >&2
    fi
  fi
}

ensure_local_edge_runtime_container

for i in $(seq 1 60); do
  if curl -sf -o /dev/null "${API_URL}/rest/v1/" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}"; then
    break
  fi
  if [[ $i -eq 60 ]]; then
    echo "seed-app: API not reachable at ${API_URL}" >&2
    exit 1
  fi
  sleep 1
done

# After `supabase db reset`, Edge Runtime may restart slowly; REST is up before Functions.
wait_for_edge_function() {
  local ep="$1"
  local label="$2"
  for i in $(seq 1 120); do
    local code
    code="$(
      curl -sS -o /dev/null -w "%{http_code}" -X POST "$ep" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null || echo "000"
    )"
    case "$code" in
      503|502|504|000) ;;
      *)
        echo "seed-app: Edge Functions ready (${label}, HTTP ${code})"
        return 0
        ;;
    esac
    if [[ $i -eq 1 ]] || [[ $((i % 15)) -eq 0 ]]; then
      echo "seed-app: waiting for Edge Functions (${label})… HTTP ${code} (${i}/120s)" >&2
    fi
    sleep 1
  done
  echo "seed-app: Edge Functions still unavailable at ${label} (${ep})" >&2
  echo "seed-app: Try: supabase stop && supabase start" >&2
  return 1
}

AUTHZ_EP="${API_URL}/functions/v1/ensure-authz-seed"
UNITS_EP="${API_URL}/functions/v1/ensure-units"
ENSURE_EP="${API_URL}/functions/v1/ensure-schedule-sources"
INGEST_EP="${API_URL}/functions/v1/ingest-schedule"
AUTH_ADMIN_USERS_EP="${API_URL}/auth/v1/admin/users"

echo "seed-app: ensure dev auth user (${DEV_USER_EMAIL})"
existing_user_id="$(
  curl -sfS "${AUTH_ADMIN_USERS_EP}?page=1&per_page=1000" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    | jq -r --arg email "$DEV_USER_EMAIL" '.users[] | select(.email == $email) | .id' \
    | head -n 1
)"

if [[ -n "${existing_user_id:-}" ]]; then
  curl -sfS -X PUT "${AUTH_ADMIN_USERS_EP}/${existing_user_id}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg password "$DEV_USER_PASSWORD" --arg email "$DEV_USER_EMAIL" \
      '{email: $email, password: $password, email_confirm: true}')" \
    | jq '{id, email, updated_at}'
else
  curl -sfS -X POST "${AUTH_ADMIN_USERS_EP}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg email "$DEV_USER_EMAIL" --arg password "$DEV_USER_PASSWORD" \
      '{email: $email, password: $password, email_confirm: true}')" \
    | jq '{id, email, created_at}'
fi

if [[ ! -f "$AUTHZ_JSON" ]]; then
  echo "seed-app: authz JSON not found: $AUTHZ_JSON" >&2
  exit 1
fi

wait_for_edge_function "$AUTHZ_EP" "ensure-authz-seed" || exit 1

echo "seed-app: ensure-authz-seed ($AUTHZ_JSON)"
curl -sfS -X POST "$AUTHZ_EP" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d @"$AUTHZ_JSON" \
  | jq .

resolve_units_file() {
  if [[ -n "${SEED_UNITS_JSON:-}" ]]; then
    echo "$SEED_UNITS_JSON"
    return
  fi
  local from_manifest
  from_manifest="$(jq -r '.units_file // empty' "$MANIFEST")"
  if [[ -n "$from_manifest" ]]; then
    echo "$REPO_ROOT/$from_manifest"
    return
  fi
  echo "$REPO_ROOT/supabase/seed/units.json"
}

UNITS_JSON="$(resolve_units_file)"

if [[ ! -f "$UNITS_JSON" ]]; then
  echo "seed-app: units JSON not found: $UNITS_JSON" >&2
  exit 1
fi

if ! jq -e '(.units | type == "array")' "$UNITS_JSON" >/dev/null; then
  echo "seed-app: $UNITS_JSON must be { \"units\": [ ... ] }" >&2
  exit 1
fi

unit_count="$(jq '.units | length' "$UNITS_JSON")"
if [[ "$unit_count" -gt 0 ]]; then
  echo "seed-app: ensure-units ($unit_count) via $UNITS_EP"
  curl -sfS -X POST "$UNITS_EP" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d @"$UNITS_JSON" \
    | jq .
else
  echo "seed-app: skipping ensure-units (empty array)"
fi

if ! jq -e '
  (.sources | type == "array")
  and (.sources | length > 0)
  and (.sources | all(
    (.schedule_source | type == "object")
    and (.versions | type == "array")
    and ((has("order") | not) or (.order | type == "number"))
    and (.versions | all(
      (.schedule_source_version | type == "object")
      and (.files | type == "array")
    ))
  ))
' "$MANIFEST" >/dev/null; then
  echo "seed-app: invalid manifest sources tree: $MANIFEST" >&2
  exit 1
fi

echo "seed-app: schedule seed (ensure-schedule-sources + ingest)"

while IFS= read -r block; do
  [[ -z "$block" ]] && continue
  ensure_payload="$(echo "$block" | jq '{schedule_source, schedule_source_version}')"
  src_name="$(echo "$block" | jq -r '.schedule_source.name')"
  ver_name="$(echo "$block" | jq -r '.schedule_source_version.name')"
  echo "seed-app: ensuring source=$src_name version=$ver_name"

  version_id="$(
    echo "$ensure_payload" \
      | curl -sfS -X POST "$ENSURE_EP" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d @- \
      | jq -r '.schedule_source_version_id'
  )"

  if [[ -z "$version_id" || "$version_id" == "null" ]]; then
    echo "seed-app: ensure-schedule-sources failed for $src_name / $ver_name" >&2
    exit 1
  fi

  while IFS= read -r rel; do
    [[ -z "$rel" || "$rel" == "null" ]] && continue
    full="$REPO_ROOT/$rel"
    if [[ ! -f "$full" ]]; then
      echo "seed-app: file not found: $full" >&2
      exit 1
    fi
    echo "seed-app: ingesting $rel (version=$ver_name)"
    jq -n \
      --arg vid "$version_id" \
      --slurpfile d "$full" \
      '{schedule_source_version_id: $vid, data: $d[0]}' \
      | curl -sfS -X POST "$INGEST_EP" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d @- \
      | jq .
  done < <(echo "$block" | jq -r '.files[]')
done < <(
  jq -c '
    .sources[] as $src
    | $src.versions[]
    | {
        schedule_source: $src.schedule_source,
        schedule_source_version: (.schedule_source_version + {sort_order: $src.order}),
        files: .files
      }
  ' "$MANIFEST"
)

echo "seed-app: done"
