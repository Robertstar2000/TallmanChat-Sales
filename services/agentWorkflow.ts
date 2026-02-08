// Simple Agentic Workflow System
// Step 1: Requirements Agent + QA
// Step 2: Planner Agent + QA
// Steps 3-(n-1): Worker Agent + QA
// Final Step: Writer Agent + QA
import { getApiUrl } from './config';

const MAX_QA_LOOPS = 2;

interface WorkflowStep {
  stepNumber: number;
  agent: 'requirements' | 'planner' | 'worker' | 'writer';
  output: string;
  qaValidated: boolean;
  qaLoops: number;
}

interface WorkflowResult {
  steps: WorkflowStep[];
  artifacts: Map<string, string>;
  finalReport: string;
}

async function callLLM(prompt: string, retries = 2): Promise<string> {
  const model = localStorage.getItem('openaiModel') || 'gpt-5.2';

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use backend proxy for OpenAI
      const response = await fetch(getApiUrl('/api/openai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }], // OpenAI chat format
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Parse OpenAI chat response format
      const content = data.choices?.[0]?.message?.content;

      if (!content || content.trim().length === 0) {
        throw new Error('Empty response from OpenAI');
      }

      return content;

    } catch (error) {
      if (attempt === retries) {
        throw new Error(`LLM call failed after ${retries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error('LLM call failed');
}

// QA Agent validates and improves output
async function qaValidate(output: string, stepType: string, loopCount: number): Promise<{ valid: boolean; improved: string }> {
  if (loopCount >= MAX_QA_LOOPS) {
    return { valid: true, improved: output }; // Accept after max loops
  }

  const qaPrompt = `You are a QA agent. Review this ${stepType} output and check:
1. Is it well-formed and complete?
2. Does it follow the required format?
3. Are there any errors or malformed responses?

Output to review:
${output}

If valid, respond with: VALID
If needs improvement, respond with: IMPROVE: [specific issues]`;

  const qaResponse = await callLLM(qaPrompt);

  if (qaResponse.includes('VALID')) {
    return { valid: true, improved: output };
  }

  // QA found issues - improve the output
  const improvePrompt = `Fix these issues in the output:
${qaResponse}

Original output:
${output}

Provide the corrected version:`;

  const improved = await callLLM(improvePrompt);
  return { valid: false, improved };
}

// Step 1: Requirements Agent
async function requirementsAgent(userGoal: string, onProgress?: (msg: string, agent: string, iteration: number) => void, runLog?: Array<any>): Promise<string> {
  const prompt = `You are a Requirements Agent. Analyze the user's goal and create SPECIFIC, ACTIONABLE requirements.

User Goal: ${userGoal}

❌ WRONG (Vague meta-statements):
- Clarify requirements
- Gather information
- Analyze data
- Refine goal

✅ CORRECT (Specific to the actual goal):
- Identify geographic area (St. Petersburg, FL)
- Search for painting contractors
- Collect business names and phone numbers
- Include customer ratings
- Minimum 20 results

Your requirements MUST describe WHAT DATA or WHAT ACTIONS are needed for THIS SPECIFIC GOAL.
DO NOT write meta-requirements about the planning process itself.

OUTPUT_TYPE defaults:
- Use "text" for most goals (answers, explanations, research, analysis)
- Use "html" ONLY if goal explicitly asks for app/application/program/website/interactive page
- Use "csv" ONLY if goal explicitly asks for spreadsheet/excel/csv/data table
- Use "calculation" ONLY for math/numeric computations

Format as:
GOAL: [one sentence]
OUTPUT_TYPE: [answer/advice/calculation/html/csv/text]
REQUIREMENTS:
- [specific requirement 1]
- [specific requirement 2]
...
SUCCESS_CRITERIA:
- [measurable criterion 1]
- [measurable criterion 2]`;

  let output = await callLLM(prompt);
  runLog?.push({ agent: 'requirements', iteration: 1, input: userGoal, output, timestamp: new Date().toISOString() });
  onProgress?.('Requirements generated', 'requirements', 1);
  let qaLoops = 0;

  // QA validation loop
  while (qaLoops < MAX_QA_LOOPS) {
    const qa = await qaValidate(output, 'requirements', qaLoops);
    runLog?.push({ agent: 'qa', iteration: qaLoops + 1, input: output, output: qa.improved, valid: qa.valid, timestamp: new Date().toISOString() });
    if (qa.valid) break;
    output = qa.improved;
    qaLoops++;
    onProgress?.(`QA validation loop ${qaLoops}`, 'qa', qaLoops + 1);
  }

  return output;
}

// Step 2: Planner Agent
async function plannerAgent(requirements: string, onProgress?: (msg: string, agent: string, iteration: number) => void, runLog?: Array<any>): Promise<string> {
  const prompt = `You are a Planning Agent. Create an execution plan to achieve the goal.

REQUIREMENTS FROM STEP 1:
${requirements}

Create a numbered execution plan with SPECIFIC ACTION STEPS (not meta-steps about planning).
Each step should describe WHAT WORK to do, not HOW to plan.

Example GOOD steps:
- Step 1: Research topic X and gather data
- Step 2: Analyze data and identify patterns
- Step 3: Create visualization of results
- Step 4: Generate final report

Example BAD steps (avoid these):
- Step 1: Clarify requirements
- Step 2: Refine goal
- Step 3: [Implement last requirement from step 1]

Format as:
PLAN:
Step 1: [specific action]
Step 2: [specific action]
...
Step N: Generate final report

ARTIFACTS:
- [artifact1.ext]
- [artifact2.ext]`;

  let output = await callLLM(prompt);
  runLog?.push({ agent: 'planner', iteration: 1, input: requirements, output, timestamp: new Date().toISOString() });
  onProgress?.('Plan generated', 'planner', 1);
  let qaLoops = 0;

  while (qaLoops < MAX_QA_LOOPS) {
    const qa = await qaValidate(output, 'plan', qaLoops);
    runLog?.push({ agent: 'qa', iteration: qaLoops + 1, input: output, output: qa.improved, valid: qa.valid, timestamp: new Date().toISOString() });
    if (qa.valid) break;
    output = qa.improved;
    qaLoops++;
    onProgress?.(`QA validation loop ${qaLoops}`, 'qa', qaLoops + 1);
  }

  return output;
}

// Steps 3-(n-1): Worker Agent
async function workerAgent(step: string, context: string, onProgress?: (msg: string, agent: string, iteration: number) => void, runLog?: Array<any>): Promise<string> {
  const prompt = `You are a Worker Agent. Execute this step:

${step}

Context from previous steps:
${context}

Provide the output for this step:`;

  let output = await callLLM(prompt);
  runLog?.push({ agent: 'worker', iteration: 1, input: { step, context }, output, timestamp: new Date().toISOString() });
  onProgress?.('Work step completed', 'worker', 1);
  let qaLoops = 0;

  while (qaLoops < MAX_QA_LOOPS) {
    const qa = await qaValidate(output, 'work', qaLoops);
    runLog?.push({ agent: 'qa', iteration: qaLoops + 1, input: output, output: qa.improved, valid: qa.valid, timestamp: new Date().toISOString() });
    if (qa.valid) break;
    output = qa.improved;
    qaLoops++;
    onProgress?.(`QA validation loop ${qaLoops}`, 'qa', qaLoops + 1);
  }

  return output;
}

// Final Step: Writer Agent
async function writerAgent(requirements: string, plan: string, workOutputs: string[], onProgress?: (msg: string, agent: string, iteration: number) => void, runLog?: Array<any>): Promise<string> {
  const prompt = `You are a Writer Agent. Create a comprehensive final report.

Requirements:
${requirements}

Plan:
${plan}

Work Completed:
${workOutputs.join('\n\n')}

Create a final report with:
1. Executive Summary
2. Background
3. Results
4. Artifacts (list all files created)
5. Conclusion

Format as markdown:`;

  let output = await callLLM(prompt);
  runLog?.push({ agent: 'writer', iteration: 1, input: { requirements, plan, workOutputs }, output, timestamp: new Date().toISOString() });
  onProgress?.('Final report generated', 'writer', 1);
  let qaLoops = 0;

  while (qaLoops < MAX_QA_LOOPS) {
    const qa = await qaValidate(output, 'final report', qaLoops);
    runLog?.push({ agent: 'qa', iteration: qaLoops + 1, input: output, output: qa.improved, valid: qa.valid, timestamp: new Date().toISOString() });
    if (qa.valid) break;
    output = qa.improved;
    qaLoops++;
    onProgress?.(`QA validation loop ${qaLoops}`, 'qa', qaLoops + 1);
  }

  return output;
}

export interface ProgressUpdate {
  message: string;
  agent: string;
  iteration: number;
  stepNumber: number;
}

// Main workflow orchestrator
export async function runAgenticWorkflow(
  userGoal: string,
  onProgress?: (update: ProgressUpdate) => void
): Promise<WorkflowResult> {
  const steps: WorkflowStep[] = [];
  const artifacts = new Map<string, string>();
  let totalIterations = 0;

  let currentStepNumber = 0;
  const runLog: Array<any> = [];

  const logProgress = (msg: string, agent: string, iteration: number, stepNum: number) => {
    totalIterations++;
    if (stepNum > currentStepNumber) {
      currentStepNumber = stepNum;
    }
    onProgress?.({ message: msg, agent, iteration: totalIterations, stepNumber: currentStepNumber });
  };

  try {
    // Step 1: Requirements + QA
    currentStepNumber = 1;
    logProgress('Analyzing requirements...', 'requirements', 1, 1);
    const requirements = await requirementsAgent(userGoal, (msg, agent, iter) =>
      logProgress(msg, agent, iter, 1)
      , runLog);
    steps.push({ stepNumber: 1, agent: 'requirements', output: requirements, qaValidated: true, qaLoops: 0 });
    artifacts.set('REQUIREMENTS.md', requirements);
    logProgress('Requirements complete ✓', 'requirements', 1, 1);

    // Step 2: Planning + QA
    currentStepNumber = 2;
    logProgress('Creating execution plan...', 'planner', 1, 2);
    let plan = '';
    let workSteps: string[] = [];
    try {
      plan = await plannerAgent(requirements, (msg, agent, iter) =>
        logProgress(msg, agent, iter, 2)
        , runLog);
      if (!plan || plan.trim().length === 0) {
        throw new Error('Planner returned empty plan');
      }
      steps.push({ stepNumber: 2, agent: 'planner', output: plan, qaValidated: true, qaLoops: 0 });

      // Extract work steps BEFORE saving plan
      const planLines = plan.split('\n');
      workSteps = planLines
        .filter(line => line.match(/^Step \d+:/i))
        .filter(line => !line.toLowerCase().includes('generate') && !line.toLowerCase().includes('report'))
        .slice(0, 5);

      if (workSteps.length === 0) {
        workSteps = ['Step 3: Execute the main task based on requirements'];
      }

      // Create complete execution plan with actual step numbers
      const executionPlan = `# Execution Plan\n\nStep 1: Requirements Analysis (COMPLETED)\nStep 2: Planning (COMPLETED)\n\n${workSteps.map((step, idx) => `Step ${idx + 3}: ${step.replace(/^Step \d+:\s*/i, '')}`).join('\n')}\n\nStep ${workSteps.length + 3}: Generate Final Report\n\n## Original Plan\n${plan}`;

      artifacts.set('PLAN.md', executionPlan);
      logProgress('Plan complete ✓', 'planner', 1, 2);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      logProgress(`❌ Planning failed: ${errMsg}`, 'system', 1, 2);
      throw error;
    }



    // Steps 3-(n-1): Worker + QA
    const workOutputs: string[] = [];
    for (let i = 0; i < workSteps.length; i++) {
      currentStepNumber = i + 3;
      const stepNum = currentStepNumber;
      try {
        logProgress(`Executing step ${stepNum}/${workSteps.length + 2}`, 'worker', 1, stepNum);
        const context = `Requirements:\n${requirements}\n\nPrevious work:\n${workOutputs.join('\n\n')}`;
        const output = await workerAgent(workSteps[i], context, (msg, agent, iter) =>
          logProgress(msg, agent, iter, stepNum)
          , runLog);
        workOutputs.push(output);
        steps.push({ stepNumber: stepNum, agent: 'worker', output, qaValidated: true, qaLoops: 0 });

        // Create descriptive filename from step description
        const stepDesc = workSteps[i].replace(/^Step \d+:\s*/i, '').trim();
        const filename = `Step_${stepNum}_${stepDesc.substring(0, 40).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.md`;
        artifacts.set(filename, output);

        logProgress(`Step ${stepNum} complete ✓`, 'worker', 1, stepNum);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        logProgress(`❌ Step ${stepNum} failed: ${errMsg}`, 'system', 1, stepNum);
        throw error;
      }
    }

    // Final Step: Writer + QA
    currentStepNumber = workSteps.length + 3;
    const finalStepNum = currentStepNumber;
    try {
      logProgress(`Generating final report (Step ${finalStepNum})...`, 'writer', 1, finalStepNum);
      const finalReport = await writerAgent(requirements, plan, workOutputs, (msg, agent, iter) =>
        logProgress(msg, agent, iter, finalStepNum)
        , runLog);
      steps.push({ stepNumber: finalStepNum, agent: 'writer', output: finalReport, qaValidated: true, qaLoops: 0 });
      artifacts.set('FINAL_REPORT.md', finalReport);
      artifacts.set('RUN_LOG.json', JSON.stringify(runLog, null, 2));
      logProgress(`Step ${finalStepNum} complete ✓`, 'writer', 1, finalStepNum);
      logProgress('✅ Workflow completed successfully!', 'system', 1, finalStepNum);

      return { steps, artifacts, finalReport };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      logProgress(`❌ Step ${finalStepNum} failed: ${errMsg}`, 'system', 1, finalStepNum);
      throw error;
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Workflow error:', errorMsg, errorStack);
    logProgress(`❌ Workflow failed: ${errorMsg}`, 'system', 1, steps.length + 1);

    // Return partial results if we have any
    artifacts.set('RUN_LOG.json', JSON.stringify(runLog, null, 2));
    return {
      steps,
      artifacts,
      finalReport: `# Workflow Failed\n\nError: ${errorMsg}\n\n## Completed Steps\n${steps.length} steps completed before failure.`
    };
  }
}
