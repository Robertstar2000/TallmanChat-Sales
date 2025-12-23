# Agentic Workflow Implementation

## Pattern

```
Step 1: Requirements Agent + QA
Step 2: Planner Agent + QA
Steps 3-(n-1): Worker Agent + QA (for each plan step)
Final Step: Writer Agent + QA
```

## QA Loop

Each agent output goes through QA validation:
- Max 3 loops per step
- QA checks for well-formed, complete output
- QA fixes malformed LLM responses
- QA improves output quality
- After 3 loops, accepts output

## Implementation

### Core Service
`services/agentWorkflow.ts`

**Functions:**
- `runAgenticWorkflow(goal)` - Main orchestrator
- `requirementsAgent(goal)` - Step 1
- `plannerAgent(requirements)` - Step 2
- `workerAgent(step, context)` - Steps 3-(n-1)
- `writerAgent(requirements, plan, outputs)` - Final step
- `qaValidate(output, type, loopCount)` - QA validation

### Prompts
- `prompts/requirements-agent-system.md` - Requirements agent instructions
- `prompts/writer-agent-system.md` - Writer agent instructions

### UI Component
`components/AgenticWorkflow.tsx` - Simple interface to run workflows

## Usage

### From Code
```typescript
import { runAgenticWorkflow } from './services/agentWorkflow';

const result = await runAgenticWorkflow(
  'Find painters in St. Petersburg, Florida',
  (progress) => console.log(progress)
);

console.log(result.finalReport);
console.log(result.artifacts); // Map of filename -> content
```

### From UI
1. Enter goal in text area
2. Click "Run Workflow"
3. Watch progress updates
4. View final report

## Artifacts Created

Each workflow creates:
- `REQUIREMENTS.md` - Specific requirements
- `PLAN.md` - Execution plan
- `FINAL_REPORT.md` - Comprehensive report
- Additional artifacts based on work steps

## Example Flow

```
User: "Find painters in St. Petersburg, Florida"

Step 1: Requirements Agent
  → Creates specific requirements
  → QA validates (3 loops max)
  → Saves REQUIREMENTS.md

Step 2: Planner Agent
  → Creates execution plan
  → QA validates (3 loops max)
  → Saves PLAN.md

Step 3: Worker Agent (Search)
  → Executes search step
  → QA validates (3 loops max)

Step 4: Worker Agent (Collect)
  → Collects data
  → QA validates (3 loops max)

Step 5: Worker Agent (Format)
  → Formats as CSV
  → QA validates (3 loops max)

Final Step: Writer Agent
  → Creates final report
  → QA validates (3 loops max)
  → Saves FINAL_REPORT.md
```

## Configuration

### Max QA Loops
```typescript
const MAX_QA_LOOPS = 3; // In agentWorkflow.ts
```

### Ollama Settings
Uses settings from localStorage:
- `ollamaHost` (default: http://localhost:11434)
- `ollamaModel` (default: llama3.2)

## Error Handling

- Try-catch around entire workflow
- Detailed error messages
- Progress callbacks for UI updates
- Graceful failure (doesn't crash app)

## Integration

### Add to Sidebar
```typescript
// In Sidebar.tsx
<button onClick={() => onNavigateToWorkflow()}>
  Agentic Workflow
</button>
```

### Add to App
```typescript
// In index.tsx
import AgenticWorkflow from './components/AgenticWorkflow';

{currentPage === 'workflow' && <AgenticWorkflow />}
```

## Testing

### Test 1: Simple Goal
```
Goal: "What is the capital of France?"
Expected: Requirements → Plan → Answer → Report
```

### Test 2: Data Collection
```
Goal: "Find 10 coffee shops in Seattle"
Expected: Requirements → Plan → Search → Collect → Format → Report
```

### Test 3: QA Loop
```
Goal: [Something that produces malformed output]
Expected: QA catches and fixes, max 3 loops
```

## Benefits

1. ✅ Structured workflow
2. ✅ Quality assurance built-in
3. ✅ Fixes malformed responses
4. ✅ Creates proper artifacts
5. ✅ Comprehensive final reports
6. ✅ Progress tracking
7. ✅ Error handling

## Limitations

- Requires Ollama running
- Sequential execution (not parallel)
- Max 3 QA loops per step
- No human approval (fully automated)

## Next Steps

To add human-guided mode:
1. Add approval UI after steps 1 & 2
2. Add edit capability for requirements/plan
3. Add pause/resume functionality
