# nflverse player-production import fix

## Corrected

- Reads `recent_team`, the current nflverse player-summary team column.
- Retains fallbacks for `team` and `current_team`.
- Updates job `processedItems` after staging so completed jobs display `staged/total` instead of `0/total`.

## Existing staged rows

Rows imported before this fix generally have an empty `teamAbbreviation` and cannot be auto-matched. Delete those staging rows for the affected season/summary and rerun the import.
