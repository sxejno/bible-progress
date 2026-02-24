# Android App Plan for Bible Progress

This document outlines a practical path to build a full native Android app while preserving compatibility with the existing web app data model and Firebase backend.

## Goals

- Keep feature parity with the web app where practical.
- Preserve user data compatibility (`kjv_v6_data` semantics and chapter key format).
- Support offline-first reading and progress tracking.
- Reuse existing Firebase auth/sync patterns.

## Recommended Tech Stack

- **Language/UI**: Kotlin + Jetpack Compose
- **Local storage**: Room (primary), DataStore (settings)
- **Sync/Auth**: Firebase Auth + Firestore
- **Background work**: WorkManager
- **Widget**: Jetpack Glance (App Widget)
- **Charts**: Compose chart library or MPAndroidChart wrapper

## Phased Delivery

### Phase 1: Foundation (MVP)

- Authentication (anonymous/local + optional Google sign-in)
- Multi-profile support
- Core progress tracking by chapter and word-weighted completion
- Basic Bible reader (book/chapter navigation and mark chapter read)
- Local-first data persistence
- One-way backup sync to Firestore

### Phase 2: Parity Features

- Reading plans (Sequential, One Year, M'Cheyne, Horner, Five-Day, Custom)
- Streaks and heatmap views
- Goals
- Verse memorization
- Import/export (JSON + CSV)

### Phase 3: Android-first Enhancements

- Home screen widget (progress + streak + next reading)
- Notifications and reminders
- Material You theming
- Better offline cache and sync conflict handling

## Data Model Mapping

Use the existing web data model as a source of truth for compatibility:

- `profiles`: map to `chapter_progress` table (`profile_id`, `book`, `chapter`, `read_at`)
- `profilePlans`: map to `profile_settings.plan_type`
- `activeProfileId`/`defaultProfileId`: map to app preferences
- `hornerDailyProgress` + `hornerCycleCount`: dedicated Horner tables
- `memorizedVerses`: `memorized_verses` table
- `goals`: `goals` table
- `customPlans`: `custom_plans` and join tables
- `showReadingTime`/`wordsPerMinute`: DataStore user settings

Keep chapter key compatibility with web format: `"BookName-ChapterNumber"`.

## Suggested Android Module Layout

- `app`: UI/navigation/DI
- `core-model`: domain models and enums (plans, goals, profile types)
- `core-data`: repositories, Room, Firestore sync adapters
- `feature-reader`: Bible reader and chapter actions
- `feature-progress`: dashboards, streaks, heatmap
- `feature-plans`: plan generation and daily assignments
- `feature-memorize`: spaced repetition and review workflow
- `feature-widget`: Glance widget and widget workers

For a small team, this can start as a single module and split later.

## Sync Strategy

1. Write all updates locally first (Room transaction).
2. Queue outbound sync events (`pending_sync` table).
3. Periodically flush with WorkManager when network is available.
4. Resolve conflicts by timestamp for chapter reads (`read_at` newest wins).
5. Preserve deletions and edits with tombstone/version fields where needed.

## Migration/Interoperability

- Add JSON import from existing web backups.
- Keep export format close to current web schema to allow round-tripping.
- Add schema version metadata and migration handlers from day one.

## Security

- Use Firebase Auth user scoping for Firestore documents.
- Do not store sensitive secrets in app code beyond expected Firebase client config.
- Validate imported JSON and sanitize user-entered text before rendering.

## Testing Plan

- Unit tests for:
  - word-weighted progress calculations
  - plan generators (especially Horner and M'Cheyne)
  - streak/grace-day logic
- Instrumentation tests for:
  - reader flow (open chapter -> mark read)
  - multi-profile switching
- Sync tests with mocked network transitions.

## Practical 6-Week Build Outline

- **Week 1**: project setup, models, Room schema, profile management
- **Week 2**: Bible reader + progress calculations
- **Week 3**: plans + daily assignments
- **Week 4**: Firebase auth/sync + conflict handling
- **Week 5**: streaks/goals/memorization basics
- **Week 6**: polish, widget, tests, beta release

## First Build Scope Recommendation

If you want to launch quickly, ship v1 with:

- Sequential plan
- Progress dashboard
- Reader + chapter completion
- Google sign-in sync
- Basic widget

Then incrementally add Horner/Five-Day, memorization, and advanced exports.
