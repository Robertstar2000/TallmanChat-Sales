# Agent Workflow System Prompts

This directory contains prompt files for the multi-agent workflow system.

## Agent Execution Order

### Standard Mode (Fully Automated)
1. **Requirements Agent** → Creates REQUIREMENTS.md
2. **Planning Agent** → Creates PROJECT_PLAN.md
3. **Execution Agents** → Execute plan steps
4. **QA Agent** → Validates artifacts
5. **Writer Agent** → Creates FINAL_REPORT.md

### Human-Guided Mode
1. **Requirements Agent** → Creates REQUIREMENTS.md
   - ⏸️ PAUSE for user review/edit
   - ✅ Requires approval
2. **Planning Agent** → Creates PROJECT_PLAN.md
   - ⏸️ PAUSE for user review/edit
   - ✅ Requires approval
3. **Execution Agents** → Execute plan steps (auto)
4. **QA Agent** → Validates artifacts (auto)
5. **Writer Agent** → Creates FINAL_REPORT.md (auto)

## Agent Prompts

### [requirements-agent.md](requirements-agent.md)
- Analyzes user request
- Determines output type (answer/advice/calculation/html/csv/text)
- Creates bullet list of specific requirements
- Generates REQUIREMENTS.md
- Editable in human-guided mode

### [planning-agent.md](planning-agent.md)
- Reads REQUIREMENTS.md
- Creates numbered execution steps
- Adjusts plan based on output type
- Generates PROJECT_PLAN.md
- Editable in human-guided mode

### [qa-agent.md](qa-agent.md)
- Finds all empty artifacts
- Validates artifact completeness
- Requests workers to fill empty files
- Ensures quality before final report
- Runs before Writer Agent

### [writer-agent.md](writer-agent.md)
- Determines output format (code/text/spreadsheet)
- Finds all non-empty artifacts
- Creates comprehensive FINAL_REPORT.md
- References all artifacts
- Runs only in final step

## Key Artifacts

### REQUIREMENTS.md
- Created by: Requirements Agent
- UI Location: "Requirements" nav button
- Contains: Goal, output type, bullet list of requirements, assumptions, success criteria

### PROJECT_PLAN.md
- Created by: Planning Agent
- UI Location: "Plan" nav button
- Contains: Numbered execution steps, expected artifacts, success criteria

### FINAL_REPORT.md
- Created by: Writer Agent
- Contains: Executive summary, background, results, artifact list, conclusion

## Output Types

| Type | Description | Artifacts |
|------|-------------|-----------|
| `answer` | Text answer to question | FINAL_REPORT.md |
| `advice` | Recommendations | FINAL_REPORT.md |
| `calculation` | Numeric computation | FINAL_REPORT.md |
| `html` | Interactive web page | index.html + FINAL_REPORT.md |
| `csv` | Spreadsheet data | data.csv + FINAL_REPORT.md |
| `text` | Formatted document | document.txt + FINAL_REPORT.md |

## Usage

1. Load appropriate agent prompt based on workflow step
2. Provide agent with necessary context (previous artifacts)
3. Execute agent task
4. Save output artifacts
5. Proceed to next agent

## Integration

These prompts should be integrated into the Tallman Chat application to enable structured, multi-agent workflows with proper planning, execution, and reporting.
