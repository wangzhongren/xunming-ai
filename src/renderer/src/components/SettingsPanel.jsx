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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-ibm-layer border border-ibm-border w-[480px] p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ibm-text tracking-wide">Settings</h2>
          <button onClick={onClose} className="text-ibm-text-tertiary hover:text-ibm-text text-lg leading-none">&times;</button>
        </div>

        {/* Workspace */}
        <div>
          <label className="text-[10px] font-semibold text-ibm-text-tertiary uppercase tracking-wider mb-1.5 block">
            Workspace Directory
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="flex-1 bg-ibm-bg border border-ibm-border px-3 py-2 text-xs text-ibm-text focus:outline-none focus:border-ibm-blue font-mono placeholder:text-ibm-text-placeholder"
              placeholder="~/xunming-workspace"
            />
            <button
              onClick={handleBrowse}
              className="bg-ibm-layer-hover hover:bg-ibm-layer-active text-ibm-text-secondary px-4 py-2 text-xs font-medium border border-ibm-border"
            >
              Browse
            </button>
          </div>
        </div>

        {/* Model Name */}
        <div>
          <label className="text-[10px] font-semibold text-ibm-text-tertiary uppercase tracking-wider mb-1.5 block">
            Model Name
          </label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full bg-ibm-bg border border-ibm-border px-3 py-2 text-xs text-ibm-text focus:outline-none focus:border-ibm-blue font-mono placeholder:text-ibm-text-placeholder"
            placeholder="gpt-4o"
          />
        </div>

        {/* API Base URL */}
        <div>
          <label className="text-[10px] font-semibold text-ibm-text-tertiary uppercase tracking-wider mb-1.5 block">
            API Base URL
          </label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            className="w-full bg-ibm-bg border border-ibm-border px-3 py-2 text-xs text-ibm-text focus:outline-none focus:border-ibm-blue font-mono placeholder:text-ibm-text-placeholder"
            placeholder="https://api.openai.com/v1"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-ibm-border">
          <div>
            {saved && (
              <span className="text-ibm-green text-[10px] font-medium">Saved. Restart to apply changes.</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-ibm-text-tertiary hover:text-ibm-text text-xs px-4 py-2 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-ibm-blue hover:bg-[#a6c8ff] disabled:bg-ibm-layer-active disabled:text-ibm-text-disabled text-ibm-bg text-xs font-semibold px-6 py-2"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
