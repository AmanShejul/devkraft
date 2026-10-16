"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { IDisposable } from "monaco-editor";
import { Play, Send, Settings2 } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import { isCodeExecutionResult, type CodeExecutionRequest, type CodeExecutionResult, type SessionEvent, type VivaEvaluation, type VivaQuestion } from "@/types/domain";
import type { CountDownTestResult } from "@/features/code-execution/count-down-tests";
import { prepareVivaForSubmit } from "@/features/viva/viva";
import { SessionReplay } from "@/components/coding/session-replay";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="grid h-[390px] place-items-center bg-[#101b22] text-sm text-white/55">Loading editor…</div>,
});

const starterCode: Record<CodeExecutionRequest["language"], string> = {
  typescript: "function countDown(start: number): number[] {\n  const values: number[] = [];\n\n  // Add each number from start down to 1.\n\n  return values;\n}\n\nconsole.log(countDown(3));",
  javascript: "function countDown(start) {\n  const values = [];\n\n  // Add each number from start down to 1.\n\n  return values;\n}\n\nconsole.log(countDown(3));",
  python: "def count_down(start):\n    values = []\n\n    # Add each number from start down to 1.\n\n    return values\n\nprint(count_down(3))",
};

const SESSION_STORAGE_KEY = "skillpath:arena-session";

interface StoredArenaSession {
  sessionId: string;
  events: SessionEvent[];
}

function isStoredArenaSession(value: unknown): value is StoredArenaSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { sessionId?: unknown; events?: unknown };
  return typeof candidate.sessionId === "string"
    && Array.isArray(candidate.events)
    && candidate.events.every((event) => {
      if (!event || typeof event !== "object") return false;
      const item = event as Record<string, unknown>;
      return typeof item.id === "string"
        && item.sessionId === candidate.sessionId
        && (item.kind === "edit" || item.kind === "run" || item.kind === "submit" || item.kind === "focus-change")
        && typeof item.occurredAt === "string";
    });
}

function isApiFailure(payload: unknown): payload is Extract<ApiResponse<CodeExecutionResult>, { ok: false }> {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as { ok?: unknown; error?: { code?: unknown; message?: unknown } };
  return candidate.ok === false && typeof candidate.error?.code === "string" && typeof candidate.error.message === "string";
}

interface CodeSubmissionResponse extends CountDownTestResult {
  mastery: { conceptId: string; probability: number; updatedAt?: string }[];
}

interface VivaResponse {
  evaluations: VivaEvaluation[];
  understandingScore: number;
  mastery: { conceptId: string; probability: number; updatedAt?: string }[];
  masteryCounted: boolean;
}

function isCodeSubmissionResponse(value: unknown): value is CodeSubmissionResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CodeSubmissionResponse>;
  return Array.isArray(candidate.cases)
    && candidate.cases.length === 5
    && candidate.cases.every((testCase) => typeof testCase.caseId === "string" && typeof testCase.passed === "boolean")
    && typeof candidate.passed === "number"
    && candidate.total === 5
    && (candidate.verdict === "passed" || candidate.verdict === "failed")
    && Array.isArray(candidate.mastery)
    && candidate.mastery.every((item) => item
      && typeof item.conceptId === "string"
      && typeof item.probability === "number"
      && Number.isFinite(item.probability)
      && item.probability >= 0
      && item.probability <= 1);
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
      return "Timeout: the execution provider stopped waiting after 12 seconds.";
    case "MASTERY_PERSISTENCE_FAILED":
      return "The code ran, but loop mastery could not be saved. Please try again.";
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
  if (result.status === "completed") return "Provider reported execution complete.";
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
  const [submission, setSubmission] = useState<CodeSubmissionResponse | null>(null);
  const [providerReady, setProviderReady] = useState(false);
  const [vivaQuestions, setVivaQuestions] = useState<VivaQuestion[]>([]);
  const [vivaAnswers, setVivaAnswers] = useState<Record<string, string>>({});
  const [vivaEvaluations, setVivaEvaluations] = useState<VivaEvaluation[]>([]);
  const [vivaUnderstandingScore, setVivaUnderstandingScore] = useState<number | null>(null);
  const [vivaMessage, setVivaMessage] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [timeline, setTimeline] = useState<SessionEvent[]>([]);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const pastePending = useRef(false);
  const editorSubscription = useRef<IDisposable | null>(null);
  const recordEventRef = useRef<(kind: SessionEvent["kind"], payload?: SessionEvent["payload"]) => void>(() => {});

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (!isStoredArenaSession(parsed)) throw new Error("Saved arena session has an invalid format.");
          setSessionId(parsed.sessionId);
          setTimeline(parsed.events);
        } else {
          setSessionId(crypto.randomUUID());
        }
      } catch (error) {
        setSessionId(crypto.randomUUID());
        setTimelineError(error instanceof Error ? error.message : "Could not restore the saved session timeline.");
      } finally {
        setTimelineLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!timelineLoaded || !sessionId) return;
    queueMicrotask(() => {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ sessionId, events: timeline }));
        setTimelineError("");
      } catch {
        setTimelineError("Could not save the session timeline in this browser.");
      }
    });
  }, [sessionId, timeline, timelineLoaded]);

  const recordEvent = useCallback((kind: SessionEvent["kind"], payload?: SessionEvent["payload"]) => {
    if (!sessionId) return;
    const timestamp = new Date().toISOString();
    setTimeline((current) => {
      const previousTime = current.length > 0 ? Date.parse(current[current.length - 1].occurredAt) : 0;
      const occurredAt = Date.parse(timestamp) <= previousTime
        ? new Date(previousTime + 1).toISOString()
        : timestamp;
      return [...current, {
        id: crypto.randomUUID(),
        sessionId,
        kind,
        occurredAt,
        ...(payload ? { payload } : {}),
      }];
    });
  }, [sessionId]);

  useLayoutEffect(() => {
    recordEventRef.current = recordEvent;
  }, [recordEvent]);

  const onEditorMount: OnMount = useCallback((editor) => {
    editorSubscription.current?.dispose();
    editorSubscription.current = editor.onDidChangeModelContent((change) => {
      const charsInserted = change.changes.reduce((total, item) => total + item.text.length, 0);
      const charsDeleted = change.changes.reduce((total, item) => total + item.rangeLength, 0);
      recordEventRef.current("edit", {
        charsInserted,
        charsDeleted,
        isPaste: pastePending.current,
      });
      pastePending.current = false;
    });
  }, []);

  useEffect(() => () => editorSubscription.current?.dispose(), []);

  useEffect(() => {
    if (!timelineLoaded) return;
    const recordVisibility = () => recordEvent("focus-change", { hidden: document.visibilityState === "hidden" });
    document.addEventListener("visibilitychange", recordVisibility);
    return () => document.removeEventListener("visibilitychange", recordVisibility);
  }, [recordEvent, timelineLoaded]);

  function startNewAttempt() {
    const nextSessionId = crypto.randomUUID();
    setSessionId(nextSessionId);
    setTimeline([]);
    setTimelineError("");
  }

  function changeLanguage(nextLanguage: CodeExecutionRequest["language"]) {
    setLanguage(nextLanguage);
    setSourceCode(starterCode[nextLanguage]);
    setExecution(null);
    setSubmission(null);
    setVivaQuestions([]);
    setVivaAnswers({});
    setVivaEvaluations([]);
    setVivaUnderstandingScore(null);
    setVivaMessage("");
    setErrorCode(undefined);
  }

  function changeSourceCode(value: string) {
    setSourceCode(value);
    setVivaQuestions([]);
    setVivaAnswers({});
    setVivaEvaluations([]);
    setVivaUnderstandingScore(null);
    setVivaMessage("");
  }

  async function requestExecution(action: "run" | "submit" | "hostile") {
    const isSubmission = action !== "run";
    recordEvent(action === "run" ? "run" : "submit", action === "hostile" ? { hostileInput: true } : undefined);
    const submittedSource = action === "hostile"
      ? language === "python" ? "while True:\n    pass" : "while (true) {}"
      : sourceCode;
    if (isSubmission) {
      setVivaQuestions([]);
      setVivaAnswers({});
      setVivaEvaluations([]);
      setVivaUnderstandingScore(null);
      setVivaMessage("");
      if (action === "submit") {
        const viva = prepareVivaForSubmit(submittedSource);
        setVivaQuestions(viva.questions);
        setVivaMessage(viva.message);
      }
    }
    setPending(true);
    setExecution(null);
    setSubmission(null);
    setErrorCode(undefined);
    setMessage(action === "run" ? "Checking provider…" : action === "hostile" ? "Sending hostile input with a 12-second timeout…" : "Checking provider for hidden tests…");
    try {
      const response = await fetch(isSubmission ? "/api/code/submit" : "/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, sourceCode: submittedSource, ...(isSubmission ? {} : { stdin }) }),
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
      if (isSubmission) {
        if (!candidate || candidate.ok !== true || !isCodeSubmissionResponse(candidate.data)) {
          setErrorCode("INVALID_API_RESPONSE");
          setMessage("The submission API response did not match its contract.");
          return;
        }
        setSubmission(candidate.data);
        setProviderReady(true);
        setMessage(`${candidate.data.passed} of ${candidate.data.total} hidden tests passed. Loop mastery was updated.`);
        return;
      }

      if (!candidate || candidate.ok !== true || !isCodeExecutionResult(candidate.data)) {
        setErrorCode("INVALID_API_RESPONSE");
        setMessage("The execution API response did not match its contract.");
        return;
      }

      setExecution(candidate.data);
      setProviderReady(true);
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

  async function evaluateViva(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (vivaQuestions.length !== 3 || vivaQuestions.some((question) => !vivaAnswers[question.id]?.trim())) return;
    setPending(true);
    setVivaMessage("Evaluating your explanations with the local heuristic evaluator…");
    setVivaEvaluations([]);
    setVivaUnderstandingScore(null);
    try {
      const response = await fetch("/api/viva/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          sourceCode,
          answers: vivaQuestions.map((question) => ({ questionId: question.id, answer: vivaAnswers[question.id] })),
        }),
        signal: AbortSignal.timeout(20_000),
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        setVivaMessage("The viva API returned an unreadable response.");
        return;
      }
      if (!response.ok || !payload || typeof payload !== "object" || (payload as { ok?: unknown }).ok !== true) {
        const failure = payload && typeof payload === "object" ? (payload as { error?: { message?: unknown } }).error : undefined;
        setVivaMessage(typeof failure?.message === "string" ? failure.message : "Your explanations could not be evaluated.");
        return;
      }
      const data = (payload as { data?: unknown }).data;
      if (!data || typeof data !== "object") {
        setVivaMessage("The viva API response did not match its contract.");
        return;
      }
      const result = data as Partial<VivaResponse>;
      if (
        !Array.isArray(result.evaluations)
        || result.evaluations.length !== vivaQuestions.length
        || !result.evaluations.every((evaluation) => evaluation
          && typeof evaluation.questionId === "string"
          && typeof evaluation.score === "number"
          && Number.isFinite(evaluation.score)
          && evaluation.score >= 0
          && evaluation.score <= 1
          && typeof evaluation.feedback === "string"
          && evaluation.evaluatedBy === "heuristic")
        || typeof result.understandingScore !== "number"
        || typeof result.masteryCounted !== "boolean"
        || !Array.isArray(result.mastery)
      ) {
        setVivaMessage("The viva API response did not match its contract.");
        return;
      }
      setVivaEvaluations(result.evaluations);
      setVivaUnderstandingScore(result.understandingScore);
      setVivaMessage(result.masteryCounted
        ? "Heuristic evaluation complete. Your loops mastery was updated."
        : "Heuristic evaluation complete. This mission's viva mastery update was already counted.");
    } catch {
      setVivaMessage("Could not reach the viva evaluation API. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const hasError = errorCode !== undefined;

  return <div className="space-y-5">
    <div className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--panel)] shadow-card" onPasteCapture={() => {
      pastePending.current = true;
      queueMicrotask(() => { pastePending.current = false; });
    }}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e6b657]" /><span className="text-xs font-bold text-white/85">solution</span><span className="text-xs text-white/40">/</span><label htmlFor="language" className="sr-only">Editor language</label><select id="language" value={language} disabled={pending} onChange={(event) => changeLanguage(event.target.value as CodeExecutionRequest["language"])} className="rounded-lg border border-white/10 bg-[#18262e] px-2.5 py-1.5 text-xs font-semibold text-white/80 disabled:opacity-60"><option value="typescript">TypeScript</option><option value="javascript">JavaScript</option><option value="python">Python</option></select></div>
      <div className="flex items-center gap-2"><span title="Provider status" className="inline-flex items-center gap-1.5 text-[11px] text-[#e8bd64]"><Settings2 size={13} /> {providerReady ? "Provider ready" : "Provider not configured"}</span><button type="button" onClick={() => void requestExecution("run")} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-[#171411] hover:bg-brand-dark disabled:opacity-60"><Play size={13} fill="currentColor" /> Run</button><button type="button" onClick={() => void requestExecution("submit")} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/85 hover:bg-white/10 disabled:opacity-60"><Send size={13} /> Submit</button><button type="button" onClick={() => void requestExecution("hostile")} disabled={pending} className="rounded-lg border border-[#e8bd64]/40 px-2 py-2 text-[10px] font-semibold text-[#e8bd64] hover:bg-white/10 disabled:opacity-60">Try hostile input</button></div>
    </div>
    <div className="h-[390px]">
      <Monaco height="390px" theme="vs-dark" language={language} value={sourceCode} onChange={(value) => changeSourceCode(value ?? "")} onMount={onEditorMount} options={{ minimap: { enabled: false }, readOnly: pending, fontSize: 13, tabSize: 2, scrollBeyondLastLine: false, padding: { top: 16 }, automaticLayout: true, wordWrap: "on", lineNumbersMinChars: 3 }} />
    </div>
    <div className="grid gap-0 border-t border-white/10 md:grid-cols-[0.8fr_1.2fr]">
      <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r"> <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Standard input</span><textarea value={stdin} onChange={(event) => setStdin(event.target.value)} rows={2} placeholder="Optional input" className="mt-2 w-full resize-y bg-transparent font-mono text-xs leading-5 text-white/85 outline-none placeholder:text-white/30" /></label>
      <div className="p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Run result</span><span className="text-[10px] text-white/35">{execution ? `${execution.durationMs ?? "—"} ms` : pending ? "Waiting for API" : "No execution"}</span></div>
        <p role={hasError ? "alert" : "status"} aria-live="polite" className="mt-2 text-xs leading-5 text-[#e8bd64]">{message}{errorCode ? <span className="ml-1 text-white/45">({errorCode})</span> : null}</p>
        {submission && <div aria-label="Hidden test results" className="mt-3 flex flex-wrap gap-2">
          {submission.cases.map((testCase, index) => <span key={testCase.caseId} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${testCase.passed ? "border-[#338f75]/50 bg-[#174b40] text-[#9ae0c8]" : "border-[#b35c53]/50 bg-[#542c2a] text-[#ffb3aa]"}`}>Case {index + 1}: {testCase.passed ? "Pass" : "Fail"}</span>)}
        </div>}
        {vivaQuestions.length > 0 && <section aria-labelledby="viva-heading" className="mt-5 border-t border-white/10 pt-4">
          <h3 id="viva-heading" className="text-sm font-bold text-white/90">Now explain your solution</h3>
          <p className="mt-1 text-[11px] leading-5 text-white/55">Questions are based on the identifiers and loop in your submitted code. Your answers are evaluated locally with a heuristic, not an LLM.</p>
          <form onSubmit={(formEvent) => void evaluateViva(formEvent)} className="mt-3 space-y-4">
            {vivaQuestions.map((question, index) => {
              const evaluation = vivaEvaluations.find((item) => item.questionId === question.id);
              return <div key={question.id}>
                <label htmlFor={`viva-answer-${question.id}`} className="block text-xs font-semibold leading-5 text-white/85">{index + 1}. {question.prompt}</label>
                <textarea
                  id={`viva-answer-${question.id}`}
                  value={vivaAnswers[question.id] ?? ""}
                  onChange={(changeEvent) => setVivaAnswers((current) => ({ ...current, [question.id]: changeEvent.target.value }))}
                  maxLength={2_000}
                  rows={2}
                  disabled={pending || vivaEvaluations.length > 0}
                  required
                  className="mt-2 w-full rounded-lg border border-white/15 bg-[#18262e] px-3 py-2 text-xs leading-5 text-white/85 outline-none focus:border-brand disabled:opacity-70"
                />
                {evaluation && <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs leading-5 text-white/75"><strong>{evaluation.score.toFixed(1)} · Heuristic feedback:</strong> {evaluation.feedback}</p>}
              </div>;
            })}
            {vivaEvaluations.length === 0 && <button type="submit" disabled={pending || vivaQuestions.some((question) => !vivaAnswers[question.id]?.trim())} className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-[#171411] hover:bg-brand-dark disabled:opacity-50">Evaluate explanations</button>}
          </form>
          {vivaMessage && <p role="status" aria-live="polite" className="mt-3 text-xs leading-5 text-[#e8bd64]">{vivaMessage}</p>}
          {vivaUnderstandingScore !== null && <p className="mt-2 text-xs font-semibold text-white/75">Understanding score: {Math.round(vivaUnderstandingScore * 100)}% · loops mastery updated</p>}
        </section>}
        {vivaQuestions.length === 0 && vivaMessage && <p role="status" className="mt-3 text-xs leading-5 text-[#e8bd64]">{vivaMessage}</p>}
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
    </div>
    {timelineError && <p role="status" className="rounded-xl border border-[#725b36] bg-[#292318] px-4 py-3 text-xs text-[#e8d4ad]">{timelineError}</p>}
    <SessionReplay key={sessionId} sessionId={sessionId || "loading"} events={timeline} onStartNewAttempt={startNewAttempt} />
  </div>;
}
