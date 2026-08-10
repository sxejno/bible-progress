---
name: cloud-sync
description: How Firebase auth + Firestore sync works — the merge algorithm, deletion tombstones, edit gating, sync-status pill — and how to debug sync bugs (data resurrecting, vanishing fields, stale overwrites). Use for anything touching Firebase, multi-device sync, or login.
---

# Cloud sync (Firebase Auth + Firestore)

Local-first: localStorage is primary, Firestore mirrors the whole `appData` blob.
Project `bibleprogress-48cfd`; per-user doc `users/{uid}` containing `{ appData }`.
Do not change `firebaseConfig` without authorization. Grep the anchors; line
numbers drift.

## Auth

- Imports: firebase 10.8.0 ESM from gstatic (anchor `// --- FIREBASE IMPORTS ---`).
  ⚠️ These are static imports in the module script — if they fail to load, **no app
  JS runs at all** (blank interactions, not a partial failure).
- Providers: Google popup (`window.handleGoogleLogin`) and email/password
  (`window.handleEmailAuth`). Sign-out via `signOut` listener.
- `onAuthStateChanged`: signed in → green "Cloud Synced" pill + `initCloudSync(uid)`;
  signed out → gray "Local Only" pill + `unsubscribe()`.

## Write path

`window.saveProgress()` → `saveToFirebase` (debounced `FIREBASE_DEBOUNCE_MS: 3000`,
only when `currentUser`): `setDoc(doc(db,"users",uid), {appData}, {merge:true})`.
Every save stamps `appData.lastModified = Date.now()` — this is the conflict guard.

## Read path — `processCloudSnapshot(docSnap)` (the merge algorithm)

`initCloudSync` subscribes via `onSnapshot`. Each snapshot:

1. Empty/invalid cloud doc → push local up instead.
2. `normalizeAppData(cloudData)` (same sanitizer as all load paths).
3. **Stale-snapshot guard**: `cloudData.lastModified < appData.lastModified` → skip
   snapshot, re-push local.
4. Snapshot all local sub-objects into locals, then `appData = cloudData`.
5. **Tombstone union**: `deletedChapters` merged, newest deletion timestamp per
   chapter wins.
6. Per-chapter merge: a local read timestamp survives only if there's no tombstone
   or it's newer than the tombstone (re-marked after unmark).
7. Tombstone application + purge: read ts ≤ tombstone ts → dropped;
   tombstones older than `TOMBSTONE_TTL_MS` (30 days) purged.
8. Merge-back blocks for `profilePlans, hornerDailyProgress, hornerCycleCount,
   hornerCycleLastAt, memorizedVerses, goals, customPlans, profileSyncRules,
   profileColors` — **any new appData field needs its own block here** (see
   `data-model` skill, step 5) or sync will eat it.
9. Integrity/migration re-run, `lastModified = max(local, cloud)`, write
   localStorage, `refreshUI()`.

## Edit gating

`userIsEditing` + `pendingSnapshot` (anchors in state section): while the user is
mid-edit (profile switch, plan change), incoming snapshots queue and replay after
`EDIT_COOLDOWN_MS` (2s). Prevents the UI flipping under the user's finger.

## Deletion tombstones

Un-marking a chapter calls `recordChapterDeletion(profileId, chapterKey)` (writes
`Date.now()` into `deletedChapters`); re-marking calls `clearChapterDeletion`.
Without tombstones, the other device's copy would "resurrect" deleted chapters on
merge. If you add any user-deletable synced data, replicate this pattern.

## Sync-status pill states (`#sync-status`)

| Pill | Meaning |
|---|---|
| green "Cloud Synced" | signed in, last write OK |
| gray "Local Only" | signed out |
| amber "Sync Issue" | onSnapshot error or write failure — check console + Firestore rules |

## Debugging recipes

- **Field vanishes after login/sync** → missing merge-back block in
  `processCloudSnapshot` (step 8 above).
- **Deleted chapters come back** → tombstone not recorded, or one device predates
  the tombstone feature; check `deletedChapters` in both localStorage blobs.
- **Old data overwrites new** → compare `lastModified` in local blob vs Firestore
  doc; the stale guard only works if every save path stamps it.
- **Testing without real Firebase**: the `verify` skill stubs the Firebase modules
  (`onAuthStateChanged` → `null` user, `getDoc` → `exists: () => false`). For merge
  logic itself, test in a real browser with two profiles/devices, or unit-drive
  `processCloudSnapshot` with a fake `docSnap` (`{ exists: () => true, data: () => ({appData: {...}}) }`)
  from the console — note `appData` is module-scoped, so instrument via temporary
  `window.` exposure while debugging.
- Firestore security rules (console-managed, not in repo): users read/write only
  their own `users/{uid}` doc — see SECURITY.md for the canonical rules.
