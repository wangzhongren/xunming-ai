import React, { useState, useEffect } from 'react';

export default function SettingsPanel({ open, onClose, onSaved }) {
  const [workspace, setWorkspace] = useState('');
  const [modelName, setModelName] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    window.XunMingAPI.getSettings().then((s) => {
      setWorkspace(s.workspaceDir || '');
      setModelName(s.modelName || '');
      setApiBaseUrl(s.apiBaseUrl || '');
      setSaved(false);
    });
  }, [open]);

  if (!open) return null;

  async function handleBrowse() {
    const dir = await window.XunMingAPI.pickDirectory();
    if (dir) setWorkspace(dir);
  }

  async function handleSave() {
    setSaving(true);
    await window.XunMingAPI.saveSettings({
      workspaceDir: workspace,
      modelName: modelName,
      apiBaseUrl: apiBaseUrl,
    });
    setSaving(false);
    setSaved(true);
    if (onSaved) onSaved({ workspaceDir: workspace, modelName, apiBaseUrl });
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl w-[480px] shadow-2xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200">设置</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">&times;</button>
        </div>

        {/* Workspace */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">工作空间目录</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              placeholder="~/xunming-workspace"
            />
            <button
              onClick={handleBrowse}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded text-sm font-bold"
            >
              浏览...
            </button>
          </div>
        </div>

        {/* Model Name */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">模型名称</label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            placeholder="deepseek-v4-pro"
          />
        </div>

        {/* API Base URL */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">API 基础地址</label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            placeholder="https://api.openai.com/v1"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div>
            {saved && <span className="text-emerald-400 text-xs">已保存。重启后生效。</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white text-sm font-bold px-6 py-2 rounded"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
