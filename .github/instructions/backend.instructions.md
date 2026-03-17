---
description: "Use when: modifying Node.js backend controllers, creating Express routes, or adding backend logic for GreenBit"
globs: "back/**/*.js"
---
# GreenBit Backend Guidelines & Rules

## 1. Score & Rating Mathematics
- **Dual System:** Distinguish between `rating` (1-5 stars) and `score` (Ranking Points).
- `score` is usually 10 (base points) + `rating`.
- `rating` can be `NULL` (e.g., system-awarded points).
- **Rule:** Never assume `rating` is required for a `score` entry to exist. Always use `calculateScore(rating)` when inserting.

## 2. Ranking Snapshot Integrity
- Closing a ranking period saves the `ranking_tops` immutably into `history`.
- **Warning:** NEVER modify historical score values retroactively. Future points only apply to an active `periodo_id` to ensure period-based history tables remain reliable.

## 3. Data Integrity & Hard Deletes
- Most tables (`users`, `score`, `request`, `person`, `institution`, etc.) rely on `TINYINT` state flags (`1` = active, `0` = inactive).
- **CRITICAL WARNING:** Before running or generating ANY `DELETE` statement, warn the user. Use `UPDATE state = 0` (soft deletes) instead to preserve reporting and cascaded relationship histories.

## 4. Query Filtering
- **Rule:** When writing or editing aggregate queries (Reports, Scores, Lists), you MUST explicitly include `WHERE state = 1` filtering unless instructed to fetch historical or deleted data.

## 5. Reporting Joins
- Use `LEFT JOIN` extensively to map a single `users` row to its variable detail table (person vs. institution).
- Use `COALESCE` properly to handle dynamic user names or roles, preventing crashes when rendering JSON outputs.