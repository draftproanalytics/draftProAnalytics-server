# Client Conventions

## Component style

Use Vue 3 Composition API and:

```vue
<script setup lang="ts">
</script>
```

Do not introduce Options API code.

## TypeScript

- Strict typing is mandatory.
- Do not use `any`.
- Define component props and emits explicitly.
- Represent fixed domain choices with unions or typed option objects.
- Normalize API payloads at the feature boundary.
- Treat nullable values explicitly.

Example:

```ts
type SeasonType = 1 | 2 | 3;

interface SeasonOption {
  label: string;
  value: SeasonType;
}
```

## Feature structure

Follow the existing repository organization. A feature commonly contains some of:

```text
features/<feature>/
  api/
  components/
  stores/
  types/
  views/
  routes/
```

Do not reorganize an established feature solely to match a preferred template.

## Views and components

- Views coordinate page-level behavior.
- Reusable components own focused UI responsibilities.
- Dialog components should own form state when practical.
- Avoid oversized components that combine fetching, mapping, validation, table behavior, and multiple dialogs without separation.
- Keep props stable and domain-oriented.

## Pinia

Use Pinia for state that is:

- Shared across components
- Needed across routes
- Long-lived during a user workflow
- Worth centralizing for loading/error behavior

Do not create a store for trivial local dialog state.

Stores should expose domain actions such as:

- `loadUpcomingGames`
- `addPlayerAward`
- `removeTeamNeeds`
- `assumeRole`

Avoid exposing only raw mutation functions.

## API modules

- Keep API calls in typed API modules or the established feature service.
- Use `VITE_API_BASE_URL`.
- Use server query parameter names exactly.
- Encode optional filters deliberately.
- Do not send `undefined` values accidentally.
- Use DTO interfaces for request and response data.
- Map server data into view models when presentation labels differ.

## Filtering

Filtering rules must have one clear source of truth.

For server-backed datasets:

- The client selects filters.
- The API request communicates them explicitly.
- The server applies domain filtering.
- The client may perform display-only filtering after retrieval when documented.

For dependent filters:

- Reset invalid child selections when a parent changes.
- Do not reset a valid special aggregate selection.
- Prevent stale responses from replacing newer results.
- Treat labels and transport values separately.

## PrimeVue

### DataTable

- Use stable `dataKey` values.
- Enable sorting for columns users need to compare.
- Use pagination for large datasets.
- Provide a clear empty state.
- Keep action columns narrow and explicit.
- Use checkbox selection for bulk actions when required.
- Refresh rows after successful mutations.

### Dialog

- Use dialogs for focused create/edit workflows.
- Size the dialog to the form rather than the viewport when practical.
- Use rounded styling consistent with the application theme.
- Reset validation and form state when opening for a new record.
- Preserve the existing record while editing.
- Disable submit while saving.

### Dropdown and MultiSelect

- Import or register PrimeVue components consistently with the repository.
- Define `optionLabel` and `optionValue`.
- Keep display labels user-friendly.
- Avoid storing whole option objects unless the feature requires them.

## Loading and errors

Each server-backed page should account for:

- Initial loading
- Refresh loading
- Empty results
- Validation errors
- API errors
- Partial UI state after failed mutation

Do not rely solely on console errors.

## Routing

- Route metadata must include the required authorization domain/action where applicable.
- Route guards enforce access.
- Navigation hiding improves usability but is not authorization.
- Preserve route names used by navigation and redirects.
- Lazy-load feature views where that is the existing convention.

## Accessibility

- Buttons should describe their action.
- Icon-only buttons need accessible labels or tooltips.
- Form fields need visible labels.
- Destructive actions should be distinguishable from normal actions.
- Keyboard focus should remain usable in dialogs and menus.

## Testing targets

Prioritize tests for:

- Filter-to-query mapping
- Store actions
- DTO-to-view-model mapping
- Domain labels
- Special filter behavior
- Dialog create/update/delete flows
- Route authorization metadata
