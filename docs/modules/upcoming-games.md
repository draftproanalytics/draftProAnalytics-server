# Upcoming Games Module

## Purpose

The Upcoming Games feature displays NFL games for a selected season year, season type, and week.

## Endpoint

Current client/server integration uses a route conceptually equivalent to:

```http
GET /api/schedules/upcomingSchedule
  ?seasonYear=2026
  &seasonType=2
  &week=1
```

Use the exact existing route and parameter names in the repository.

## Filters

Required filters:

- Year
- Type
- Week

Season types currently include concepts such as:

- Preseason
- Regular season
- Postseason

Keep transport values aligned with the database/API representation.

## Special preseason aggregate rule

For any selected year:

```text
WHERE Type = Preseason
AND Week = Preseason
THEN show all preseason games for the selected year.
```

In this special case, `Week = Preseason` is an aggregate selection, not an individual numeric preseason week.

The request should therefore either:

- Omit the numeric week filter, or
- Send the established aggregate value that the server interprets as all preseason weeks

The client and server must agree on one contract.

## Normal week behavior

For regular numeric week selections:

- Preseason numeric week returns only that preseason week.
- Regular-season week returns only that regular-season week.
- Postseason round/week returns only the selected postseason segment, unless an aggregate option is explicitly defined.

## Request sequencing

When users change filters rapidly:

- Do not let an older response replace a newer response.
- Abort the prior request or compare request tokens.
- Avoid duplicate polling requests.

## Refresh behavior

The feature may refresh periodically.

Current behavior has used a refresh interval around 35 seconds.

Polling should:

- Stop when the view unmounts.
- Avoid overlapping requests.
- Preserve current filters.
- Avoid disruptive loading indicators on each background refresh.
- Surface repeated failures without flooding the UI.

## Display

Each game row should present the established schedule information, such as:

- Date/time
- Away team
- Home team
- Status
- Score when available
- Game summary when available

Team logos should use the resolved team-logo field and a stable fallback.

## Future live-game summaries

If play-by-play or summaries are added:

- Treat each game as independently refreshable.
- Avoid one failed game blocking all displayed games.
- Cache provider responses when appropriate.
- Use queue/event infrastructure only when server-side coordination adds value.
- Do not poll external providers from every browser independently at scale.

## Testing

Test:

- Year mapping
- Season-type mapping
- Numeric week mapping
- Preseason aggregate selection
- Filter reset rules
- Request cancellation/stale-response protection
- Poll cleanup
- Empty result display
- API failure display
