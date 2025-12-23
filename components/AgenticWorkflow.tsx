import React, { useState } from 'react';
import { runAgenticWorkflow, ProgressUpdate } from '../services/agentWorkflow';

interface ExecutionLog {
  iteration: number;
  agent: string;
  message: string;
  stepNumber: number;
}

const AgenticWorkflow: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionLog, setExecutionLog] = useState<ExecutionLog[]>([]);
  const [requirements, setRequirements] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Map<string, string>>(new Map());
  const [jsonState, setJsonState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'log' | 'requirements' | 'plan' | 'result' | 'artifacts' | 'runlog' | 'json'>('log');

  const handleRun = async () => {
    if (!goal.trim()) return;
    
    setIsRunning(true);
    setError(null);
    setResult(null);
    setRequirements(null);
    setPlan(null);
    setArtifacts(new Map());
    setJsonState(null);
    setExecutionLog([]);
    setActiveTab('runlog');
    
    try {
      const workflowResult = await runAgenticWorkflow(goal, (update: ProgressUpdate) => {
        setExecutionLog(prev => [...prev, {
          iteration: update.iteration,
          agent: update.agent,
          message: update.message,
          stepNumber: update.stepNumber
        }]);
      });
      
      console.log('Workflow completed. Artifacts:', workflowResult.artifacts.size);
      console.log('Artifact keys:', Array.from(workflowResult.artifacts.keys()));
      
      const reqs = workflowResult.artifacts.get('REQUIREMENTS.md') || '';
      const planDoc = workflowResult.artifacts.get('PLAN.md') || '';
      
      setRequirements(reqs);
      setPlan(planDoc);
      setResult(workflowResult.finalReport);
      setArtifacts(new Map(workflowResult.artifacts));
      setJsonState({
        goal,
        steps: workflowResult.steps,
        artifacts: Array.from(workflowResult.artifacts.entries()).map(([k, v]) => ({ name: k, size: v.length })),
        timestamp: new Date().toISOString(),
        totalSteps: workflowResult.steps.length
      });
      setActiveTab('result');
    } catch (err) {
      console.error('Workflow error:', err);
      setError(err instanceof Error ? err.message : 'Workflow failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Agentic Workflow
      </h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Enter your goal:
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g., Find painters in St. Petersburg, Florida"
          className="w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          rows={3}
          disabled={isRunning}
        />
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          This process will take a while so be patient as it will do what you have asked however complex. Once you exit the application the contents will be cleared, so save whatever you need for future use by using the various downloads available below. If you need the output to generate a spreadsheet or software code, request this in the goal statement. For more instructions use the help function in the upper right of the screen.
        </p>
      </div>
      
      <button
        onClick={handleRun}
        disabled={isRunning || !goal.trim()}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg"
      >
        {isRunning ? 'Running...' : 'Run Workflow'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      {(isRunning || executionLog.length > 0 || requirements || plan || result) && (
        <div className="mt-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('requirements')}
              disabled={!requirements}
              className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'requirements' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 dark:text-gray-400'} ${!requirements ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Requirements
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              disabled={!plan}
              className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'plan' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 dark:text-gray-400'} ${!plan ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Plan
            </button>
            <button
              onClick={() => setActiveTab('result')}
              disabled={!result}
              className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'result' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 dark:text-gray-400'} ${!result ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Result
            </button>
            <button
              onClick={() => setActiveTab('artifacts')}
              disabled={artifacts.size === 0}
              className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'artifacts' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 dark:text-gray-400'} ${artifacts.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Support Artifacts ({artifacts.size})
            </button>
            <button
              onClick={() => setActiveTab('runlog')}
              className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'runlog' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Run Log ({executionLog.length})
            </button>
            <button
              onClick={() => setActiveTab('json')}
              disabled={!jsonState}
              className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'json' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 dark:text-gray-400'} ${!jsonState ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              JSON State
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-h-[600px] overflow-y-auto">
            {activeTab === 'requirements' && (
              requirements ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">{requirements}</pre>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Requirements not yet generated...</p>
              )
            )}
            
            {activeTab === 'plan' && (
              plan ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">{plan}</pre>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Plan not yet generated...</p>
              )
            )}
            
            {activeTab === 'result' && (
              result ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">{result}</pre>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Result not yet generated...</p>
              )
            )}
            
            {activeTab === 'artifacts' && (
              artifacts.size > 0 ? (
                <div className="space-y-4">
                  {Array.from(artifacts.entries()).map(([name, content], idx) => (
                    <div key={`${name}-${idx}`} className="border-b border-gray-300 dark:border-gray-600 pb-4 last:border-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{name}</h4>
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-3 rounded">{content || '(empty)'}</pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No artifacts generated yet...</p>
              )
            )}
            
            {activeTab === 'runlog' && (
              executionLog.length > 0 ? (
                <div className="space-y-2">
                  {executionLog.map((log, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">#{log.iteration}</span>
                      <span className="mx-2 text-indigo-600 dark:text-indigo-400 font-medium">[{log.agent}]</span>
                      <span className="text-gray-700 dark:text-gray-300">Step {log.stepNumber}: {log.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No execution log yet...</p>
              )
            )}
            
            {activeTab === 'json' && (
              jsonState ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">{JSON.stringify(jsonState, null, 2)}</pre>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">JSON state not yet available...</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgenticWorkflow;
