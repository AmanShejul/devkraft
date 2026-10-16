"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CircleAlert, Clock3, LoaderCircle, Play, Settings2 } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import type { CodeExecutionRequest, CodeExecutionResult } from "@/types/domain";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="grid h-[390px] place-items-center bg-[#101b22] text-sm text-white/55">Loading editor…</div>,
});

const starterCode: Record<CodeExecutionRequest["language"], string> = {
  typescript: "function countDown(start: number): number[] {\n  const values: number[] = [];\n\n  // Add each number from start down to 1.\n\n  return values;\n}\n\nconsole.log(countDown(3));",
  javascript: "function countDown(start) {\n  const values = [];\n\n  // Add each number from start down to 1.\n\n  return values;\n}\n\nconsole.log(countDown(3));",
  python: "def count_down(start):\n    values = []\n\n    # Add each number from start down to 1.\n\n    return values\n\nprint(count_down(3))",
};

type RunState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "result"; result: CodeExecutionResult }
  | { kind: "error"; code?: string; message: string };

function isApiFailure(payload: unknown): payload is Extract<ApiResponse<CodeExecutionResult>, { ok: false }> {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as { ok?: unknown; error?: { code?: unknown; message?: unknown } };
  return candidate.ok === false && typeof candidate.error?.code === "string" && typeof candidate.error.message === "string";
}

function isCodeExecutionResult(value: unknown): value is CodeExecutionResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<CodeExecutionResult>;
  return (result.status === "completed" || result.status === "failed" || result.status === "queued")
    && typeof result.stdout === "string"
    && typeof result.stderr === "string"
    && typeof result.provider === "string";
}

function describeFailure(code: string | undefined, fallback: string) {
  switch (code) {
    case "EXECUTION_PROVIDER_NOT_CONFIGURED":
      return "Execution provider not configured. Your code was not run.";
    case "EXECUTION_PROVIDER_UNAVAILABLE":
      return "The execution provider is temporarily unavailable. Your code was not run.";
    case "EXECUTION_PROVIDER_TIMEOUT":
      return "The execution provider timed out. No result was returned.";
    case "UNSUPPORTED_LANGUAGE":
      return "This language is not supported by the execution API.";
    case "SOURCE_REQUIRED":
      return "Add some source code before running it.";
    case "SOURCE_TOO_LARGE":
      return "The source code is over the API's 20,000 character limit.";
    case "STDIN_TOO_LARGE":
      return "Standard input is over the API's 5,000 character limit.";
    case "EXECUTION_PROVIDER_ERROR":
      return "The execution provider could not process this request.";
    default:
      return fallback;
  }
}

function resultLabel(result: CodeExecutionResult) {
  if (result.status === "queued") return "Queued by provider; execution is not complete.";
  if (result.status === "completed") return "Provider reported execution complete. No hidden tests were run.";
  switch (result.failureKind) {
    case "compile-error": return "Provider reported a compile error.";
    case "runtime-error": return "Provider reported a runtime error.";
    case "timeout": return "Provider reported an execution timeout.";
    default: return "Provider reported a failed execution.";
  }
}

export function CodeEditor() {
  const [language, setLanguage] = useState<CodeExecutionRequest["language"]>("typescript");
  const [sourceCode, setSourceCode] = useState(starterCode.typescript);
  const [stdin, setStdin] = useState("");
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });

  function changeLanguage(nextLanguage: CodeExecutionRequest["language"]) {
    setLanguage(nextLanguage);
    setSourceCode(starterCode[nextLanguage]);
    setRunState({ kind: "idle" });
  }

  async function requestExecution() {
    setRunState({ kind: "pending" });
    try {
      const response = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, sourceCode, stdin }),
        signal: AbortSignal.timeout(20_000),
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        setRunState({ kind: "error", code: "INVALID_API_RESPONSE", message: "The execution API returned an unreadable response." });
        return;
      }

      if (!response.ok) {
        const code = isApiFailure(payload) ? payload.error.code : undefined;
        const message = isApiFailure(payload)
          ? describeFailure(code, payload.error.message)
          : `The execution API returned HTTP ${response.status}.`;
        setRunState({ kind: "error", code, message });
        return;
      }

      const apiResponse = payload as Partial<ApiResponse<CodeExecutionResult>>;
      if (apiResponse.ok !== true || !isCodeExecutionResult(apiResponse.data)) {
        setRunState({ kind: "error", code: "INVALID_API_RESPONSE", message: "The execution API response did not match its contract." });
        return;
      }
      setRunState({ kind: "result", result: apiResponse.data });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        setRunState({ kind: "error", code: "CLIENT_TIMEOUT", message: "Timed out waiting for the execution API. Check the provider status and try again." });
      } else {
        setRunState({ kind: "error", code: "NETWORK_ERROR", message: "Could not reach the execution API. Check your connection and try again." });
      }
    }
  }

  const execution = runState.kind === "result" ? runState.result : null;
  const hasError = runState.kind === "error";

  return <div className="overflow-hidden rounded-[22px] border border-[#24343d] bg-[#101b22] shadow-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e6b657]" /><span className="text-xs font-bold text-white/85">solution</span><span className="text-xs text-white/40">/</span><label htmlFor="language" className="sr-only">Editor language</label><select id="language" value={language} disabled={runState.kind === "pending"} onChange={(event) => changeLanguage(event.target.value as CodeExecutionRequest["language"])} className="rounded-lg border border-white/10 bg-[#18262e] px-2.5 py-1.5 text-xs font-semibold text-white/80 disabled:opacity-60"><option value="typescript">TypeScript</option><option value="javascript">JavaScript</option><option value="python">Python</option></select></div>
      <div className="flex items-center gap-2"><span title="Provider status is returned by the API when you run code" className="inline-flex items-center gap-1.5 text-[11px] text-white/55"><Settings2 size={13} /> Checked on run</span><button type="button" onClick={() => void requestExecution()} disabled={runState.kind === "pending"} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60">{runState.kind === "pending" ? <LoaderCircle className="animate-spin" size={14} /> : <Play size={13} fill="currentColor" />}{runState.kind === "pending" ? "Running…" : "Run code"}</button></div>
    </div>
    <div className="h-[390px]">
      <Monaco height="390px" theme="vs-dark" language={language} value={sourceCode} onChange={(value) => { setSourceCode(value ?? ""); setRunState({ kind: "idle" }); }} options={{ minimap: { enabled: false }, fontSize: 13, tabSize: 2, scrollBeyondLastLine: false, padding: { top: 16 }, automaticLayout: true, wordWrap: "on", lineNumbersMinChars: 3, readOnly: runState.kind === "pending" }} />
    </div>
    <div className="grid gap-0 border-t border-white/10 md:grid-cols-[0.8fr_1.2fr]">
      <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Standard input</span><textarea value={stdin} disabled={runState.kind === "pending"} onChange={(event) => { setStdin(event.target.value); setRunState({ kind: "idle" }); }} rows={2} placeholder="Optional input" className="mt-2 w-full resize-y bg-transparent font-mono text-xs leading-5 text-white/85 outline-none placeholder:text-white/30 disabled:opacity-60" /></label>
      <div className="p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Run result</span><span className="text-[10px] text-white/35">{execution ? `${execution.durationMs ?? "—"} ms` : runState.kind === "pending" ? "Waiting for API" : "No execution"}</span></div>
        <div role={hasError ? "alert" : "status"} aria-live="polite" className={`mt-2 flex items-start gap-2 text-xs leading-5 ${hasError ? "text-[#ffb0a6]" : "text-[#e8bd64]"}`}>
          {hasError && <CircleAlert size={14} className="mt-0.5 shrink-0" />}
          {runState.kind === "idle" && <span>Ready when you are. Provider readiness is checked by the server when you run code.</span>}
          {runState.kind === "pending" && <span>Sending this source to the server execution provider…</span>}
          {runState.kind === "error" && <span>{runState.message}{runState.code ? <span className="ml-1 text-white/45">({runState.code})</span> : null}</span>}
          {execution && <span>{resultLabel(execution)}{execution.provider ? <span className="ml-1 text-white/45">Provider: {execution.provider}</span> : null}</span>}
        </div>
        {execution && (execution.stdout || execution.stderr) && <div className="mt-2 max-h-36 overflow-auto rounded-lg bg-black/20 p-3 font-mono text-xs leading-5">
          {execution.stdout && <pre className="whitespace-pre-wrap text-white/85">{execution.stdout}</pre>}
          {execution.stderr && <pre className={`${execution.stdout ? "mt-2 border-t border-white/10 pt-2 " : ""}whitespace-pre-wrap text-[#ffb0a6]`}>{execution.stderr}</pre>}
        </div>}
        {execution && !execution.stdout && !execution.stderr && execution.status !== "queued" && <p className="mt-2 text-xs text-white/50">Provider returned no output.</p>}
        {runState.kind === "error" && runState.code === "EXECUTION_PROVIDER_TIMEOUT" && <p className="mt-2 flex items-center gap-1 text-[11px] text-white/45"><Clock3 size={12} /> You can retry after the provider is responsive.</p>}
      </div>
    </div>
  </div>;
}
