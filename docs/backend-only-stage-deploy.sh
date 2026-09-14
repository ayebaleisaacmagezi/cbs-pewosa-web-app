#!/usr/bin/env bash

set -Eeuo pipefail

BACKEND_COMMIT="1cb2f6481d9096e9acafcb0ffa922a4f24e312ca"
BACKEND_BRANCH="FINERACT-PEWOSA-expense-payment-workflow"
BACKEND_REPO="/root/pewosa-fineract"
LATEST_LINK="/root/pewosa-stage/latest"
SHORT_COMMIT="${BACKEND_COMMIT:0:12}"
NEW_IMAGE="pewosa-fineract:stage-${SHORT_COMMIT}"
CURRENT_STEP="validating staging isolation"
OLD_IMAGE=""
OLD_REMOVED="false"
SUCCESS="false"

STAGE_ROOT="$(readlink -f "$LATEST_LINK")"
test -n "$STAGE_ROOT"
test -d "$STAGE_ROOT"
case "$STAGE_ROOT" in
  /root/pewosa-stage/*) ;;
  *) echo "Refusing unexpected staging path: $STAGE_ROOT" >&2; exit 1 ;;
esac

RUN_ID="$(basename "$STAGE_ROOT")"
NETWORK="pewosa-stage-${RUN_ID}"
POSTGRES_CONTAINER="pewosa-stage-postgresql-${RUN_ID}"
FINERACT_CONTAINER="pewosa-stage-fineract-${RUN_ID}"
WEB_CONTAINER="pewosa-stage-web-${RUN_ID}"
BUILD_ROOT="${STAGE_ROOT}/fineract-${SHORT_COMMIT}-$(date -u +%Y%m%dT%H%M%SZ)"
CONTENT_ROOT="${STAGE_ROOT}/fineract-content"

set_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local temporary="${file}.tmp"
  awk -v prefix="${key}=" 'index($0, prefix) != 1' "$file" > "$temporary"
  printf '%s=%s\n' "$key" "$value" >> "$temporary"
  mv "$temporary" "$file"
  chmod 600 "$file"
}

restore_old_backend() {
  if [ "$SUCCESS" = "true" ] || [ -z "$OLD_IMAGE" ]; then
    return
  fi
  echo
  echo "Restoring previous staging backend: ${OLD_IMAGE}"
  if docker inspect "$FINERACT_CONTAINER" >/dev/null 2>&1; then
    docker rm --force "$FINERACT_CONTAINER" >/dev/null 2>&1 || true
  fi
  docker run --detach \
    --name "$FINERACT_CONTAINER" \
    --network "$NETWORK" \
    --network-alias fineract-server \
    --env-file "$STAGE_ROOT/fineract.env" \
    --mount "type=bind,source=${CONTENT_ROOT},target=/var/lib/fineract-content" \
    --publish 127.0.0.1:3001:8080 \
    --memory=1600m \
    "$OLD_IMAGE" >/dev/null || true
}

failure_report() {
  local code="$?"
  echo
  echo "BACKEND-ONLY STAGING DEPLOYMENT STOPPED"
  echo "Failed step: ${CURRENT_STEP}"
  echo "Command: ${BASH_COMMAND}"
  echo "Exit code: ${code}"
  if docker inspect "$FINERACT_CONTAINER" >/dev/null 2>&1; then
    docker logs --tail 160 "$FINERACT_CONTAINER" 2>&1 || true
  fi
  restore_old_backend
  echo "Production and the staging database were not replaced."
  exit "$code"
}
trap failure_report ERR

wait_for_fineract() {
  local attempts=180
  until curl --fail --silent --max-time 5 \
    http://127.0.0.1:3001/fineract-provider/actuator/health >/dev/null 2>&1; do
    if ! docker inspect "$FINERACT_CONTAINER" >/dev/null 2>&1; then
      return 1
    fi
    if [ "$(docker inspect "$FINERACT_CONTAINER" --format '{{.State.Running}}')" != "true" ]; then
      return 1
    fi
    attempts=$((attempts - 1))
    test "$attempts" -gt 0
    sleep 5
  done
}

test "$(id -u)" -eq 0
command -v docker >/dev/null
command -v git >/dev/null
command -v curl >/dev/null
test -d "$BACKEND_REPO/.git"
test -f "$STAGE_ROOT/fineract.env"
docker network inspect "$NETWORK" >/dev/null
docker inspect "$POSTGRES_CONTAINER" >/dev/null
docker inspect "$FINERACT_CONTAINER" >/dev/null
docker inspect "$WEB_CONTAINER" >/dev/null
test "$(docker inspect "$POSTGRES_CONTAINER" --format '{{.State.Running}}')" = "true"
test "$(docker inspect "$WEB_CONTAINER" --format '{{.State.Running}}')" = "true"
test "$(docker inspect mifosx-postgresql-1 --format '{{.State.Running}}')" = "true"
test "$(docker inspect mifosx-fineract-server-1 --format '{{.State.Running}}')" = "true"
test "$(docker inspect mifosx-web-app-1 --format '{{.State.Running}}')" = "true"
grep -q '^FINERACT_NODE_ID=2$' "$STAGE_ROOT/fineract.env"
install -d -m 0770 -o 65534 -g 65534 "$CONTENT_ROOT"
set_env "$STAGE_ROOT/fineract.env" "FINERACT_CONTENT_FILESYSTEM_ROOT_FOLDER" "/var/lib/fineract-content"
OLD_IMAGE="$(docker inspect "$FINERACT_CONTAINER" --format '{{.Config.Image}}')"
test -n "$OLD_IMAGE"

echo "Staging run: ${RUN_ID}"
echo "Existing Angular remains: $(docker inspect "$WEB_CONTAINER" --format '{{.Config.Image}}')"
echo "Copied staging database remains: ${POSTGRES_CONTAINER}"
echo "Previous staging backend: ${OLD_IMAGE}"
echo "New backend commit: ${BACKEND_COMMIT}"

CURRENT_STEP="fetching the exact backend commit"
git -C "$BACKEND_REPO" fetch origin "$BACKEND_BRANCH"
test "$(git -C "$BACKEND_REPO" rev-parse FETCH_HEAD)" = "$(git -C "$BACKEND_REPO" rev-parse "$BACKEND_COMMIT")"
mkdir -p "$BUILD_ROOT"
git -C "$BACKEND_REPO" archive "$BACKEND_COMMIT" | tar -x -C "$BUILD_ROOT"
test -f "$BUILD_ROOT/fineract-provider/src/main/resources/db/changelog/tenant/parts/0256_pewosa_expense_workflow.xml"

CURRENT_STEP="stopping only the old staging Fineract"
docker stop "$FINERACT_CONTAINER" >/dev/null

CURRENT_STEP="compiling and building the new staging Fineract image"
pushd "$BUILD_ROOT" >/dev/null
export GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx1200m -XX:MaxMetaspaceSize=384m -Dfile.encoding=UTF-8"
./gradlew --no-daemon --max-workers=1 :fineract-provider:jibDockerBuild \
  -Djib.to.image="$NEW_IMAGE" -x test -x resolve
unset GRADLE_OPTS
popd >/dev/null
docker image inspect "$NEW_IMAGE" >/dev/null

CURRENT_STEP="replacing only the isolated staging Fineract container"
docker rm "$FINERACT_CONTAINER" >/dev/null
OLD_REMOVED="true"
docker run --detach \
  --name "$FINERACT_CONTAINER" \
  --network "$NETWORK" \
  --network-alias fineract-server \
  --env-file "$STAGE_ROOT/fineract.env" \
  --mount "type=bind,source=${CONTENT_ROOT},target=/var/lib/fineract-content" \
  --publish 127.0.0.1:3001:8080 \
  --memory=1600m \
  "$NEW_IMAGE" >/dev/null

CURRENT_STEP="waiting for migrations and backend health"
wait_for_fineract
curl --fail --silent --show-error --max-time 15 \
  http://127.0.0.1:8081/fineract-provider/actuator/health >/dev/null

CURRENT_STEP="confirming production remained untouched"
test "$(docker inspect mifosx-postgresql-1 --format '{{.State.Running}}')" = "true"
test "$(docker inspect mifosx-fineract-server-1 --format '{{.State.Running}}')" = "true"
test "$(docker inspect mifosx-web-app-1 --format '{{.State.Running}}')" = "true"

SUCCESS="true"
trap - ERR
echo
echo "BACKEND-ONLY STAGING DEPLOYMENT SUCCEEDED"
echo "Backend image: ${NEW_IMAGE}"
echo "Staging database retained: ${POSTGRES_CONTAINER}"
echo "Staging Angular retained: ${WEB_CONTAINER}"
echo "Production containers remained running."
