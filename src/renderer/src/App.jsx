import React, { useState, useEffect, useCallback, useRef } from 'react';
import PlannerColumn from './components/PlannerColumn';
import StrategistColumn from './components/StrategistColumn';
import ExecutorColumn from './components/ExecutorColumn';
import EvidenceColumn from './components/EvidenceColumn';
import VerifierColumn from './components/VerifierColumn';
import FlowLines from './components/FlowLines';
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
  const [flowHighlight, setFlowHighlight] = useState('');

  const columnsRef = useRef(null);

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
          // 提交完整 round，清空流式文本，开始新的 pending
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
      // 终态不覆盖 currentStage，避免锁死按钮
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
        setStreamingResult(''); // 行政结束时清空流式文本
      }
      if (log.stage === 'INSPECTOR' && log.message.includes('移送司法')) {
        setInspectorDone(true);
      }
      if (log.stage === 'ROLLBACK') {
        setExecutorDone(false); setInspectorDone(false);
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
      else if (data.error) setFinalResult(`任务失败：${data.error}`);
      setCurrentStage("IDLE");
      setStreamingResult(""); setStreamingStatus("");
    });

    return () => window.XunMingAPI.removeAllListeners();
  }, []);

  const handleSubmit = useCallback(() => {
    if (!prompt.trim()) return;
    resetState();
    setCurrentStage("PLAN");
    window.XunMingAPI.startTask(prompt);
  }, [prompt]);

  const idle = currentStage === 'IDLE';

  return (
    <div className="h-screen bg-slate-950 text-slate-100 font-mono flex flex-col">
      {/* Top title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <span className="text-sm font-bold text-cyan-400 tracking-wider">xunming-ai 循名 AI</span>
        <div className="flex items-center gap-2.5 text-[11px]">
          {workspace && <span className="text-slate-500">{workspace}</span>}
          <button onClick={() => setSettingsOpen(true)} className="text-slate-500 hover:text-slate-300 leading-none" title="设置">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          {verifierPassed === true && <span className="text-emerald-400">通过</span>}
        </div>
      </div>

      {/* Five-column main area */}
      <div ref={columnsRef} className="flex-1 flex gap-0 relative min-h-0">
        <PlannerColumn streaming={streamingPlanner} done={plannerDone} active={currentStage === 'PLAN'} criteria={criteria} />
        <StrategistColumn streaming={streamingStrategist} done={strategistDone} active={currentStage === 'STRATEGY'} plan={strategistPlan} feedback={strategistFeedback} />
        <ExecutorColumn streaming={streamingResult} status={streamingStatus} finalResult={finalResult}
          output={executorOutput} rounds={execRounds} done={executorDone}
          active={currentStage === 'EXECUTE' || currentStage === 'ROLLBACK'} />
        <EvidenceColumn active={currentStage === 'INSPECTOR'} done={inspectorDone} toolEvents={inspToolEvents} evidence={inspectorEvidence} />
        <VerifierColumn streaming={streamingVerifier} passed={verifierPassed}
          active={currentStage === 'VERIFY'} />
      </div>

      {/* Bottom input bar */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-900/50 p-4">
        <div className="flex gap-3 max-w-6xl mx-auto">
          <textarea
            className="flex-1 bg-slate-950 border border-slate-700 p-3 rounded-lg focus:outline-none focus:border-cyan-500 text-sm resize-none"
            placeholder="请输入需要极致严谨深度推理的任务法案..." rows={2}
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            disabled={!idle}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          />
          <button onClick={handleSubmit} disabled={!idle || !prompt.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold px-8 py-3 rounded-lg transition-colors text-sm shrink-0">
            {idle ? '循名责实' : '激战中...'}
          </button>
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}
        onSaved={(s) => { if (s.workspaceDir) setWorkspace(s.workspaceDir); }} />
    </div>
  );
}
