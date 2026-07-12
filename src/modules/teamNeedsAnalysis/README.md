# Team Needs Analysis - Frontend Module

## Module Structure

This is a **self-contained frontend module** following the same architectural principles as the backend:

```
src/modules/teamNeedsAnalysis/
├── store/                                    # State management
│   └── teamNeedsAnalysis.store.ts           # Pinia store
├── types/                                    # Type definitions
│   └── teamNeedsAnalysis.types.ts           # All TypeScript types
├── composables/                              # Reusable composition logic
│   └── useTeamNeedsAnalysis.composable.ts   # Helper functions
├── components/                               # Shared components (empty for now)
├── views/                                    # Route components
│   ├── TeamNeedsDashboard.vue               # Main dashboard
│   └── TeamNeedsDetail.vue                  # Team detail view
├── router/                                   # Route definitions
│   └── routes.ts                            # Module routes
└── index.ts                                  # Module public API
```

## Installation

### Step 1: Copy Module to Your Project

```bash
# Copy the entire module
cp -r teamNeedsAnalysis src/modules/

# Your structure should look like:
# src/
# ├── modules/
# │   └── teamNeedsAnalysis/
# │       ├── store/
# │       ├── types/
# │       ├── composables/
# │       ├── views/
# │       ├── router/
# │       └── index.ts
```

### Step 2: Register Routes

In your main router file (`src/router/index.ts`):

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import { teamNeedsAnalysisRoutes } from '@/modules/teamNeedsAnalysis';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ... your existing routes
    ...teamNeedsAnalysisRoutes,
  ],
});

export default router;
```

### Step 3: Configure Path Aliases (if needed)

In `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Usage

### Import from Module

The module exports everything through its index file:

```typescript
// Import store
import { useTeamNeedsAnalysisStore } from '@/modules/teamNeedsAnalysis';

// Import types
import type { 
  TeamNeedsAnalysisDto, 
  PositionNeedDto 
} from '@/modules/teamNeedsAnalysis';

// Import composable
import { useTeamNeedsAnalysis } from '@/modules/teamNeedsAnalysis';

// Import routes
import { teamNeedsAnalysisRoutes } from '@/modules/teamNeedsAnalysis';
```

### Using the Store

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useTeamNeedsAnalysisStore } from '@/modules/teamNeedsAnalysis';

const store = useTeamNeedsAnalysisStore();

onMounted(async () => {
  await store.fetchTeamsNeedsDataTable(2025);
});
</script>

<template>
  <div>
    <p>Average Need Score: {{ store.averageNeedScore }}</p>
    <p>Critical Positions: {{ store.criticalNeedsCount }}</p>
  </div>
</template>
```

### Using the Composable

```vue
<script setup lang="ts">
import { useTeamNeedsAnalysis } from '@/modules/teamNeedsAnalysis';

const { 
  store,
  isLoading,
  getSeverityColorClass,
  getCriticalNeeds 
} = useTeamNeedsAnalysis();
</script>

<template>
  <div v-if="!isLoading">
    <span :class="getSeverityColorClass(75)">Critical Need</span>
  </div>
</template>
```

## Module Benefits

### ✅ Self-Contained
- All module code lives in one directory
- No scattered files across global `stores/`, `types/`, `views/`
- Easy to find and maintain related code

### ✅ Portable
- Can be copied to another project as-is
- Can be published as a separate package
- Can be git submodule or workspace

### ✅ No Name Collisions
- Module imports use relative paths internally
- Only exports through index.ts
- No global namespace pollution

### ✅ Testable
- Module is isolated and self-contained
- Easy to mock dependencies
- Clear boundaries for unit tests

### ✅ Scalable
- Add more modules without conflicts
- Each module can have its own structure
- Clear separation of concerns

## Internal Structure

### Store (`store/`)
Contains Pinia store definition. Uses **relative imports** for module types:

```typescript
import type { TeamNeedsAnalysisDto } from '../types/teamNeedsAnalysis.types';
```

### Types (`types/`)
Pure TypeScript definitions. No dependencies on other parts of the module.

### Composables (`composables/`)
Reusable composition functions. Imports from store and types using **relative paths**:

```typescript
import { useTeamNeedsAnalysisStore } from '../store/teamNeedsAnalysis.store';
import type { PositionNeedDto } from '../types/teamNeedsAnalysis.types';
```

### Views (`views/`)
Vue components for routes. Uses **relative imports**:

```typescript
import { useTeamNeedsAnalysisStore } from '../store/teamNeedsAnalysis.store';
```

### Router (`router/`)
Route definitions with lazy-loaded components:

```typescript
component: () => import('../views/TeamNeedsDashboard.vue')
```

### Index (`index.ts`)
Public API that exports everything needed from outside the module:

```typescript
export { useTeamNeedsAnalysisStore } from './store/teamNeedsAnalysis.store';
export type { TeamNeedsAnalysisDto } from './types/teamNeedsAnalysis.types';
export { useTeamNeedsAnalysis } from './composables/useTeamNeedsAnalysis.composable';
export { teamNeedsAnalysisRoutes } from './router/routes';
```

## Adding Navigation

In your main navigation component:

```vue
<template>
  <nav>
    <RouterLink :to="{ name: 'team-needs-dashboard' }">
      <i class="pi pi-chart-bar"></i>
      Team Needs
    </RouterLink>
  </nav>
</template>
```

## Environment Configuration

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Configure axios in your app setup or in a global axios config file:

```typescript
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
```

## Module Variants

### Option 1: Current Structure (Recommended)
```
src/modules/teamNeedsAnalysis/
```
✅ Matches backend structure  
✅ Clear module boundaries  
✅ Self-contained

### Option 2: Domain-First
```
src/domains/teamNeeds/
├── presentation/     # views, components
├── application/      # store, composables
└── types/
```
More complex, mirrors backend layers exactly

### Option 3: Feature-First
```
src/features/teamNeedsAnalysis/
```
Same as current but different naming convention

## Extending the Module

### Add a New Component

```bash
# Create component in module
touch src/modules/teamNeedsAnalysis/components/PositionNeedCard.vue
```

```vue
<!-- PositionNeedCard.vue -->
<script setup lang="ts">
import type { PositionNeedDto } from '../types/teamNeedsAnalysis.types';

defineProps<{
  need: PositionNeedDto;
}>();
</script>

<template>
  <div class="card">
    <h3>{{ need.position }}</h3>
    <p>Score: {{ need.needScore }}</p>
  </div>
</template>
```

Export from index.ts:

```typescript
export { default as PositionNeedCard } from './components/PositionNeedCard.vue';
```

### Add a New View

```bash
touch src/modules/teamNeedsAnalysis/views/TeamNeedsComparison.vue
```

Add route in `router/routes.ts`:

```typescript
{
  path: 'compare',
  name: 'team-needs-compare',
  component: () => import('../views/TeamNeedsComparison.vue'),
}
```

### Add a New Composable

```bash
touch src/modules/teamNeedsAnalysis/composables/usePositionAnalysis.ts
```

```typescript
import { computed } from 'vue';
import type { PositionNeedDto } from '../types/teamNeedsAnalysis.types';

export function usePositionAnalysis(needs: PositionNeedDto[]) {
  const offensiveNeeds = computed(() => 
    needs.filter(n => ['QB', 'RB', 'WR', 'TE', 'OL'].includes(n.position))
  );
  
  return { offensiveNeeds };
}
```

Export from index.ts:

```typescript
export { usePositionAnalysis } from './composables/usePositionAnalysis';
```

## Testing the Module

```typescript
// test/modules/teamNeedsAnalysis/store.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useTeamNeedsAnalysisStore } from '@/modules/teamNeedsAnalysis';

describe('TeamNeedsAnalysisStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should calculate average need score', async () => {
    const store = useTeamNeedsAnalysisStore();
    // ... test implementation
  });
});
```

## Migration from Global Structure

If you have files in global directories:

```bash
# Old structure:
src/
├── stores/teamNeedsAnalysis.store.ts
├── types/teamNeedsAnalysis.ts
├── composables/useTeamNeedsAnalysis.ts
└── views/TeamNeeds/
    ├── TeamNeedsDashboard.vue
    └── TeamNeedsDetail.vue

# New modular structure:
src/modules/teamNeedsAnalysis/
├── store/teamNeedsAnalysis.store.ts
├── types/teamNeedsAnalysis.types.ts
├── composables/useTeamNeedsAnalysis.composable.ts
└── views/
    ├── TeamNeedsDashboard.vue
    └── TeamNeedsDetail.vue
```

Update all imports from:
```typescript
import { useTeamNeedsAnalysisStore } from '@/stores/teamNeedsAnalysis.store';
```

To:
```typescript
import { useTeamNeedsAnalysisStore } from '@/modules/teamNeedsAnalysis';
```

## Best Practices

1. **Keep imports relative within the module**
   - Use `../store/` not `@/modules/teamNeedsAnalysis/store/`

2. **Export through index.ts only**
   - External code should import from module index
   - Internal code uses relative paths

3. **Don't import from other modules**
   - If you need shared code, create a `shared/` module
   - Modules should be independent

4. **Use TypeScript strictly**
   - No `any` types
   - Export all public types through index.ts

5. **Follow naming conventions**
   - Stores: `*.store.ts`
   - Types: `*.types.ts`
   - Composables: `*.composable.ts`
   - Components: PascalCase.vue

## Dependencies

The module requires:

```json
{
  "dependencies": {
    "vue": "^3.3.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "primevue": "^3.46.0",
    "primeicons": "^6.0.0",
    "axios": "^1.6.0"
  }
}
```

## Troubleshooting

**Issue**: Module imports not resolving  
**Solution**: Check `tsconfig.json` and `vite.config.ts` path aliases

**Issue**: Routes not working  
**Solution**: Ensure routes are spread into main router: `...teamNeedsAnalysisRoutes`

**Issue**: Store not reactive  
**Solution**: Ensure Pinia is installed and registered in main.ts

**Issue**: Components not found  
**Solution**: Check that lazy imports use relative paths: `() => import('../views/...')`

## Summary

This modular structure:
- ✅ Mirrors backend architecture
- ✅ Self-contained and portable
- ✅ Uses relative imports internally
- ✅ Exports clean public API
- ✅ Scales to multiple modules
- ✅ Easy to test and maintain

Perfect for enterprise Vue 3 applications!