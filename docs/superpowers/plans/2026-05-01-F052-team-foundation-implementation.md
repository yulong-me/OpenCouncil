# F052 Team Foundation Implementation Plan

**Feature:** F052 — `docs/features/F052-team-foundation.md`
**Goal:** Replace the user-facing room-starting concept from Scene to Team, backed by immutable TeamVersion snapshots so each room is pinned to the version it was created with.
**Acceptance Criteria:** Covers AC-A1..A3, AC-B1..B4, AC-C1..C3 from `docs/features/F052-team-foundation.md`.
**Architecture:** Add `teams` and `team_versions` tables and repository APIs. Seed v1 builtin Teams from existing Scenes and scene-tagged Agents. Keep `scene_id` for backward compatibility, but new rooms should store `team_id` and `team_version_id`; prompt assembly resolves TeamVersion first and falls back to Scene.
**Tech Stack:** TypeScript, Express, better-sqlite3, Vitest, Next.js/React.
**前端验证:** Yes — reviewer must verify CreateRoomModal and RoomHeader visually after implementation.

---

## Finish Line

After F052, a user sees and chooses a Team, not a Scene:

- Create room modal shows a Team selector with Team name, current version, description, and default members.
- New rooms persist `teamId` and `teamVersionId`.
- Room header shows `Team Name · vN`.
- Old scene-only rooms still open and execute.
- Team active version changes do not alter already-created room pinned versions.

## Non-Goals

- Do not implement EVO Proposal, Evolution Reviewer, accept/reject, merge, or rollback UI. That is F053.
- Do not implement ValidationCase, preflight evals, or active evolution suggestions. That is F054.
- Do not remove `scenes`, `/api/scenes`, or `scene_id`; F052 must remain backward compatible.
- Do not rewrite routing/A2A beyond resolving TeamVersion-backed scene/workflow data.

## Terminal Data Model

Add these backend types in `backend/src/types.ts`:

```ts
export interface TeamConfig {
  id: string;
  name: string;
  description?: string;
  builtin: boolean;
  sourceSceneId: string;
  activeVersionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface TeamVersionConfig {
  id: string;
  teamId: string;
  versionNumber: number;
  name: string;
  description?: string;
  sourceSceneId: string;
  memberIds: string[];
  workflowPrompt: string;
  routingPolicy: Record<string, unknown>;
  teamMemory: string[];
  maxA2ADepth: number;
  createdAt: number;
  createdFrom: 'scene-seed' | 'migration' | 'manual';
}

export interface TeamListItem extends TeamConfig {
  activeVersion: TeamVersionConfig;
  members: Array<{ id: string; name: string; roleLabel: string; provider: string }>;
}
```

Extend `DiscussionRoom`:

```ts
teamId?: string;
teamVersionId?: string;
teamName?: string;
teamVersionNumber?: number;
```

The duplicated `teamName/teamVersionNumber` fields are runtime display hints. The durable truth remains `team_id/team_version_id` plus the TeamVersion snapshot.

## Database Design

Modify `backend/src/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS teams (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  builtin           INTEGER NOT NULL DEFAULT 0,
  source_scene_id   TEXT NOT NULL,
  active_version_id TEXT NOT NULL,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS team_versions (
  id                 TEXT PRIMARY KEY,
  team_id            TEXT NOT NULL,
  version_number     INTEGER NOT NULL,
  name               TEXT NOT NULL,
  description        TEXT,
  source_scene_id    TEXT NOT NULL,
  member_ids_json    TEXT NOT NULL DEFAULT '[]',
  workflow_prompt    TEXT NOT NULL,
  routing_policy_json TEXT NOT NULL DEFAULT '{}',
  team_memory_json   TEXT NOT NULL DEFAULT '[]',
  max_a2a_depth      INTEGER DEFAULT 5 NOT NULL,
  created_at         INTEGER NOT NULL,
  created_from       TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  UNIQUE(team_id, version_number)
);
```

Extend `rooms`:

```sql
team_id TEXT,
team_version_id TEXT,
```

Add indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_teams_active_version_id ON teams(active_version_id);
CREATE INDEX IF NOT EXISTS idx_team_versions_team_id ON team_versions(team_id);
CREATE INDEX IF NOT EXISTS idx_rooms_team_version_id ON rooms(team_version_id);
```

## Team Seeding Rules

Implement `ensureBuiltinTeamsFromScenes()` after scenes and builtin agents are seeded.

For each row in `scenes`:

- Team id = scene id.
- Team name = scene name ending with `团队` if it does not already end with `团队`.
- sourceSceneId = scene.id.
- activeVersionId = `${scene.id}-v1`.
- TeamVersion v1 snapshots:
  - `workflowPrompt = scene.prompt`
  - `maxA2ADepth = scene.maxA2ADepth`
  - `memberIds = agentsRepo.list().filter(agent => agent.tags.includes(scene.name)).map(agent => agent.id)`
  - `routingPolicy = { source: 'scene-default' }`
  - `teamMemory = []`
  - `createdFrom = 'scene-seed'`

Use `INSERT ... WHERE NOT EXISTS` semantics. Never overwrite an existing Team or TeamVersion.

Important: custom scenes should also get Teams, because old users may have custom scenes. Builtin status follows `scene.builtin`.

## Task 1: Backend RED Tests For Team Repository And Seeding

**Files:**
- Create: `backend/tests/teams.test.ts`
- Modify later: `backend/src/db/schema.sql`
- Modify later: `backend/src/db/migrate.ts`
- Modify later: `backend/src/db/repositories/teams.ts`
- Modify later: `backend/src/db/index.ts`

**Step 1: Write failing tests**

Cover:

1. Fresh schema contains `teams`, `team_versions`, `rooms.team_id`, `rooms.team_version_id`.
2. `ensureBuiltinTeamsFromScenes()` creates one active v1 Team per Scene.
3. Team v1 member snapshot is derived from agent tags matching scene name.
4. Calling seeding twice does not overwrite an existing TeamVersion.

**Step 2: Run test and verify RED**

Run:

```bash
pnpm --dir backend exec vitest run tests/teams.test.ts
```

Expected: FAIL because repository/schema/export does not exist.

**Step 3: Implement minimal backend model**

Create `backend/src/db/repositories/teams.ts` with:

- `teamsRepo.list(): TeamListItem[]`
- `teamsRepo.get(id: string): TeamConfig | undefined`
- `teamsRepo.getActiveVersion(teamId: string): TeamVersionConfig | undefined`
- `teamsRepo.getVersion(versionId: string): TeamVersionConfig | undefined`
- `teamsRepo.ensureFromScenes(): { teamsInserted: number; versionsInserted: number }`

Add exports in `backend/src/db/index.ts`.

**Step 4: Run tests and verify GREEN**

Run:

```bash
pnpm --dir backend exec vitest run tests/teams.test.ts
```

## Task 2: Backend RED Tests For Room Creation With TeamVersion

**Files:**
- Modify: `backend/tests/rooms.http.test.ts`
- Modify later: `backend/src/routes/rooms.ts`
- Modify later: `backend/src/db/repositories/rooms.ts`
- Modify later: `backend/src/types.ts`

**Step 1: Write failing tests**

Add tests for:

1. `POST /api/rooms` accepts `teamId`, resolves active TeamVersion, validates its `sourceSceneId`, and persists `teamId/teamVersionId`.
2. `POST /api/rooms` accepts `teamVersionId` and pins to that exact version.
3. When only legacy `sceneId` is provided, the route still works.
4. `GET /api/rooms/:id/messages` returns `teamId`, `teamVersionId`, `teamName`, `teamVersionNumber`.
5. `GET /api/rooms/sidebar` includes team display metadata for room list items if available.

Mocks must include `teamsRepo` in `vi.mock('../src/db/index.js', ...)` or existing tests will fail.

**Step 2: Verify RED**

Run:

```bash
pnpm --dir backend exec vitest run tests/rooms.http.test.ts
```

Expected: FAIL due to missing `teamsRepo` and room fields.

**Step 3: Implement minimal route/repo support**

Modify `backend/src/routes/rooms.ts`:

- Import `teamsRepo`.
- Request body accepts `teamId?: string`, `teamVersionId?: string`, legacy `sceneId?: string`.
- Resolution order:
  1. `teamVersionId` if provided
  2. `teamId` active version if provided
  3. legacy `sceneId` fallback
- Effective scene for existing validation is `teamVersion.sourceSceneId` when TeamVersion exists, else `sceneId ?? 'roundtable-forum'`.
- `workerIds` defaults to `teamVersion.memberIds` when request omits workerIds.
- Existing worker validation and software-development core validation still run.
- Create `DiscussionRoom` with `teamId`, `teamVersionId`, `teamName`, `teamVersionNumber`, and `sceneId` set to effective scene id.
- Response returns those fields.

Modify `backend/src/db/repositories/rooms.ts`:

- Insert `team_id`, `team_version_id`.
- Read them back.
- Resolve display hints from `teamsRepo` and `team_versions` when available.
- Keep scene-only fallback working.
- Include team metadata in `listSidebar()`.

Modify `backend/src/types.ts` accordingly.

**Step 4: Verify GREEN**

Run:

```bash
pnpm --dir backend exec vitest run tests/rooms.http.test.ts
```

## Task 3: Prompt Assembly Uses TeamVersion Workflow First

**Files:**
- Modify: `backend/tests/scenes.test.ts`
- Modify: `backend/src/services/scenePromptBuilder.ts`

**Step 1: Write failing test**

Add a test proving:

- A room with `teamVersionId` uses `teamVersion.workflowPrompt` as the first prompt section.
- If `teamVersionId` is missing or invalid, existing Scene fallback still works.

**Step 2: Verify RED**

Run:

```bash
pnpm --dir backend exec vitest run tests/scenes.test.ts
```

**Step 3: Implement**

Modify `scenePromptBuilder.ts`:

- Import `teamsRepo`.
- Resolve `teamVersion = room.teamVersionId ? teamsRepo.getVersion(room.teamVersionId) : undefined`.
- Use `teamVersion.workflowPrompt` if found.
- Else use existing `scene.prompt`.
- Logging should include `teamId/teamVersionId` when present.

Do not remove Scene validation fallback.

**Step 4: Verify GREEN**

Run:

```bash
pnpm --dir backend exec vitest run tests/scenes.test.ts
```

## Task 4: Teams HTTP API

**Files:**
- Create: `backend/src/routes/teams.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/tests/teams.http.test.ts`

**Step 1: Write failing HTTP test**

Test:

- `GET /api/teams` returns list with active version and members.
- `GET /api/teams/:id` returns one item or 404.

**Step 2: Implement**

Add `teamsRouter`:

```text
GET /api/teams
GET /api/teams/:id
```

Mount in `backend/src/server.ts`:

```ts
app.use('/api/teams', teamsRouter);
```

**Step 3: Verify**

Run:

```bash
pnpm --dir backend exec vitest run tests/teams.http.test.ts
```

## Task 5: Frontend Types And CreateRoomModal Team Selector

**Files:**
- Modify: `frontend/lib/agents.tsx`
- Modify: `frontend/components/CreateRoomModal.tsx`
- Add or modify frontend regression test if local patterns allow it.

**Step 1: Define client types**

Add:

```ts
export interface TeamListItem {
  id: string
  name: string
  description?: string
  builtin: boolean
  sourceSceneId: string
  activeVersionId: string
  activeVersion: {
    id: string
    teamId: string
    versionNumber: number
    sourceSceneId: string
    memberIds: string[]
    maxA2ADepth: number
  }
  members: Array<{ id: string; name: string; roleLabel: string; provider: string }>
}
```

**Step 2: Update CreateRoomModal**

Replace user-facing Scene selector with Team selector:

- Fetch `/api/teams`.
- Keep `/api/scenes` only as fallback if `/api/teams` fails.
- State uses `teamId` and `teamVersionId`; keep `sceneId` internally only for legacy validation/filtering.
- Display label: `选择 Team`.
- Show active version: `v1`.
- Show member chips/names for selected team.
- On Team change:
  - set `teamId`
  - set `teamVersionId`
  - set `sceneId = team.sourceSceneId`
  - set selected workers to `team.activeVersion.memberIds` if no explicit initial worker preset is active
- Submit body includes `teamId`, `teamVersionId`, and `workerIds`. Include legacy `sceneId` only as compatibility field.
- Change user-facing copy from “讨论场景/管理场景/加载场景中” to Team wording.

Do not build the full Team Settings page in F052 unless needed. If keeping the management link, use “管理 Team” but route to the existing scene settings as a temporary compatibility path with a comment.

**Step 3: Validate with TypeScript**

Run:

```bash
pnpm --dir frontend exec tsc --noEmit
```

## Task 6: Room Header Shows Team Version

**Files:**
- Modify: `frontend/components/room-view/useRoomRealtime.ts`
- Modify: `frontend/components/RoomView.tsx`
- Modify: `frontend/components/room-view/RoomHeader.tsx`
- Modify: `frontend/components/room-view/types.ts` if room list metadata needs types

**Step 1: Fetch and store team metadata**

`GET /api/rooms/:id/messages` should now return:

```ts
teamId?: string
teamVersionId?: string
teamName?: string
teamVersionNumber?: number
```

`useRoomRealtime` stores these fields.

**Step 2: Render in Header**

RoomHeader shows a small chip near title:

```text
软件开发团队 · v1
```

If no team metadata exists, do not show the chip.

**Step 3: Validate**

Run:

```bash
pnpm --dir frontend exec tsc --noEmit
```

## Task 7: Documentation Checkboxes And Verification

**Files:**
- Modify: `docs/features/F052-team-foundation.md`

After tests pass, mark completed ACs only if implementation actually satisfies them.

Required verification:

```bash
pnpm --dir backend exec vitest run tests/teams.test.ts tests/teams.http.test.ts tests/rooms.http.test.ts tests/scenes.test.ts
pnpm --dir frontend exec tsc --noEmit
pnpm --dir backend build
```

If frontend UI was changed, run the app and capture a browser screenshot for:

1. Create room Team selector.
2. Room header showing Team name and version.

## Claude Implementation Instructions

When using this plan:

1. Follow TDD. Write failing tests first and run them.
2. Implement only F052.
3. Do not implement EVO PR, evolution review, validation cases, or rollback.
4. Preserve all legacy Scene APIs and existing room creation behavior.
5. Update all Vitest mocks that import `../src/db/index.js` to include `teamsRepo`.
6. Keep frontend copy concise and consistent with current OpenCouncil visual style.
7. Do not touch unrelated files or `frontend/.tmp-tests/`.
