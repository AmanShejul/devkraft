"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Play, Send, Settings2 } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import { isCodeExecutionResult, type CodeExecutionRequest, type CodeExecutionResult } from "@/types/domain";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="grid h-[390px] place-items-center bg-[#101b22] text-sm text-white/55">Loading editor…</div>,
});

const starterCode: Record<CodeExecutionRequest["language"], string> = {
  typescript: "function countDown(start: number): number[] {\n  const values: number[] = [];\n\n  // Add each number from start down to 1.\n\n  return values;\n}\n\nconsole.log(countDown(3));",
  javascript: "function countDown(start) {\n  const values = [];\n\n  // Add each number from start down to 1.\n\n  return values;\n}\n\nconsole.log(countDown(3));",
  python: "def count_down(start):\n    values = []\n\n    # Add each number from start down to 1.\n\n    return values\n\nprint(count_down(3))",
};

function isApiFailure(payload: unknown): payload is Extract<ApiResponse<CodeExecutionResult>, { ok: false }> {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as { ok?: unknown; error?: { code?: unknown; message?: unknown } };
  return candidate.ok === false && typeof candidate.error?.code === "string" && typeof candidate.error.message === "string";
}

function describeFailure(code: string | undefined, fallback: string) {
  switch (code) {
    case "EXECUTION_PROVIDER_NOT_CONFIGURED":
      return "Execution provider not configured. Your code was not run.";
    case "EXECUTION_PROVIDER_UNAVAILABLE":
      return "The execution provider is temporarily unavailable. Your code was not run.";
    case "EXECUTION_PROVIDER_MISCONFIGURED":
      return "The server's execution provider credentials were rejected. Your code was not run.";
    case "EXECUTION_PROVIDER_QUOTA_EXHAUSTED":
      return "The execution provider has reached its available run quota. Your code was not run.";
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

function describeResult(result: CodeExecutionResult) {
  if (result.status === "queued") return "Queued by provider; execution is not complete.";
  if (result.status === "completed") return "Provider reported execution complete. No hidden tests were run.";
  switch (result.failureKind) {
    case "compile-error": return "Provider reported a compile error.";
    case "runtime-error": return "Provider reported a runtime error.";
    case "timeout": return "Provider reported an execution timeout.";
    default: return "Provider reported a failed execution.";
  }
}

function hasExecutionOutput(result: CodeExecutionResult) {
  if (result.output !== undefined) return result.output.length > 0;
  return result.stdout.length > 0 || result.stderr.length > 0;
}

export function CodeEditor() {
  const [language, setLanguage] = useState<CodeExecutionRequest["language"]>("typescript");
  const [sourceCode, setSourceCode] = useState(starterCode.typescript);
  const [stdin, setStdin] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("Execution provider not configured. Your code has not been run.");
  const [errorCode, setErrorCode] = useState<string>();
  const [execution, setExecution] = useState<CodeExecutionResult | null>(null);

  function changeLanguage(nextLanguage: CodeExecutionRequest["language"]) {
    setLanguage(nextLanguage);
    setSourceCode(starterCode[nextLanguage]);
    setExecution(null);
    setErrorCode(undefined);
  }

  async function requestExecution(action: "run" | "submit") {
    setPending(true);
    setExecution(null);
    setErrorCode(undefined);
    setMessage(action === "run" ? "Checking provider…" : "Checking provider for submission…");
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
        setErrorCode("INVALID_API_RESPONSE");
        setMessage("The execution API returned an unreadable response.");
        return;
      }

      if (!response.ok) {
        const code = isApiFailure(payload) ? payload.error.code : undefined;
        setErrorCode(code ?? `HTTP_${response.status}`);
        setMessage(isApiFailure(payload)
          ? describeFailure(code, payload.error.message)
          : `The execution API returned HTTP ${response.status}.`);
        return;
      }

      const candidate = payload as { ok?: unknown; data?: unknown } | null;
      if (!candidate || candidate.ok !== true || !isCodeExecutionResult(candidate.data)) {
        setErrorCode("INVALID_API_RESPONSE");
        setMessage("The execution API response did not match its contract.");
        return;
      }

      setExecution(candidate.data);
      setMessage(describeResult(candidate.data));
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        setErrorCode("CLIENT_TIMEOUT");
        setMessage("Timed out waiting for the execution API. Check the provider status and try again.");
      } else {
        setErrorCode("NETWORK_ERROR");
        setMessage("Could not reach the execution API. Check your connection and try again.");
      }
    } finally {
      setPending(false);
    }
  }

  const hasError = errorCode !== undefined;

  return <div className="overflow-hidden rounded-[22px] border border-[#24343d] bg-[#101b22] shadow-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e6b657]" /><span className="text-xs font-bold text-white/85">solution</span><span className="text-xs text-white/40">/</span><label htmlFor="language" className="sr-only">Editor language</label><select id="language" value={language} disabled={pending} onChange={(event) => changeLanguage(event.target.value as CodeExecutionRequest["language"])} className="rounded-lg border border-white/10 bg-[#18262e] px-2.5 py-1.5 text-xs font-semibold text-white/80 disabled:opacity-60"><option value="typescript">TypeScript</option><option value="javascript">JavaScript</option><option value="python">Python</option></select></div>
      <div className="flex items-center gap-2"><span title="Provider status" className="inline-flex items-center gap-1.5 text-[11px] text-[#e8bd64]"><Settings2 size={13} /> Provider not configured</span><button type="button" onClick={() => void requestExecution("run")} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-60"><Play size={13} fill="currentColor" /> Run</button><button type="button" onClick={() => void requestExecution("submit")} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/85 hover:bg-white/10 disabled:opacity-60"><Send size={13} /> Submit</button></div>
    </div>
    <div className="h-[390px]">
      <Monaco height="390px" theme="vs-dark" language={language} value={sourceCode} onChange={(value) => setSourceCode(value ?? "")} options={{ minimap: { enabled: false }, fontSize: 13, tabSize: 2, scrollBeyondLastLine: false, padding: { top: 16 }, automaticLayout: true, wordWrap: "on", lineNumbersMinChars: 3 }} />
    </div>
    <div className="grid gap-0 border-t border-white/10 md:grid-cols-[0.8fr_1.2fr]">
      <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r"> <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Standard input</span><textarea value={stdin} onChange={(event) => setStdin(event.target.value)} rows={2} placeholder="Optional input" className="mt-2 w-full resize-y bg-transparent font-mono text-xs leading-5 text-white/85 outline-none placeholder:text-white/30" /></label>
      <div className="p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Run result</span><span className="text-[10px] text-white/35">{execution ? `${execution.durationMs ?? "—"} ms` : pending ? "Waiting for API" : "No execution"}</span></div>
        <p role={hasError ? "alert" : "status"} aria-live="polite" className="mt-2 text-xs leading-5 text-[#e8bd64]">{message}{errorCode ? <span className="ml-1 text-white/45">({errorCode})</span> : null}</p>
        {execution?.output !== undefined && (execution.output.length > 0
          ? <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-xs text-white/80">{execution.output}</pre>
          : <p className="mt-2 text-xs text-white/50">Provider returned no output.</p>)}
        {execution && execution.output === undefined && (hasExecutionOutput(execution)
          ? <div className="mt-2 max-h-28 overflow-auto rounded-lg bg-black/20 p-3 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">stdout</div>
            <pre className="whitespace-pre-wrap text-white/80">{execution.stdout}</pre>
            <div className="mt-2 border-t border-white/10 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">stderr</div>
            <pre className="whitespace-pre-wrap text-[#ffb0a6]">{execution.stderr}</pre>
          </div>
          : <p className="mt-2 text-xs text-white/50">Provider returned no output.</p>)}
      </div>
    </div>
  </div>;
}
