import React, { useRef, useEffect } from 'react';

const CARD_BORDER = '1px solid rgba(217,119,6,0.5)';
const CARD_BG = 'rgba(30,41,59,0.6)';
const TOOL_BAR_BG = 'rgba(217,119,6,0.15)';

export default function ExecutorColumn({ streaming, status, finalResult, output, rounds, done, active }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [streaming, rounds, output]);

  const borderColor = active ? 'rgba(245,158,11,0.6)' : done ? 'rgba(180,83,9,0.4)' : '#1e293b';
  const dotColor = active ? '#f59e0b' : done ? '#d97706' : '#334155';
  if (active) dotColor + ' animate-pulse';

  const displayText = finalResult || output;

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${borderColor}`, background: 'rgba(15,23,42,0.3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: dotColor }} />
        <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>行政 Executor</span>
        <span style={{ color: '#475569', fontSize: 11, marginLeft: 'auto' }}>作实</span>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'scroll', padding: 12, fontSize: 13, minHeight: 0 }}>
        {rounds.filter(r => r.text || r.toolName).map((r, i) => (
          <div key={i} style={{ border: CARD_BORDER, background: CARD_BG, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
            {r.text && (
              <div style={{ padding: '10px 12px', color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{r.text}</div>
            )}
            {r.toolName && (
              <div>
                <div style={{ padding: '8px 12px', background: TOOL_BAR_BG, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, borderTop: r.text ? '1px solid rgba(217,119,6,0.2)' : 'none' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 11 }}>EXEC</span>
                  <span style={{ color: '#fcd34d', fontWeight: 700 }}>{r.toolName}</span>
                </div>
                {r.toolResult && (
                  <pre style={{ padding: '8px 12px', color: '#cbd5e1', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto', lineHeight: 1.5, background: 'rgba(0,0,0,0.3)', margin: 0 }}>
                    {typeof r.toolResult === 'string' ? r.toolResult : JSON.stringify(r.toolResult, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}

        {streaming && (
          <div style={{ border: CARD_BORDER, background: CARD_BG, borderRadius: 8, padding: 12, color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 12 }}>
            {streaming}
            <span style={{ display: 'inline-block', width: 8, height: 16, background: '#f59e0b', marginLeft: 2, verticalAlign: 'middle' }} className="animate-pulse" />
          </div>
        )}

        {!streaming && displayText && (
          <div style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: 12, border: CARD_BORDER, borderRadius: 8, background: CARD_BG }}>
            {displayText}
          </div>
        )}

        {!streaming && !displayText && rounds.length === 0 && (
          <div style={{ color: '#64748b', textAlign: 'center', marginTop: 32 }}>
            {status || (!active && !done ? '等待立法标准下达...' : done ? '产出已移送' : '')}
          </div>
        )}
      </div>
    </div>
  );
}
