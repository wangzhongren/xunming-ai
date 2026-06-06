import React, { useState, useEffect, useCallback, useRef } from 'react';
import PlannerColumn from './components/PlannerColumn';
import StrategistColumn from './components/StrategistColumn';
import ExecutorColumn from './components/ExecutorColumn';
import EvidenceColumn from './components/EvidenceColumn';
import VerifierColumn from './components/VerifierColumn';
import PipelineSidebar from './components/PipelineSidebar';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [finalResult, setFinalResult] = useState("");
  const [executorOutput, setExecutorOutput] = useState("");
  const [currentStage, setCurrentStage] = useState("IDLE");

  const [streamingResult, setStreamingResult] = useState("");
  const [streamingPlanner, setStreamingPlanner] = useState("");
  const [streamingStrategist, setStreamingStrategist] = useState("");
  const [streamingVerifier, setStreamingVerifier] = useState("");
  const [streamingStatus, setStreamingStatus] = useState("");
  const [execRounds, setExecRounds] = useState([]);
  const pendingRoundRef = useRef({ text: '', toolName: null, toolArgs: null, toolResult: null });
  const [inspToolEvents, setInspToolEvents] = useState([]);

  const [workspace, setWorkspace] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [plannerDone, setPlannerDone] = useState(false);
  const executorOutputRef = useRef('');
  const strategistPlanRef = useRef('');
  const [strategistPlan, setStrategistPlan] = useState('');
  const [strategistFeedback, setStrategistFeedback] = useState('');
  const [strategistDone, setStrategistDone] = useState(false);
  const [inspectorEvidence, setInspectorEvidence] = useState('');
  const [executorDone, setExecutorDone] = useState(false);
  const [inspectorDone, setInspectorDone] = useState(false);
  const [verifierPassed, setVerifierPassed] = useState(null);
  const [focusedStage, setFocusedStage] = useState('planner');
  const [retryCount, setRetryCount] = useState(0);

  const resetState = () => {
    setStreamingResult(""); setStreamingPlanner(""); setStreamingStrategist("");
    setStreamingVerifier(""); setStreamingStatus("");
    setExecRounds([]); setInspToolEvents([]);
    pendingRoundRef.current = { text: '', toolName: null, toolArgs: null, toolResult: null };
    setCriteria([]); setStrategistPlan(''); setStrategistFeedback('');
    setInspectorEvidence(''); setExecutorOutput('');
    executorOutputRef.current = '';
    strategistPlanRef.current = '';
    setPlannerDone(false); setStrategistDone(false); setExecutorDone(false);
    setInspectorDone(false); setVerifierPassed(null);
    setFinalResult("");
    setRetryCount(0);
  };

  useEffect(() => {
    window.XunMingAPI.onStreamBegin((data) => {
      setWorkspace(data.workspace || '');
      resetState();
    });

    window.XunMingAPI.onToolEvent((data) => {
      if (data.phase === 'inspector') {
        setInspToolEvents((prev) => [...prev, data]);
      } else {
        if (data.event === 'tool_start') {
          pendingRoundRef.current.toolName = data.name;
          pendingRoundRef.current.toolArgs = data.args;
        } else if (data.event === 'tool_result') {
          pendingRoundRef.current.toolResult = data.args;
          const round = { ...pendingRoundRef.current };
          if (round.text || round.toolName) {
            setExecRounds((prev) => [...prev, round]);
          }
          setStreamingResult('');
          pendingRoundRef.current = { text: '', toolName: null, toolArgs: null, toolResult: null };
        }
      }
    });

    window.XunMingAPI.onStreamToken((data) => {
      if (data.phase === 'executor' && data.field === 'status') {
        setStreamingStatus(data.token);
      } else if (data.phase === 'executor') {
        executorOutputRef.current += data.token;
        setStreamingResult((prev) => prev + data.token);
        setStreamingStatus("");
        pendingRoundRef.current.text += data.token;
      } else if (data.phase === 'planner') {
        setStreamingPlanner((prev) => prev + data.token);
      } else if (data.phase === 'strategist') {
        strategistPlanRef.current += data.token;
        setStreamingStrategist((prev) => prev + data.token);
      } else if (data.phase === 'verifier') {
        setStreamingVerifier((prev) => prev + data.token);
      }
    });

    window.XunMingAPI.onLogUpdate((log) => {
      if (log.stage !== 'SUCCESS' && log.stage !== 'FAIL') {
        setCurrentStage(log.stage);
      }

      if (log.stage === 'PLAN' && log.message.includes('法度标尺已铸造')) {
        setPlannerDone(true); setStreamingPlanner("");
        if (log.detail && Array.isArray(log.detail)) setCriteria(log.detail);
      }
      if (log.stage === 'STRATEGY' && log.message.includes('已制定')) {
        setStrategistDone(true);
        setStrategistPlan(log.detail || strategistPlanRef.current);
        setStreamingStrategist("");
      }
      if (log.stage === 'STRATEGY' && log.message.includes('研判驳回')) {
        setStrategistFeedback(log.detail || '');
      }
      if (log.stage === 'INSPECTOR' && typeof log.detail === 'string') {
        setInspectorEvidence(log.detail);
      }
      if (log.stage === 'EXECUTE' && log.message.includes('产出完毕')) {
        setExecutorDone(true);
        setExecutorOutput(log.detail || executorOutputRef.current);
        setStreamingResult('');
      }
      if (log.stage === 'INSPECTOR' && log.message.includes('移送司法')) {
        setInspectorDone(true);
      }
      if (log.stage === 'ROLLBACK') {
        setExecutorDone(false); setInspectorDone(false);
        setRetryCount((prev) => prev + 1);
      }
      if (log.stage === 'SUCCESS') setVerifierPassed(true);
    });

    window.XunMingAPI.onTaskComplete((data) => {
      if (!data) {
        setCurrentStage("IDLE");
        setStreamingResult(""); setStreamingStatus("");
        return;
      }
      if (data.success) setFinalResult(data.result);
      else if (data.result) setFinalResult(data.result);
      else if (data.error) setFinalResult(`Task failed: ${data.error}`);
      setCurrentStage("IDLE");
      setStreamingResult(""); setStreamingStatus("");
    });

    return () => window.XunMingAPI.removeAllListeners();
  }, []);

  // Auto-focus on the active pipeline stage
  useEffect(() => {
    const stageMap = {
      'PLAN': 'planner',
      'STRATEGY': 'strategist',
      'EXECUTE': 'executor',
      'ROLLBACK': 'executor',
      'INSPECTOR': 'inspector',
      'VERIFY': 'verifier',
    };
    if (currentStage in stageMap) {
      setFocusedStage(stageMap[currentStage]);
    }
  }, [currentStage]);

  // Compute stage statuses for the sidebar
  const stageStatuses = {
    planner:    currentStage === 'PLAN' ? 'active' : plannerDone ? 'done' : 'idle',
    strategist: currentStage === 'STRATEGY' ? 'active' : strategistDone ? 'done' : 'idle',
    executor:   (currentStage === 'EXECUTE' || currentStage === 'ROLLBACK') ? 'active' : executorDone ? 'done' : 'idle',
    inspector:  currentStage === 'INSPECTOR' ? 'active' : inspectorDone ? 'done' : 'idle',
    verifier:   currentStage === 'VERIFY' ? 'active' : verifierPassed !== null ? 'done' : 'idle',
  };

  const handleSubmit = useCallback(() => {
    if (!prompt.trim()) return;
    resetState();
    setCurrentStage("PLAN");
    window.XunMingAPI.startTask(prompt);
  }, [prompt]);

  const idle = currentStage === 'IDLE';

  const FOCUS_LABELS = {
    planner:    { label: 'Planner',    cn: '立法' },
    strategist: { label: 'Strategist', cn: '内阁' },
    executor:   { label: 'Executor',   cn: '行政' },
    inspector:  { label: 'Inspector',  cn: '检察' },
    verifier:   { label: 'Verifier',   cn: '司法' },
  };

  const BAR_COLORS = {
    planner:    'bg-ibm-blue',
    strategist: 'bg-ibm-teal',
    executor:   'bg-ibm-amber',
    inspector:  'bg-ibm-pink',
    verifier:   'bg-ibm-purple',
  };

  return (
    <div className="h-screen bg-ibm-bg text-ibm-text font-mono flex flex-col">
      {/* Custom title bar — draggable */}
      <div className="drag-region flex items-center justify-between pl-5 pr-1 py-0 border-b border-ibm-border bg-ibm-layer shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-ibm-text tracking-wide">xunming-ai</span>
          <span className="text-[10px] text-ibm-text-disabled bg-ibm-layer-active px-2 py-0.5">v1.0</span>
        </div>
        <div className="flex items-center gap-1 no-drag-region">
          {workspace && <span className="text-ibm-text-tertiary text-[11px] mr-2">{workspace}</span>}
          {verifierPassed === true && (
            <span className="text-[10px] text-ibm-green font-medium border border-ibm-green/30 bg-ibm-green/10 px-2 py-0.5 mr-2">PASSED</span>
          )}
          <button onClick={() => setSettingsOpen(true)} className="text-ibm-text-tertiary hover:text-ibm-text-secondary transition-colors px-2 py-2" title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button onClick={() => window.XunMingAPI.minimizeWindow()} className="text-ibm-text-tertiary hover:text-ibm-text-secondary transition-colors px-2.5 py-2" title="Minimize">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button onClick={() => window.XunMingAPI.maximizeWindow()} className="text-ibm-text-tertiary hover:text-ibm-text-secondary transition-colors px-2.5 py-2" title="Maximize">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          <button onClick={() => window.XunMingAPI.closeWindow()} className="text-ibm-text-tertiary hover:text-ibm-red hover:bg-ibm-red/10 transition-colors px-2.5 py-2" title="Close">
            <svg width="12" height="12" viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
        </div>
      </div>

      {/* Main: sidebar + focus */}
      <div className="flex-1 flex min-h-0">
        <PipelineSidebar
          stages={stageStatuses}
          focusedStage={focusedStage}
          onFocus={setFocusedStage}
          retryCount={retryCount}
          maxRetries={5}
          running={!idle}
        />

        {/* Focus panel */}
        <div className="flex-1 min-w-0 flex flex-col bg-ibm-bg">
          {/* Focus header */}
          <div className="shrink-0 flex items-center border-b border-ibm-border bg-ibm-layer">
            {/* Left color bar matching stage */}
            <div className={`w-[3px] self-stretch rounded-r-sm ${BAR_COLORS[focusedStage] || 'bg-transparent'} ${
              stageStatuses[focusedStage] === 'idle' ? 'opacity-0' :
              stageStatuses[focusedStage] === 'done' ? 'opacity-50' : ''
            }`} />
            <div className="flex-1 flex items-center gap-3 px-5 py-3">
              <span className={`text-xs font-semibold tracking-wide ${
                stageStatuses[focusedStage] !== 'idle' ? 'text-ibm-text' : 'text-ibm-text-tertiary'
              }`}>
                {FOCUS_LABELS[focusedStage]?.label || ''}
              </span>
              <span className="text-[10px] text-ibm-text-disabled">
                {FOCUS_LABELS[focusedStage]?.cn || ''}
              </span>
              <span className={`text-[10px] ml-auto ${
                stageStatuses[focusedStage] === 'active' ? 'text-ibm-text-secondary' :
                stageStatuses[focusedStage] === 'done' ? 'text-ibm-green' : 'text-ibm-text-disabled'
              }`}>
                {stageStatuses[focusedStage] === 'active' ? 'In progress' :
                 stageStatuses[focusedStage] === 'done' ? 'Complete' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Focus content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Welcome */}
            {idle && !plannerDone && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-6 max-w-lg px-8">
                  <div className="text-[11px] font-semibold text-ibm-text-tertiary tracking-[0.2em] uppercase">xunming-ai</div>
                  <h2 className="text-2xl font-semibold text-ibm-text tracking-wide">Multi-Agent Verification Workflow</h2>
                  <div className="text-[13px] text-ibm-text-tertiary leading-relaxed">
                    <p>Define criteria, plan execution, perform the work, gather evidence, and verify results.</p>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[11px]">
                    {['Planner', 'Strategist', 'Executor', 'Inspector', 'Verifier'].map((name, i) => (
                      <React.Fragment key={name}>
                        <span className="text-ibm-text-disabled border border-ibm-border px-2 py-1">{name}</span>
                        {i < 4 && <span className="text-ibm-text-disabled mx-0.5">&rarr;</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-[11px] text-ibm-text-disabled">Enter a task description below to start.</p>
                </div>
              </div>
            )}

            {/* Stage detail */}
            {!(idle && !plannerDone) && (
              <div className="h-full">
                {focusedStage === 'planner' && (
                  <PlannerColumn streaming={streamingPlanner} done={plannerDone} active={currentStage === 'PLAN'} criteria={criteria} />
                )}
                {focusedStage === 'strategist' && (
                  <StrategistColumn streaming={streamingStrategist} done={strategistDone} active={currentStage === 'STRATEGY'} plan={strategistPlan} feedback={strategistFeedback} />
                )}
                {focusedStage === 'executor' && (
                  <ExecutorColumn streaming={streamingResult} status={streamingStatus} finalResult={finalResult} output={executorOutput} rounds={execRounds} done={executorDone} active={currentStage === 'EXECUTE' || currentStage === 'ROLLBACK'} />
                )}
                {focusedStage === 'inspector' && (
                  <EvidenceColumn active={currentStage === 'INSPECTOR'} done={inspectorDone} toolEvents={inspToolEvents} evidence={inspectorEvidence} />
                )}
                {focusedStage === 'verifier' && (
                  <VerifierColumn streaming={streamingVerifier} passed={verifierPassed} active={currentStage === 'VERIFY'} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom input */}
      <div className="shrink-0 border-t border-ibm-border bg-ibm-layer px-5 py-4">
        <div className="flex gap-3 max-w-5xl mx-auto">
          <textarea
            className="flex-1 bg-ibm-bg border border-ibm-border px-4 py-2.5 focus:outline-none focus:border-ibm-blue text-[13px] resize-none text-ibm-text placeholder:text-ibm-text-placeholder"
            placeholder="Enter task description..." rows={2}
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            disabled={!idle}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          />
          <button onClick={handleSubmit} disabled={!idle || !prompt.trim()}
            className="bg-ibm-blue hover:bg-[#a6c8ff] disabled:bg-ibm-layer-active disabled:text-ibm-text-disabled text-ibm-bg font-semibold px-8 py-2.5 transition-colors text-[13px] shrink-0">
            {idle ? 'Execute' : 'Running...'}
          </button>
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}
        onSaved={(s) => { if (s.workspaceDir) setWorkspace(s.workspaceDir); }} />
    </div>
  );
}
