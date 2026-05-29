# xunming-ai

xunming-ai is an Electron desktop application that experiments with a multi-agent workflow inspired by "循名责实": define the name, execute the work, gather evidence, and verify the result.

The app turns a user request into explicit acceptance criteria, asks a planner to design an execution path, lets an executor work inside a bounded workspace, then runs inspection and final verification before returning the result.

## Features

- Five-stage agent workflow: Planner, Strategist, Executor, Inspector, and Verifier.
- Streaming desktop UI built with Electron, Vite, React, and Tailwind CSS.
- OpenAI-compatible model configuration through `.env`.
- Workspace-scoped tools for file reads, file writes, file updates, directory listing, and command execution.
- Live display of agent output, tool calls, evidence reports, and verification status.

## Architecture

```text
User prompt
  -> Planner      creates acceptance criteria
  -> Strategist   writes an execution plan
  -> Executor     performs the task with workspace tools
  -> Inspector    checks evidence against the criteria
  -> Verifier     makes the final pass/fail judgment
```

Main process code lives in `src/main`. The renderer UI lives in `src/renderer`.

Important files:

- `src/main/main.js`: Electron entry point and IPC wiring.
- `src/main/xunming-core.js`: scheduler for the multi-agent workflow.
- `src/main/agents/`: agent implementations and prompts.
- `src/main/tools/index.js`: workspace-scoped tool execution layer.
- `src/renderer/src/App.jsx`: main five-column desktop interface.
- `src/renderer/src/components/`: UI columns and settings panel.

## Requirements

- Node.js 18 or newer
- npm
- An OpenAI-compatible chat completion API key

## Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=your-api-key-here
API_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4o
WORKSPACE_DIR=~/xunming-workspace
```

`API_BASE_URL` can point to any OpenAI-compatible provider. `WORKSPACE_DIR` is the only directory the built-in tools are allowed to access.

## Development

Run the app in development mode:

```bash
npm run dev
```

This starts the Vite renderer dev server and launches Electron against `http://localhost:5173`.

## Production Build

Build the renderer:

```bash
npm run build:renderer
```

Run Electron against the built renderer:

```bash
npm start
```

## Configuration

The app reads configuration from `.env`:

- `OPENAI_API_KEY`: API key for the selected provider.
- `API_BASE_URL`: OpenAI-compatible API base URL.
- `MODEL_NAME`: model used by the agents.
- `WORKSPACE_DIR`: directory where tools can read, write, and run commands.

The in-app settings panel can update workspace, model, and API base URL values. Restart the app after saving settings so the main process reloads configuration.

## Safety Notes

- Do not commit `.env`; it may contain API keys.
- Tools are scoped to `WORKSPACE_DIR`, not the whole project.
- Command execution is available to the executor agent inside the workspace. Use trusted prompts and review generated files before relying on them.

## Scripts

```bash
npm run dev             # Start Vite and Electron for development
npm run build:renderer  # Build the renderer into dist/renderer
npm start               # Launch Electron
```

## Project Status

This is an experimental local-first AI agent workbench. It is useful for exploring multi-agent coordination, evidence-based task completion, and model-driven tool use, but it should still be treated as a prototype.

## License

Licensed under the Apache License, Version 2.0. See `LICENSE` for details.
