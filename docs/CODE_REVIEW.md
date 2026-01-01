# React/TypeScript Code Review Guide

A comprehensive guide for reviewing and improving React/TypeScript codebases, including AI-assisted review prompts.

---

## Quick Checklist

### Before Committing

- [ ] No TypeScript errors or warnings
- [ ] No unused imports/variables
- [ ] All functions have return types
- [ ] No `console.log` left behind
- [ ] Error states handled
- [ ] Loading states handled
- [ ] No hardcoded strings/magic numbers

### Component Quality

- [ ] Single responsibility principle followed
- [ ] Props are properly typed
- [ ] No prop drilling beyond 2 levels
- [ ] useEffect dependencies are correct
- [ ] No unnecessary re-renders
- [ ] Component is reasonably sized (<200 lines)

### Type Safety

- [ ] No `any` types (use `unknown` if needed)
- [ ] Null/undefined cases handled
- [ ] API responses are typed
- [ ] Event handlers are typed

### Testing & Reliability

- [ ] Edge cases considered
- [ ] Error boundaries in place where needed
- [ ] Async operations have error handling
- [ ] Form validation implemented

---

## Detailed Review Guidelines

### Phase 1: Code Smell Detection

Use this prompt to identify common issues:

```
Review this code for common code smells:
- Functions longer than 30 lines
- Components doing too many things (violating single responsibility)
- Deeply nested conditionals (>3 levels)
- Magic numbers/strings without constants
- Repeated code blocks that should be abstracted
- Any "any" types in TypeScript

For each issue found, explain WHY it's problematic and suggest a fix.
```

#### What to Look For

| Code Smell     | Why It's Bad                         | Solution                          |
| -------------- | ------------------------------------ | --------------------------------- |
| Long functions | Hard to test, understand, maintain   | Extract into smaller functions    |
| Deep nesting   | Cognitive complexity, hard to follow | Early returns, extract conditions |
| Magic numbers  | Unclear intent, hard to change       | Use named constants               |
| Repeated code  | DRY violation, maintenance burden    | Abstract into utilities/hooks     |
| `any` types    | Defeats TypeScript's purpose         | Define proper interfaces          |

---

### Phase 2: React-Specific Quality

Use this prompt for React-focused review:

```
Analyze this React component for:
- Unnecessary re-renders (missing useMemo/useCallback where needed)
- State that should be derived instead of stored
- useEffect with missing or incorrect dependencies
- Props drilling that should use context
- Components that should be split into smaller pieces
- Inline functions in JSX that cause re-renders

Rate severity: 🔴 critical, 🟡 should fix, 🟢 nice to have
```

#### Common React Anti-Patterns

**❌ Bad: Storing derived state**

```tsx
const [items, setItems] = useState([])
const [filteredItems, setFilteredItems] = useState([])

useEffect(() => {
  setFilteredItems(items.filter(i => i.active))
}, [items])
```

**✅ Good: Derive during render**

```tsx
const [items, setItems] = useState([])
const filteredItems = useMemo(() => items.filter(i => i.active), [items])
```

**❌ Bad: Inline functions causing re-renders**

```tsx
<Button onClick={() => handleClick(id)} />
```

**✅ Good: Memoized callback**

```tsx
const handleButtonClick = useCallback(() => handleClick(id), [id, handleClick])
;<Button onClick={handleButtonClick} />
```

**❌ Bad: Missing cleanup**

```tsx
useEffect(() => {
  const subscription = api.subscribe(data)
}, [])
```

**✅ Good: Proper cleanup**

```tsx
useEffect(() => {
  const subscription = api.subscribe(data)
  return () => subscription.unsubscribe()
}, [])
```

---

### Phase 3: TypeScript Strictness

Use this prompt for type safety review:

```
Review this TypeScript code for type safety:
- Places using "any" that could have proper types
- Missing return types on functions
- Loose types that should be narrowed (string vs union of literals)
- Missing null/undefined checks
- Interfaces that should be stricter
- Generic types that could improve reusability

Provide the improved type definitions.
```

#### TypeScript Best Practices

**Prefer union types over loose strings:**

```tsx
// ❌ Bad
type Status = string

// ✅ Good
type Status = 'pending' | 'loading' | 'success' | 'error'
```

**Always type function returns:**

```tsx
// ❌ Bad
const fetchUser = async (id: string) => {
  const response = await api.get(`/users/${id}`)
  return response.data
}

// ✅ Good
const fetchUser = async (id: string): Promise<User> => {
  const response = await api.get(`/users/${id}`)
  return response.data
}
```

**Use discriminated unions for state:**

```tsx
// ❌ Bad
interface State {
  loading: boolean
  error: Error | null
  data: User | null
}

// ✅ Good
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: User }
```

---

### Phase 4: Architecture & Patterns

Use this prompt for structural review:

```
Review this codebase structure for:
- Separation of concerns (UI vs logic vs data)
- Consistent patterns across similar components
- Proper abstraction of API/Firebase calls (not scattered throughout components)
- Error handling patterns
- Loading/error state management consistency

Suggest a refactoring plan prioritized by impact.
```

#### Recommended Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # Base components (Button, Input, etc.)
│   └── features/        # Feature-specific components
├── hooks/               # Custom React hooks
├── services/            # API/Firebase abstraction layer
├── types/               # TypeScript interfaces/types
├── utils/               # Pure utility functions
├── contexts/            # React contexts
├── pages/               # Route-level components
└── constants/           # App-wide constants
```

#### Separation of Concerns

```tsx
// ❌ Bad: Everything in component
const UserProfile = () => {
  const [user, setUser] = useState(null)

  useEffect(() => {
    firebase
      .firestore()
      .collection('users')
      .doc(id)
      .get()
      .then(doc => setUser(doc.data()))
  }, [id])

  return <div>{user?.name}</div>
}

// ✅ Good: Separated concerns
// hooks/useUser.ts
const useUser = (id: string) => {
  return useQuery(['user', id], () => userService.getById(id))
}

// services/userService.ts
const userService = {
  getById: async (id: string): Promise<User> => {
    const doc = await firebase.firestore().collection('users').doc(id).get()
    return doc.data() as User
  },
}

// components/UserProfile.tsx
const UserProfile = ({ id }: Props) => {
  const { data: user, isLoading, error } = useUser(id)

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  return <div>{user.name}</div>
}
```

---

### Phase 5: Incremental Improvement

Use this prompt for step-by-step refactoring:

```
I want to improve this code incrementally. For each issue:

1. Show the problematic code snippet
2. Explain the problem in one sentence
3. Show the improved version
4. Explain what changed and why

Start with the highest-impact, lowest-risk improvements first.
Do NOT refactor everything at once - give me 3-5 changes I can
make and test individually.
```

#### Prioritization Matrix

| Impact | Risk | Priority          |
| ------ | ---- | ----------------- |
| High   | Low  | 🔴 Do first       |
| High   | High | 🟡 Plan carefully |
| Low    | Low  | 🟢 Quick wins     |
| Low    | High | ⚪ Skip or defer  |

---

### Phase 6: Before/After Review

Use this prompt after refactoring:

```
Here's my original code:
[paste original]

Here's my refactored version:
[paste refactored]

Review:
1. Did I introduce any bugs or regressions?
2. Did I miss any edge cases the original handled?
3. Is the new version actually better? Why/why not?
4. Any further improvements to suggest?
```

---

## Firebase-Specific Guidelines

Use this prompt for Firebase/Firestore code:

```
Review this Firebase/Firestore code for:
- Security: data validation before writes
- Performance: unnecessary reads, missing indexes hints
- Real-time listeners not being unsubscribed
- Batch operations that should be transactions (or vice versa)
- Error handling for offline scenarios
- Rules alignment: does the code assume permissions it might not have?
```

---

## Dead Code Detection

### Using CLI Tools

```bash
# Find orphaned files (not imported anywhere)
npx madge --extensions ts,tsx src/ --orphans

# Find circular dependencies
npx madge --extensions ts,tsx src/ --circular

# TypeScript strict checks
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
```

### AI Prompt for Dead Code

```
Review this codebase for dead code:
- Unused exports
- Functions defined but never called
- Props passed but not used
- State that's set but never read
- Commented-out code blocks
- Imports that aren't used

List each finding with file location and suggested action (remove/verify/keep).
```

---

## Recommended tsconfig.json Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## ESLint Rules to Enable

```json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

---

## Quick Reference: Severity Levels

| Level            | Meaning                               | Action              |
| ---------------- | ------------------------------------- | ------------------- |
| 🔴 Critical      | Bugs, security issues, data loss risk | Fix immediately     |
| 🟡 Should Fix    | Performance, maintainability issues   | Fix before merge    |
| 🟢 Nice to Have  | Style, minor improvements             | Fix when convenient |
| ⚪ Informational | Suggestions, alternatives             | Consider for future |

---

## Usage Tips

1. **Start with the checklist** for quick self-review before commits
2. **Use phase prompts progressively** - don't try to fix everything at once
3. **Always test after each change** - refactoring can introduce subtle bugs
4. **Document decisions** - add comments explaining non-obvious choices
5. **Review in small batches** - large PRs are harder to review thoroughly

---

_Last updated: Generated template - customize for your project_
