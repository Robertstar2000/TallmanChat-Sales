# Workflow Crash Fix - Implementation Plan

## Problem Analysis

**Issue**: "No clear requirements were put in the artifacts after step 1 then it stalled on step 2 after 5 iterations the app crashed to a blank white screen."

**Root Causes**:
1. Agent workflow system is not implemented in the codebase (only documented)
2. No error handling for infinite loops
3. No timeout mechanisms
4. No artifact validation
5. Missing crash recovery

## Immediate Fixes Required

### 1. Add Error Boundaries (Prevent White Screen)
```tsx
// components/ErrorBoundary.tsx
- Catch React errors
- Display error message instead of white screen
- Provide "Reload" button
- Log errors to console
```

### 2. Add Iteration Limits (Prevent Stalling)
```typescript
// Limit agent iterations to prevent infinite loops
MAX_ITERATIONS = 10
MAX_STEP_TIME = 60000 // 60 seconds
```

### 3. Add Artifact Validation (Ensure Requirements Created)
```typescript
// Validate Step 1 output
- Check REQUIREMENTS.md exists
- Check file is not empty
- Check has required sections
- Fail fast if invalid
```

### 4. Add Progress Indicators
```tsx
// Show user what's happening
- Current step number
- Time elapsed
- Cancel button
- Error messages
```

## Implementation Priority

### Priority 1: Prevent White Screen Crash
1. Create ErrorBoundary component
2. Wrap main App component
3. Add error logging
4. Add recovery UI

### Priority 2: Prevent Infinite Loops
1. Add iteration counter
2. Add timeout mechanism
3. Add cancel button
4. Show progress

### Priority 3: Validate Artifacts
1. Check Step 1 creates REQUIREMENTS.md
2. Check Step 2 creates PROJECT_PLAN.md
3. Validate file contents
4. Show validation errors

### Priority 4: Implement Agent System
1. Create agent orchestrator
2. Implement step transitions
3. Add state management
4. Add artifact storage

## Quick Fix (Minimal Code)

Since the agent workflow isn't implemented yet, here's what needs to happen:

1. **Don't run the workflow** - It doesn't exist in code
2. **Add error boundary** - Catch crashes
3. **Add validation** - Check artifacts before proceeding
4. **Add timeouts** - Stop after N iterations or M seconds

## Files to Create/Modify

### New Files:
1. `components/ErrorBoundary.tsx` - Catch React errors
2. `services/agentOrchestrator.ts` - Manage workflow
3. `services/artifactValidator.ts` - Validate outputs
4. `hooks/useAgentWorkflow.ts` - Workflow state management

### Modified Files:
1. `index.tsx` - Wrap with ErrorBoundary
2. `hooks/useChat.ts` - Add iteration limits
3. `components/ChatInput.tsx` - Add cancel button

## Temporary Workaround

Until the agent system is implemented:

1. **Disable multi-agent workflow** - Use simple chat only
2. **Add error boundary** - Prevent white screen
3. **Add timeout** - Stop after 60 seconds
4. **Show error message** - Tell user what happened

## Next Steps

1. Implement ErrorBoundary (5 min)
2. Add iteration limits to useChat (5 min)
3. Add timeout mechanism (5 min)
4. Test crash scenarios (10 min)
5. Implement full agent system (later)
