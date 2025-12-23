# Agent-Based Workflow System Specification

## Overview
This document defines a multi-agent workflow system with human-guided mode, structured planning, and specialized output generation.

---

## Agent Definitions

### 1. Requirements Agent (Step 1)
**Purpose**: Analyze user request and define clear requirements

**Inputs**:
- User's initial request/goal

**Outputs**:
- **Goal Statement**: Clear, concise goal
- **Output Type**: One of:
  - `answer` - Text answer to a question
  - `advice` - Recommendations or guidance
  - `calculation` - Numeric computation result
  - `html` - Interactive web page (index.html)
  - `csv` - Spreadsheet data file
  - `text` - Formatted text document
- **Requirements List**: Bullet list of specific, actionable requirements (NOT vague statements)
  - Format: Bullet points (e.g., "- Identify geographic area", "- Find painters", "- Research each painter", "- Sort painters by ratings")
- **Assumptions**: Any assumptions made
- **Success Criteria**: How to measure completion

**Example Output**:
```yaml
Goal: Find painters in St. Petersburg, Florida
Output Type: csv
Requirements:
  - Identify geographic area (St. Petersburg, FL)
  - Find painting contractors in the area
  - Research each painter's details
  - Collect business names, addresses, phone numbers
  - Include ratings if available
  - Sort painters by ratings
  - Minimum 20 results
Assumptions:
  - Residential painting services
  - Currently operating businesses
Success Criteria:
  - CSV file with at least 20 painter entries
  - All entries have name and contact info
```

**Editable in Human-Guided Mode**: ✅ YES

---

### 2. Planning Agent (Step 2)
**Purpose**: Create execution plan based on requirements and output type

**Inputs**:
- Requirements from Step 1
- Output Type from Step 1

**Outputs**:
- **Project Plan**: Numbered list of execution steps
- **Plan Adjustments**: Modifications based on output type
  - If `html`: Include UI design, styling, interactivity steps, format and produce artifact(s)
  - If `csv`: Include data collection, formatting, validation steps, format and produce artifact(s)
  - If `calculation`: Include formula, computation, verification steps, format and produce artifact(s)
  - If `text`: Include research, develop content, format and produce artifact(s)
  - If `answer/advice`: Include research, analysis, synthesis steps, format and produce artifact(s)
- **Artifact List**: Files to be created

**Example Output**:
```yaml
Project Plan:
  Step 1: Search Google Maps API for painters in St. Petersburg, FL
  Step 2: Extract business data (name, address, phone, rating)
  Step 3: Format data into CSV structure
  Step 4: Validate data completeness
  Step 5: Generate final CSV file
  Step 6: Create summary report

Artifacts:
  - painters_st_petersburg.csv
  - FINAL_REPORT.md
```

**Editable in Human-Guided Mode**: ✅ YES

---

### 3. Execution Agents (Steps 3-N)
**Purpose**: Execute individual steps from the project plan

**Inputs**:
- Assigned step from project plan
- Outputs from previous steps

**Outputs**:
- Step completion status
- Generated artifacts (if any)
- Data for next step

**Behavior**:
- Execute assigned task
- Create intermediate files as needed
- Pass results to next agent

**Editable in Human-Guided Mode**: ❌ NO (auto-execute after plan approval)

---

### 4. QA Agent (Before Final Step)
**Purpose**: Validate artifacts and ensure completeness

**Responsibilities**:
- Find all empty artifacts
- Identify incomplete or missing files
- Request worker agents to fill in empty artifacts
- Validate artifact quality
- Ensure all planned artifacts exist and are non-empty

**Runs**: After execution agents, before Writer Agent

---

### 5. Writer Agent (Final Step)
**Purpose**: Generate final deliverables and human-readable report

**Responsibilities**:

#### A. Determine Output Format
Based on Output Type from Step 1:
- `answer` → Text report only
- `advice` → Text report with recommendations
- `calculation` → Text report with numeric results
- `html` → index.html file + text report
- `csv` → .csv file + text report
- `text` → Formatted text document + report

#### B. Find All Non-Empty Artifacts
- Scan project directory for generated files
- Identify all non-empty artifacts
- Validate file formats and contents

#### C. Create Final Report
**Required Sections**:
1. **Executive Summary**: Brief overview of goal and outcome
2. **Background**: Context and approach taken
3. **Results**: Main findings/outputs
4. **Artifacts**: List of generated files with descriptions
5. **Conclusion**: Summary and next steps (if applicable)

**Format**: Human-readable markdown text

#### D. Artifact References
- List all non-empty files created
- Provide brief description of each file
- Include file paths/names

**Example Final Report**:
```markdown
# Final Report: Painters in St. Petersburg, Florida

## Executive Summary
Successfully identified and compiled contact information for 25 painting contractors 
in St. Petersburg, Florida. Data includes business names, addresses, phone numbers, 
and customer ratings.

## Background
The goal was to create a comprehensive list of painting services in St. Petersburg, FL 
for residential customers. We used Google Maps API and local business directories to 
gather current, verified business information.

## Results
- Total businesses found: 25
- Average rating: 4.3/5.0
- All entries include complete contact information
- Data validated for accuracy and current operation status

## Artifacts
1. **painters_st_petersburg.csv** (5.2 KB)
   - CSV spreadsheet with 25 painter entries
   - Columns: Business Name, Address, Phone, Rating, Website
   - Ready for import into Excel or Google Sheets

## Conclusion
The dataset provides a solid foundation for contacting painting contractors in the area. 
All businesses are currently operating and have been verified within the last 30 days.
```

**Runs**: Only in final step (after all execution agents complete)

---

## Workflow Modes

### Standard Mode
1. Requirements Agent runs → generates requirements and REQUIREMENTS.md
2. Planning Agent runs → generates plan and PROJECT_PLAN.md
3. Execution Agents run → execute plan steps
4. QA Agent runs → validates artifacts
5. Writer Agent runs → generates final report

**User Interaction**: None (fully automated)

---

### Human-Guided Mode
1. Requirements Agent runs → generates requirements and REQUIREMENTS.md
   - **PAUSE**: User reviews and edits requirements
   - **APPROVAL REQUIRED**: User must approve to continue
   
2. Planning Agent runs → generates plan and PROJECT_PLAN.md
   - **PAUSE**: User reviews and edits plan
   - **APPROVAL REQUIRED**: User must approve to continue
   
3. Execution Agents run → execute plan steps
   - **NO PAUSE**: Runs automatically after approval
   
4. QA Agent runs → validates artifacts
   - **NO PAUSE**: Runs automatically
   
5. Writer Agent runs → generates final report
   - **NO PAUSE**: Runs automatically

**User Interaction**: Steps 1 and 2 only

---

## Project Plan Artifact

**File**: `PROJECT_PLAN.md`
**UI Location**: Displayed under navigation button "Plan"

**Contents**:
```markdown
# Project Plan

## Goal
[Goal statement from Step 1]

## Output Type
[answer | advice | calculation | html | csv]

## Requirements
1. [Requirement 1]
2. [Requirement 2]
...

## Execution Steps
Step 1: [Description]
Step 2: [Description]
Step 3: [Description]
...
Step N: Generate final report

## Expected Artifacts
- [artifact1.ext]
- [artifact2.ext]
- FINAL_REPORT.md

## Success Criteria
- [Criterion 1]
- [Criterion 2]
```

**Created By**: Planning Agent (Step 2)
**Updated By**: Writer Agent (adds completion status)

---

## Requirements Artifact

**File**: `REQUIREMENTS.md`
**UI Location**: Displayed under navigation button "Requirements"

**Contents**:
```markdown
# Requirements

## Goal
[Goal statement from Step 1]

## Output Type
[answer | advice | calculation | html | csv | text]

## Requirements List
- [Requirement 1 - e.g., Identify geographic area]
- [Requirement 2 - e.g., Find painters]
- [Requirement 3 - e.g., Research each painter]
- [Requirement 4 - e.g., Sort painters by ratings]
...

## Assumptions
- [Assumption 1]
- [Assumption 2]

## Success Criteria
- [Criterion 1]
- [Criterion 2]
```

**Created By**: Requirements Agent (Step 1)

---

## Output Type Specifications

### 1. Answer (`answer`)
**Use Case**: Answering factual questions

**Artifacts**:
- FINAL_REPORT.md (text answer)

**Writer Agent Behavior**:
- Focus on clear, concise answer
- Include supporting evidence
- Cite sources if applicable

---

### 2. Advice (`advice`)
**Use Case**: Providing recommendations or guidance

**Artifacts**:
- FINAL_REPORT.md (recommendations)

**Writer Agent Behavior**:
- Structure as actionable recommendations
- Include pros/cons
- Prioritize suggestions

---

### 3. Calculation (`calculation`)
**Use Case**: Numeric computations

**Artifacts**:
- FINAL_REPORT.md (results and methodology)

**Writer Agent Behavior**:
- Show formulas used
- Display step-by-step calculation
- Include units and precision
- Verify results

---

### 4. HTML (`html`)
**Use Case**: Interactive web pages or visualizations

**Artifacts**:
- index.html (functional web page)
- FINAL_REPORT.md (usage instructions)

**Writer Agent Behavior**:
- Ensure HTML is valid and functional
- Include CSS/JavaScript if needed
- Test in browser
- Document features in report

**Planning Agent Adjustments**:
- Add UI/UX design step
- Add styling step
- Add interactivity step
- Add browser testing step

---

### 5. CSV (`csv`)
**Use Case**: Tabular data, spreadsheets

**Artifacts**:
- data.csv (properly formatted CSV)
- FINAL_REPORT.md (data description)

**Writer Agent Behavior**:
- Validate CSV format
- Ensure proper escaping
- Include header row
- Document columns in report

**Planning Agent Adjustments**:
- Add data collection step
- Add data cleaning step
- Add CSV formatting step
- Add validation step
- Add format and produce artifact(s) step

---

### 6. Text (`text`)
**Use Case**: Formatted text documents, reports, articles

**Artifacts**:
- document.txt or document.md (formatted text)
- FINAL_REPORT.md (document description)

**Writer Agent Behavior**:
- Ensure proper formatting
- Validate content completeness
- Check grammar and structure
- Document purpose in report

**Planning Agent Adjustments**:
- Add research step
- Add content development step
- Add formatting step
- Add format and produce artifact(s) step

---

## Requirements Specification Rules

### ❌ INCORRECT (Vague)
```
Find painters in St. Petersburg Florida: 
Clarify requirements, assumptions, and success criteria.
```

### ✅ CORRECT (Specific)
```
Goal: Find painters in St. Petersburg, Florida

Requirements:
1. Search for licensed painting contractors in St. Petersburg, FL
2. Collect: business name, address, phone, email, rating
3. Verify businesses are currently operating
4. Minimum 20 results
5. Export to CSV format

Assumptions:
- Residential painting services
- Within city limits of St. Petersburg
- English-speaking businesses

Success Criteria:
- CSV file with ≥20 entries
- All entries have name + phone
- ≥80% have ratings
- File opens correctly in Excel
```

---

## Implementation Checklist

### Requirements Agent
- [ ] Parse user goal
- [ ] Determine output type (answer/advice/calculation/html/csv/text)
- [ ] Generate bullet list of specific requirements (not meta-requirements)
- [ ] List assumptions
- [ ] Define success criteria
- [ ] Create REQUIREMENTS.md artifact
- [ ] Support editing in human-guided mode

### Planning Agent
- [ ] Read requirements and output type
- [ ] Generate numbered execution steps
- [ ] Adjust plan based on output type (add format and produce artifact steps)
- [ ] Create artifact list
- [ ] Generate PROJECT_PLAN.md artifact
- [ ] Support editing in human-guided mode

### Execution Agents
- [ ] Execute assigned step
- [ ] Create intermediate artifacts
- [ ] Pass data to next agent
- [ ] Log progress

### QA Agent
- [ ] Find all empty artifacts
- [ ] Identify incomplete files
- [ ] Request workers to fill empty artifacts
- [ ] Validate artifact quality
- [ ] Run before Writer Agent

### Writer Agent
- [ ] Determine output format from output type (code/text/spreadsheet)
- [ ] Find all non-empty artifacts in project
- [ ] Generate required artifacts (HTML/CSV/TXT/etc)
- [ ] Validate artifact contents (non-empty)
- [ ] Create FINAL_REPORT.md with all sections
- [ ] Reference all artifacts in report with descriptions
- [ ] Ensure human-readable format
- [ ] Run only in final step

### Workflow Controller
- [ ] Support standard mode (fully automated)
- [ ] Support human-guided mode (pause at steps 1-2 for approval)
- [ ] Enforce approval requirements
- [ ] Pass data between agents
- [ ] Trigger QA Agent before Writer Agent
- [ ] Trigger Writer Agent at end

### UI Components
- [ ] Add "Plan" navigation button → displays PROJECT_PLAN.md
- [ ] Add "Requirements" navigation button → displays REQUIREMENTS.md
- [ ] Support editing in human-guided mode
- [ ] Show approval prompts for steps 1-2

---

## Example Workflows

### Example 1: Question Answering
```
User: "What is the capital of France?"

Step 1 (Requirements Agent):
  Goal: Answer question about French capital
  Output Type: answer
  Requirements: Provide factual answer with verification

Step 2 (Planning Agent):
  Step 1: Research French capital
  Step 2: Verify information
  Step 3: Generate final report

Step 3 (Execution): Research → Paris

Step 4 (Writer Agent):
  Artifacts: FINAL_REPORT.md
  Content: "The capital of France is Paris..."
```

### Example 2: Data Collection
```
User: "Create a list of coffee shops in Seattle"

Step 1 (Requirements Agent):
  Goal: Compile coffee shop directory for Seattle
  Output Type: csv
  Requirements: 
    - Find 30+ coffee shops
    - Include name, address, hours
    - Export to CSV

Step 2 (Planning Agent):
  Step 1: Search Google Maps for Seattle coffee shops
  Step 2: Extract business data
  Step 3: Format as CSV
  Step 4: Validate data
  Step 5: Generate report
  
  Artifacts: seattle_coffee_shops.csv, FINAL_REPORT.md

Steps 3-6 (Execution): [Execute plan]

Step 7 (Writer Agent):
  Creates: seattle_coffee_shops.csv (35 entries)
  Creates: FINAL_REPORT.md (describes dataset)
```

---

## Existing System Prompt Rules

All agents must incorporate these existing system rules from the Tallman Chat application:

### Base Identity & Role
```
You are a knowledgeable employee of Tallman Equipment Company, a trusted provider 
of professional-grade tools and equipment for the power utility industry.
```

### Knowledge Areas
You are deeply familiar with:
- All Tallman product categories and catalog items
- Service offerings including rentals, repairs, testing, and custom solutions
- Industry-specific terminology and equipment (stringing blocks, conductors, transformers, etc.)
- Location details for all branches (Columbus IN HQ, Addison IL, Lake City FL)
- Contact information and how to connect customers with the right resources
- Company history and heritage (employee-owned since 2014, founded post-WWII)
- Customer support protocols and being sensitive to customer needs

### Response Guidelines
- Always respond helpfully, professionally, and with expertise
- Use the knowledge base context to provide detailed, accurate information
- Be customer-focused and ready to help with any questions about Tallman's tools, equipment, or services
- If a question falls outside your knowledge area, gracefully redirect to how Tallman's expertise can assist

### Key Traits
- Expert
- Helpful
- Professional
- Knowledgeable
- Customer-Focused
- Reliable

### RAG (Retrieval-Augmented Generation) Integration

All agents must use the knowledge base retrieval system:

```typescript
// Search knowledge base for relevant context
const ragContextItems = await retrieveContext(userQuery);

// Build context string
if (ragContextItems.length > 0) {
    contextString = "Here is some relevant information from Tallman Equipment's knowledge base:\n\n" +
        ragContextItems.join('\n\n') + "\n\n";
}

// Construct prompt with context
const prompt = (contextString ? 
    `Use the following information to answer the question:\n\n${contextString}\n\nQuestion: ` : 
    '') + userQuery;
```

### Knowledge Base Content

The system includes comprehensive knowledge about:
- Company overview & locations (HQ Columbus IN, branches in Addison IL & Lake City FL)
- Contact information (877-860-5666, sales@tallmanequipment.com)
- Product categories (20+ categories from bags to underground tools)
- Services (rentals, repairs, testing, custom fabrication)
- Technical specifications and standards (ANSI, ASTM, IEEE, IEC)
- Industry terminology and equipment usage
- Company history (founded post-WWII, incorporated 1952, ESOP 2014)

### Agent-Specific Enhancements

When implementing the multi-agent workflow:

1. **Requirements Agent** must:
   - Understand Tallman Equipment context
   - Recognize power utility industry terminology
   - Identify when questions relate to products, services, or company info

2. **Planning Agent** must:
   - Consider knowledge base search as a step
   - Plan for RAG context retrieval
   - Include verification against Tallman's offerings

3. **Execution Agents** must:
   - Query knowledge base for relevant information
   - Use Tallman-specific terminology correctly
   - Maintain professional, customer-focused tone

4. **QA Agent** must:
   - Verify information accuracy against knowledge base
   - Check for proper Tallman Equipment branding
   - Ensure customer-focused language

5. **Writer Agent** must:
   - Maintain Tallman Equipment voice and tone
   - Include relevant knowledge base references
   - Ensure professional, expert presentation
   - Reference company resources appropriately

---

## Summary

This agent-based workflow system provides:
- ✅ Clear role separation
- ✅ Structured planning
- ✅ Output type flexibility
- ✅ Human oversight option
- ✅ Comprehensive final reporting
- ✅ Artifact management
- ✅ Specific (not vague) requirements
- ✅ Integration with existing Tallman Equipment knowledge base
- ✅ Preservation of company identity and expertise
- ✅ RAG-enhanced context retrieval
