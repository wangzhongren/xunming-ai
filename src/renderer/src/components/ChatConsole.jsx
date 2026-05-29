import React from 'react';

export default function ChatConsole({ prompt, onPromptChange, onSubmit, finalResult, streamingResult, streamingStatus, currentStage }) {
  const idle = currentStage === 'IDLE';
  const isExecuting = currentStage === 'EXECUTE' || currentStage === 'ROLLBACK' || currentStage === 'VERIFY';

  let displayContent;
  let showCursor = false;
  if (finalResult) {
    displayContent = finalResult;
  } else if (isExecuting && streamingResult) {
    displayContent = streamingResult;
    showCursor = true;
  } else if (isExecuting && streamingStatus) {
    displayContent = null;
  } else if (!idle) {
    displayContent = null;
  } else {
    displayContent = null;
  }

  return (
    <div className="w-1/2 flex flex-col gap-4 border border-slate-800 p-4 rounded-xl bg-slate-900/50">
      <h2 className="text-xl font-bold text-cyan-400 border-b border-slate-800 pb-2">xunming-ai 控制台</h2>
      <textarea
        className="w-full h-32 bg-slate-950 border border-slate-800 p-3 rounded-lg focus:outline-none focus:border-cyan-500 text-sm resize-none"
        placeholder="请输入需要极致严谨深度推理的任务法案..."
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        disabled={!idle}
      />
      <button
        onClick={onSubmit}
        disabled={!idle || !prompt.trim()}
        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 rounded-lg transition-colors text-sm"
      >
        {idle ? '激活循名工作流 (循名责实)' : '三权激战中...'}
      </button>
      <div className="flex-1 bg-slate-950 border border-slate-800 p-4 rounded-lg overflow-y-auto text-sm">
        <div className="text-xs text-slate-500 mb-2">// 最终律法产出正文</div>
        {displayContent ? (
          <div className="whitespace-pre-wrap">
            {displayContent}
            {showCursor && (
              <span className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 animate-pulse align-middle" />
            )}
          </div>
        ) : streamingStatus ? (
          <div className="text-cyan-400/70 animate-pulse">
            {streamingStatus}
          </div>
        ) : (
          <div className="text-slate-600">
            {!idle ? '三权激战博弈中，法度重塑内耗内审...' : '静待法案输入...'}
          </div>
        )}
      </div>
    </div>
  );
}
