# CBS PEWOSA Web App Deployment Guide

This guide explains how to safely deploy the CBS PEWOSA Mifos web interface to the production virtual server. It is written so that a person or a new AI assistant can follow the process without guessing.

## 1. Production architecture

The production server currently uses Docker Compose.

| Item | Production value |
| --- | --- |
| Web-app source folder | `/root/cbs-pewosa-web-app` |
| Docker Compose folder | `/root/mifosx` |
| Docker Compose file | `/root/mifosx/docker-compose.yml` |
| Compose service | `web-app` |
| Running container | `mifosx-web-app-1` |
| Image expected by Compose | `cbs-pewosa-web-app:custom` |
| Local web-app port | `127.0.0.1:8080` |
| Public site | `https://portal.cbspewosa.com` |
| Fineract container | `mifosx-fineract-server-1` |
| PostgreSQL container | `mifosx-postgresql-1` |

The web application is an Angular frontend served by Nginx. Replacing only the `web-app` container does not replace the Fineract backend or PostgreSQL database.

## 2. Critical safety rules

1. Never run `docker compose down -v`. The `-v` option can remove persistent volumes.
2. Never remove or recreate the PostgreSQL container for a frontend deployment.
3. Never recreate all services when only the web interface changed.
4. Always use `--no-deps` when recreating `web-app`.
5. Always make a backup tag of the currently deployed frontend image before changing `cbs-pewosa-web-app:custom`.
6. Do not continue after a failed Git pull or failed Docker build.
7. A Docker build is not successful until it ends with `FINISHED` and exits without an error.
8. Do not run the image-tagging or restart commands if the new image does not exist.
9. Do not place GitHub passwords, access tokens, database passwords, or server passwords in this document or terminal screenshots.
10. Frontend deployment does not require database migrations unless a separate change explicitly says so.

## 3. Current role-workspace release

The Loan Officer and Cashier workspace release is:

| Item | Value |
| --- | --- |
| Git branch | `WEB-PEWOSA-loan-officer-workspace` |
| Git commit | `9b0073d` |
| Commit message | `WEB-PEWOSA: add loan officer and cashier workspaces` |
| Release image tag | `cbs-pewosa-web-app:role-workspaces-9b0073d` |
| Rollback image tag created on the server | `cbs-pewosa-web-app:backup-before-role-workspaces` |

## 4. Complete deployment procedure

Perform each step separately. Check its output before moving to the next step.

### Step 1: Connect to the server

Connect to the production virtual machine using the normal SSH method. Confirm the prompt identifies the intended server, for example:

```text
root@portal:~#
```

Do not deploy if you are unsure which server you are connected to.

### Step 2: Enter the source repository and inspect it

```bash
cd /root/cbs-pewosa-web-app
pwd
git status --short
git branch --show-current
git log -1 --oneline
```

Expected source directory:

```text
/root/cbs-pewosa-web-app
```

`git status --short` should normally print nothing. If it displays modified or untracked files, stop and identify them before switching branches or pulling. Do not delete unknown files.

### Step 3: Fetch and select the release branch

This server repository was originally cloned with `--single-branch`. Because of that, an ordinary `git fetch` may put a branch only in `FETCH_HEAD` without creating a normal remote-tracking branch.

For the current role-workspace release, use:

```bash
git fetch origin WEB-PEWOSA-loan-officer-workspace
git switch WEB-PEWOSA-loan-officer-workspace
git pull --ff-only origin WEB-PEWOSA-loan-officer-workspace
git log -1 --oneline
```

The final output must begin with:

```text
9b0073d WEB-PEWOSA: add loan officer and cashier workspaces
```

If the branch does not yet exist locally, use:

```bash
git fetch origin WEB-PEWOSA-loan-officer-workspace
git switch -c WEB-PEWOSA-loan-officer-workspace FETCH_HEAD
git log -1 --oneline
```

Do not use an old commit if the intended release commit is different.

### Step 4: Record the currently running frontend

```bash
docker compose -f /root/mifosx/docker-compose.yml ps web-app
docker inspect mifosx-web-app-1 --format 'Image={{.Config.Image}} ID={{.Image}}'
docker image inspect cbs-pewosa-web-app:custom --format 'Current custom image ID={{.Id}} Created={{.Created}}'
```

Save this output in the deployment notes. It identifies the image that was running before deployment.

### Step 5: Back up the current frontend image

For the current deployment, the backup command is:

```bash
docker image tag cbs-pewosa-web-app:custom cbs-pewosa-web-app:backup-before-role-workspaces
```

Verify that the backup exists:

```bash
docker image inspect cbs-pewosa-web-app:backup-before-role-workspaces --format 'Backup image ID={{.Id}} Created={{.Created}}'
```

This backup contains the old frontend. It does not back up or modify the database because this deployment does not touch the database.

For a later release, use a new descriptive backup tag instead of overwriting the previous backup, for example:

```bash
docker image tag cbs-pewosa-web-app:custom cbs-pewosa-web-app:backup-before-RELEASE-NAME
```

Replace `RELEASE-NAME` with a short lowercase name containing no spaces.

### Step 6: Build the new frontend image

For the current release:

```bash
cd /root/cbs-pewosa-web-app
docker build -t cbs-pewosa-web-app:role-workspaces-9b0073d .
```

The final dot is required. It tells Docker to use the current directory as the build context. Omitting the dot causes this error:

```text
docker buildx build requires 1 argument
```

The build may take several minutes and download Node or Nginx layers. It can use significant internet data when layers or npm packages are not cached.

Do not continue unless the build ends successfully. Verify the new image:

```bash
docker image inspect cbs-pewosa-web-app:role-workspaces-9b0073d --format 'New image ID={{.Id}} Created={{.Created}}'
```

If Docker says `No such image`, the build was skipped, failed, or used a different tag. Do not restart the web app. Correct the build first.

### Step 7: Point the Compose image name to the new build

The production Compose file expects the fixed image name `cbs-pewosa-web-app:custom`. Tag the successful immutable release image with that name:

```bash
docker image tag cbs-pewosa-web-app:role-workspaces-9b0073d cbs-pewosa-web-app:custom
```

Verify that both names now have the same image ID:

```bash
docker image inspect cbs-pewosa-web-app:role-workspaces-9b0073d --format 'Release={{.Id}}'
docker image inspect cbs-pewosa-web-app:custom --format 'Custom={{.Id}}'
```

The two IDs must match.

### Step 8: Recreate only the frontend container

```bash
cd /root/mifosx
docker compose up -d --no-deps --force-recreate web-app
```

Why these options matter:

- `-d` starts the container in the background.
- `--no-deps` prevents Docker Compose from restarting Fineract or PostgreSQL.
- `--force-recreate` replaces the existing frontend container even though the Compose image name remains `cbs-pewosa-web-app:custom`.

### Step 9: Verify the container and local HTTP response

```bash
docker compose ps web-app
docker inspect mifosx-web-app-1 --format 'Image={{.Config.Image}} ID={{.Image}} Started={{.State.StartedAt}}'
docker image inspect cbs-pewosa-web-app:custom --format 'Expected image ID={{.Id}}'
curl -I http://127.0.0.1:8080
```

Expected results:

- `web-app` has status `Up`.
- The container image ID matches the `custom` image ID.
- `curl` returns `HTTP/1.1 200 OK`.

If the container is not running, inspect its logs:

```bash
docker compose logs --tail=200 web-app
```

### Step 10: Verify the public site

From a trusted computer, open:

```text
https://portal.cbspewosa.com
```

If the old interface appears, use a private/incognito window or perform a hard refresh. Angular service-worker or browser caching can temporarily show an older frontend even when the new container is running.

Test with dedicated non-production test users where possible:

1. Log in as a user whose role is exactly `Loan Officer`.
2. Confirm the Loan Officer workspace appears.
3. Confirm member search, new-member registration, collection sheet, and loan portfolio links appear according to permissions.
4. Log out completely.
5. Log in as a user whose role is exactly `Cashier`.
6. Confirm the Cashier workspace appears.
7. Confirm deposit, withdrawal, share-purchase, fee, and teller-drawer actions appear according to permissions.
8. Confirm administrators and managers still receive the normal full home screen.

Do not perform a real financial transaction merely to test the layout. Use approved test accounts and controlled amounts if transaction testing is authorized.

## 5. Role detection and required permissions

The focused workspaces are selected in:

```text
src/app/home/home.component.ts
```

The code reads `credentials.roles` from the authenticated Mifos user.

- Role name `loan officer` selects the Loan Officer workspace.
- Role name `cashier` selects the Cashier workspace.
- Cashier takes priority if a user has both roles.
- Users with elevated roles such as Super User, General Manager, Deputy GM, Branch Manager, Accountant, or IT Officer keep the normal full home screen.

The interface also checks Fineract permissions. A role name alone does not grant transaction authority.

### Loan Officer workspace permissions

| Action | Permission |
| --- | --- |
| Start loan application | `CREATE_LOAN` |
| Register member | `CREATE_CLIENT` |
| Record group collections | `READ_COLLECTIONSHEET` |
| View loan portfolio | `READ_LOAN` |

### Cashier workspace permissions

| Action | Permission |
| --- | --- |
| Deposit cash | `DEPOSIT_SAVINGSACCOUNT` |
| Withdraw cash | `WITHDRAWAL_SAVINGSACCOUNT` |
| Share purchase | `APPLYADDITIONAL_SHAREACCOUNT` |
| Receive member fee | `PAY_CLIENTCHARGE` |
| View teller drawer | `READ_TELLER` |

If a card is missing, first check the permissions assigned to that Mifos role. Do not weaken or remove the UI permission checks to make a card visible.

## 6. Safe rollback procedure

Rollback is appropriate if the new frontend does not load or causes a serious interface regression.

For the current release, restore the backup image:

```bash
docker image inspect cbs-pewosa-web-app:backup-before-role-workspaces --format 'Rollback image ID={{.Id}}'
docker image tag cbs-pewosa-web-app:backup-before-role-workspaces cbs-pewosa-web-app:custom
cd /root/mifosx
docker compose up -d --no-deps --force-recreate web-app
docker compose ps web-app
curl -I http://127.0.0.1:8080
```

This rolls back only the frontend. It does not reverse database transactions or Fineract configuration changes.

After rollback, preserve the failed release image and logs until the problem is understood.

## 7. Deploying `main` after a pull request is merged

Because the server clone may be configured as single-branch, `git checkout main` can fail with:

```text
error: pathspec 'main' did not match any file(s) known to git
```

Create the missing remote-tracking reference explicitly:

```bash
cd /root/cbs-pewosa-web-app
git fetch origin main:refs/remotes/origin/main
git switch -c main --track origin/main
git log -1 --oneline
```

If a local `main` branch already exists, use:

```bash
git switch main
git pull --ff-only origin main
git log -1 --oneline
```

Before building, confirm that the latest commit shown is the exact release intended for production.

## 8. Common errors

### `pathspec ... did not match any file known to git`

Cause: the repository was cloned with only one branch.

Fix for a release branch:

```bash
git fetch origin BRANCH-NAME
git switch -c BRANCH-NAME FETCH_HEAD
```

Only use `FETCH_HEAD` immediately after fetching the intended branch. Otherwise it may point to a different commit.

### `starting point origin/BRANCH-NAME is not a branch`

Cause: Git fetched the commit into `FETCH_HEAD` but did not create a remote-tracking reference.

Fix:

```bash
git fetch origin BRANCH-NAME
git switch -c BRANCH-NAME FETCH_HEAD
```

### `docker buildx build requires 1 argument`

Cause: the final build-context dot was omitted.

Correct command:

```bash
docker build -t IMAGE-NAME:TAG .
```

### `No such image: cbs-pewosa-web-app:TAG`

Cause: the requested image has not been built, the build failed, or the tag is misspelled.

Inspect available images:

```bash
docker image ls cbs-pewosa-web-app
```

Then build the correct image. Do not tag or restart until the image exists.

### Container is running but the old interface appears

Check which image the container actually uses:

```bash
docker inspect mifosx-web-app-1 --format 'Container image ID={{.Image}}'
docker image inspect cbs-pewosa-web-app:custom --format 'Custom image ID={{.Id}}'
```

If the IDs differ, recreate `web-app` with `--force-recreate`. If they match, hard-refresh the browser or use a private window.

### `curl` returns an error or no response

Inspect the container state and logs:

```bash
docker compose -f /root/mifosx/docker-compose.yml ps web-app
docker compose -f /root/mifosx/docker-compose.yml logs --tail=200 web-app
```

If necessary, roll back using the documented backup image.

## 9. What a future AI assistant must verify

Before suggesting deployment commands, the assistant must confirm:

1. The intended repository, branch, and commit.
2. Whether the pull request has been merged or the feature branch is being deployed directly.
3. Whether the server clone is single-branch.
4. That the worktree has no unexplained changes.
5. That the Compose service still uses `cbs-pewosa-web-app:custom`.
6. That the existing frontend image has a rollback tag.
7. That the new Docker build completed successfully.
8. That only `web-app` will be recreated.
9. That the container and `custom` image IDs match after deployment.
10. That local HTTP and public role-based checks succeed.

The assistant must not claim that a Git pull makes changes live. The release becomes live only after Docker successfully builds the new frontend image, the release image is tagged as `custom`, and the `web-app` container is recreated.

## 10. Current deployment command checklist

Use this compact checklist only after reading the safety rules above:

```bash
cd /root/cbs-pewosa-web-app
git status --short
git branch --show-current
git log -1 --oneline

docker image tag cbs-pewosa-web-app:custom cbs-pewosa-web-app:backup-before-role-workspaces
docker build -t cbs-pewosa-web-app:role-workspaces-9b0073d .
docker image inspect cbs-pewosa-web-app:role-workspaces-9b0073d --format 'New image ID={{.Id}}'
docker image tag cbs-pewosa-web-app:role-workspaces-9b0073d cbs-pewosa-web-app:custom

cd /root/mifosx
docker compose up -d --no-deps --force-recreate web-app
docker compose ps web-app
curl -I http://127.0.0.1:8080
```

Expected Git commit for this checklist: `9b0073d`.

