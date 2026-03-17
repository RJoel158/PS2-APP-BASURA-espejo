---
description: "Use when: changing MySQL database schemas, writing raw SQL scripts, or adding models in Node.js for GreenBit"
globs: "back/Models/**/*.js, back/Scripts/**/*.sql, DB/**/*.sql"
---
# GreenBit Database schema & Models Guidelines

## 1. Cascading relationships
- `score` cascades on `appointmentconfirmation`.
- Specific roles (`person`/`institution`) cascade on `users`.
- Conversely, some history references only `SET NULL`.
- **CRITICAL RULE:** Never delete a user manually from the database via raw queries without verifying if it permanently drops tied appointment and reporting metrics. Use soft deletes (`state = 0`) where applicable (`TINYINT` states).

## 2. Table `state` variables
- ALL soft deactivations use `state` or `estado`. `1 = active`, `0 = inactive`.
- The following tables rely on this flag to preserve historical snapshots: `users`, `score`, `request`, `appointmentconfirmation`, `person`, `institution`.
- Never use `DELETE` operations on these records. Use `UPDATE ... SET state=0`.

## 3. Rating calculations and insertion
- `rating` values range from 1 to 5.
- Base ranking points added to `rating` defines the final `score`.
- Default values must be respected. Check `BASE_POINTS` configurations.

## 4. History preservation
- Ranking history triggers capture the `ranking_tops` state into `ranking_history`. It is absolutely forbidden to mutate data on `ranking_history` retroactively.
- Always append to history logs or create isolated version records instead of updating row values for past transactions and points.