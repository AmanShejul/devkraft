"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { IDisposable } from "monaco-editor";
import { Check, Play, Send, Settings2 } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import { isCodeExecutionResult, type CodeExecutionRequest, type CodeExecutionResult, type ConceptMastery, type SessionEvent, type VivaEvaluation, type VivaQuestion } from "@/types/domain";
import { buildCountDownHarness, parseCountDownTestOutput, type CountDownTestResult } from "@/features/code-execution/count-down-tests";
import { updateMissionMasteryFromSubmission } from "@/features/code-execution/mastery";
import { evaluateVivaAnswers, prepareVivaForSubmit, updateVivaMastery } from "@/features/viva/viva";
import { countLocalVivaAttempt, getOrCreateBrowserLearnerId, hasLocalVivaAttempt, readLocalMasteryRecord, writeLocalMasteryRecord } from "@/features/assessments/local-mastery-store";
import { SessionReplay } from "@/components/coding/session-replay";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { AnimatedNumber } from "@/components/ui/text-animation";
import { isStoredArenaSession, readStoredArenaSessions, SESSION_HISTORY_STORAGE_KEY, SESSION_STORAGE_KEY } from "@/features/integrity/session-storage";
import { getStatus as getPyodideStatus, runPython } from "@/lib/pyodide/pyodide-client";
import { runJavaScript } from "@/lib/js/js-client";

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

interface CodeSubmissionResponse extends CountDownTestResult {
  mastery: { conceptId: string; probability: number; updatedAt?: string }[];
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
      return "Code execution is disabled on this deployment. Configure Judge0 or JDoodle server variables and redeploy.";
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

export function CodeEditor({ learnerId: initialLearnerId }: { learnerId?: string }) {
  const [learnerId, setLearnerId] = useState(initialLearnerId ?? "");
  const [language, setLanguage] = useState<CodeExecutionRequest["language"]>("typescript");
  const [sourceCode, setSourceCode] = useState(starterCode.typescript);
  const [stdin, setStdin] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("Ready to run. Choose Run to execute your code.");
  const [errorCode, setErrorCode] = useState<string>();
  const [execution, setExecution] = useState<CodeExecutionResult | null>(null);
  const [submission, setSubmission] = useState<CodeSubmissionResponse | null>(null);
  const [pythonLoading, setPythonLoading] = useState(false);
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
  const localPythonMastery = useRef<ConceptMastery[]>([]);
  const editorSubscription = useRef<IDisposable | null>(null);
  const recordEventRef = useRef<(kind: SessionEvent["kind"], payload?: SessionEvent["payload"]) => void>(() => {});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const id = initialLearnerId ?? getOrCreateBrowserLearnerId();
        setLearnerId(id);
        localPythonMastery.current = readLocalMasteryRecord(id).mastery;
      } catch (error) {
        setTimelineError(error instanceof Error ? error.message : "Local mastery could not be loaded.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialLearnerId]);

  function saveLocalMastery(mastery: ConceptMastery[]) {
    if (!learnerId) throw new Error("The learner profile is not ready for local progress.");
    const current = readLocalMasteryRecord(learnerId);
    writeLocalMasteryRecord(learnerId, { ...current, mastery });
    localPythonMastery.current = mastery;
  }

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
        const currentSession = { sessionId, events: timeline };
        const history = readStoredArenaSessions().filter((session) => session.sessionId !== sessionId);
        localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify([currentSession, ...history].slice(0, 25)));
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
    setMessage(nextLanguage === "python"
      ? "Python runs locally in your browser with Pyodide."
      : nextLanguage === "javascript"
        ? "JavaScript runs locally in your browser."
        : "TypeScript uses the server execution provider.");
  }

  function changeSourceCode(value: string) {
    setSourceCode(value);
    setExecution(null);
    setSubmission(null);
    setErrorCode(undefined);
    setMessage("Code changed. Run or submit the updated solution.");
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
    }
    setPending(true);
    setExecution(null);
    setSubmission(null);
    setErrorCode(undefined);
    if (language === "python") {
      const firstRun = getPyodideStatus() !== "ready";
      setPythonLoading(firstRun);
      setMessage(firstRun ? "Loading Python runtime…" : action === "submit" ? "Running hidden tests locally…" : "Running Python locally…");
      try {
        const pythonSource = action === "submit"
          ? `${submittedSource}\n${buildCountDownHarness("python")}`
          : submittedSource;
        const result = await runPython(pythonSource);
        if ("error" in result) {
          const isTimeout = result.error.toLowerCase().includes("12-second");
          setErrorCode(isTimeout ? "PYODIDE_TIMEOUT" : "PYODIDE_UNAVAILABLE");
          setMessage(result.error);
          return;
        }

        if (action === "submit") {
          const hiddenTests = parseCountDownTestOutput(result.output);
          if (!hiddenTests) {
            setErrorCode("INVALID_PYTHON_OUTPUT");
            setMessage("The Python runtime finished, but the hidden-test output was not valid. Check that count_down returns a list and try again.");
            return;
          }
          const mastery = updateMissionMasteryFromSubmission(localPythonMastery.current, hiddenTests.passed / hiddenTests.total >= 0.6);
          try {
            saveLocalMastery(mastery);
          } catch (saveError) {
            setTimelineError(saveError instanceof Error ? saveError.message : "Loop mastery could not be saved locally.");
          }
          setSubmission({ ...hiddenTests, mastery });
          const passedThreshold = hiddenTests.passed / hiddenTests.total >= 0.6;
          setMessage(`${hiddenTests.passed} of ${hiddenTests.total} hidden tests passed.${passedThreshold ? " Loop mastery was updated locally." : " Pass at least 3 hidden tests to unlock the viva."}`);
          if (passedThreshold) {
            const viva = prepareVivaForSubmit(submittedSource);
            setVivaQuestions(viva.questions);
            setVivaMessage(viva.message);
          }
        } else {
          setExecution({ status: "completed", output: result.output, provider: "pyodide-local" });
          setMessage(result.output.length > 0 ? "Python ran locally in your browser." : "Python ran locally with no output.");
        }
      } finally {
        setPythonLoading(false);
        setPending(false);
      }
      return;
    }
    if (language === "javascript") {
      setMessage(action === "run" ? "Running JavaScript locally…" : action === "hostile" ? "Running hostile input with a 12-second local timeout…" : "Running hidden tests locally…");
      try {
        const javascriptSource = action === "submit"
          ? `${submittedSource}\n${buildCountDownHarness("javascript")}`
          : submittedSource;
        const result = await runJavaScript(javascriptSource);
        if ("error" in result) {
          const isTimeout = result.error.toLowerCase().includes("12-second");
          setErrorCode(isTimeout ? "JAVASCRIPT_TIMEOUT" : "JAVASCRIPT_WORKER_ERROR");
          setMessage(result.error);
          return;
        }

        if (action === "submit") {
          const hiddenTests = parseCountDownTestOutput(result.output);
          if (!hiddenTests) {
            setErrorCode("INVALID_JAVASCRIPT_OUTPUT");
            setMessage("The JavaScript worker finished, but the hidden-test output was not valid. Check that countDown returns an array and try again.");
            return;
          }
          const passedThreshold = hiddenTests.passed / hiddenTests.total >= 0.6;
          const mastery = updateMissionMasteryFromSubmission(localPythonMastery.current, passedThreshold);
          try {
            saveLocalMastery(mastery);
          } catch (saveError) {
            setTimelineError(saveError instanceof Error ? saveError.message : "Loop mastery could not be saved locally.");
          }
          setSubmission({ ...hiddenTests, mastery });
          setMessage(`${hiddenTests.passed} of ${hiddenTests.total} hidden tests passed.${passedThreshold ? " Loop mastery was updated locally." : " Pass at least 3 hidden tests to unlock the viva."}`);
          if (passedThreshold) {
            const viva = prepareVivaForSubmit(submittedSource);
            setVivaQuestions(viva.questions);
            setVivaMessage(viva.message);
          }
        } else {
          setExecution({ status: "completed", output: result.output, provider: "javascript-local" });
          setMessage(result.output.length > 0 ? "JavaScript ran locally in your browser." : "JavaScript ran locally with no output.");
        }
      } finally {
        setPending(false);
      }
      return;
    }
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
        setMessage(`${candidate.data.passed} of ${candidate.data.total} hidden tests passed. Loop mastery was updated.`);
        if (action === "submit" && candidate.data.passed / candidate.data.total >= 0.6) {
          const viva = prepareVivaForSubmit(submittedSource);
          setVivaQuestions(viva.questions);
          setVivaMessage(viva.message);
        }
        return;
      }

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

  async function evaluateViva(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (vivaQuestions.length !== 3 || vivaQuestions.some((question) => !vivaAnswers[question.id]?.trim()) || !learnerId) return;
    setPending(true);
    setVivaMessage("Evaluating your explanations locally…");
    setVivaEvaluations([]);
    setVivaUnderstandingScore(null);
    try {
      const evaluations = evaluateVivaAnswers(sourceCode, vivaQuestions.map((question) => ({
        questionId: question.id,
        answer: vivaAnswers[question.id],
      })));
      const current = readLocalMasteryRecord(learnerId);
      const alreadyCounted = hasLocalVivaAttempt(learnerId, "countdown");
      const update = updateVivaMastery(current.mastery, evaluations, new Date(), alreadyCounted);
      writeLocalMasteryRecord(learnerId, { ...current, mastery: update.mastery });
      if (!alreadyCounted) countLocalVivaAttempt(learnerId, "countdown");
      localPythonMastery.current = update.mastery;
      setVivaEvaluations(evaluations);
      setVivaUnderstandingScore(update.understandingScore);
      setVivaMessage(update.masteryCounted
        ? "Heuristic evaluation complete. Your loops mastery was updated and this attempt was counted."
        : "Heuristic evaluation complete. This mission's viva attempt was already counted, so mastery was not updated again.");
    } catch (error) {
      setVivaMessage(error instanceof Error ? error.message : "Your explanations could not be evaluated or saved locally.");
    } finally {
      setPending(false);
    }
  }

  const hasError = errorCode !== undefined;

  return <div className="space-y-5">
    <div className="overflow-hidden rounded-[22px] border border-brand/20 bg-[var(--panel)] shadow-[0_22px_80px_rgba(0,0,0,.24)] before:block before:h-px before:bg-gradient-to-r before:from-transparent before:via-brand/70 before:to-transparent" onPasteCapture={() => {
      pastePending.current = true;
      queueMicrotask(() => { pastePending.current = false; });
    }}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div className="flex items-center gap-3"><span className="flex items-center gap-1.5" aria-hidden="true"><i className="size-2 rounded-full bg-[#ff6b62]" /><i className="size-2 rounded-full bg-[#f4bd4f]" /><i className="size-2 rounded-full bg-[#55c86a]" /></span><span className="text-xs font-bold text-white/85">solution</span><span className="text-xs text-white/40">/</span><label htmlFor="language" className="sr-only">Editor language</label><select id="language" value={language} disabled={pending} onChange={(event) => changeLanguage(event.target.value as CodeExecutionRequest["language"])} className="rounded-lg border border-white/10 bg-[#18262e] px-2.5 py-1.5 text-xs font-semibold text-white/80 disabled:opacity-60"><option value="typescript">TypeScript</option><option value="javascript">JavaScript</option><option value="python">Python</option></select></div>
      <div className="flex items-center gap-2"><span title="Provider status" className="hidden items-center gap-1.5 text-[11px] text-[#e8bd64] sm:inline-flex"><Settings2 size={13} /> {language === "typescript" ? "Provider not configured" : "Runs locally in your browser"}</span><MagneticButton><button type="button" onClick={() => void requestExecution("run")} disabled={pending} className={`relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg bg-brand px-3 py-2 text-xs font-bold text-[#171411] hover:bg-brand-dark disabled:opacity-60 ${pending ? "animate-pulse" : ""}`}>{pending && <span className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/35 animate-[shimmer_1.2s_infinite]" />}<Play size={13} fill="currentColor" /> {pending ? (pythonLoading ? "Loading Python runtime…" : "Running") : "Run"}</button></MagneticButton><button type="button" onClick={() => void requestExecution("submit")} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-2 text-xs font-bold text-brand hover:bg-brand/10 disabled:opacity-60"><Send size={13} /> Submit</button><button type="button" onClick={() => void requestExecution("hostile")} disabled={pending} className="hidden rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/65 hover:border-brand/50 hover:text-brand disabled:opacity-60 sm:inline-flex">Try hostile input</button></div>
    </div>
    <div className="h-[390px] bg-[#10161a]">
      <Monaco height="390px" theme="vs-dark" language={language} value={sourceCode} onChange={(value) => changeSourceCode(value ?? "")} onMount={onEditorMount} options={{ minimap: { enabled: false }, readOnly: pending, fontSize: 13, tabSize: 2, scrollBeyondLastLine: false, padding: { top: 16 }, automaticLayout: true, wordWrap: "on", lineNumbersMinChars: 3 }} />
    </div>
    <div className="grid gap-0 border-t border-white/10 md:grid-cols-[0.8fr_1.2fr]">
      <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r"> <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Standard input</span><textarea value={stdin} onChange={(event) => setStdin(event.target.value)} rows={2} placeholder="Optional input" className="mt-2 w-full resize-y bg-transparent font-mono text-xs leading-5 text-white/85 outline-none placeholder:text-white/30" /></label>
      <div className="p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Run result</span><span className="text-[10px] text-white/35">{execution ? `${execution.durationMs ?? "—"} ms` : pending ? "Waiting for API" : "No execution"}</span></div>
        <p role={hasError ? "alert" : "status"} aria-live="polite" className="mt-2 text-xs leading-5 text-[#e8bd64]">{message}{errorCode ? <span className="ml-1 text-white/45">({errorCode})</span> : null}</p>
        {submission && <div aria-label="Hidden test results" className="mt-3 flex flex-wrap gap-2">
          {submission.cases.map((testCase, index) => <motion.span key={testCase.caseId} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18, delay: index * 0.07 }} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${testCase.passed ? "border-[#338f75]/50 bg-[#174b40] text-[#9ae0c8]" : "border-[#b35c53]/50 bg-[#542c2a] text-[#ffb3aa]"}`}>{testCase.passed ? <Check size={11} className="mr-1 inline" /> : null}Case {index + 1}: {testCase.passed ? "Pass" : <details className="ml-1 inline"><summary className="inline cursor-pointer">Fail</summary><span className="ml-2 font-normal">Expected output differs for {testCase.caseId}.</span></details>}</motion.span>)}
        </div>}
        {vivaQuestions.length > 0 && <section aria-labelledby="viva-heading" className="mt-5 border-t border-white/10 pt-4">
          <h3 id="viva-heading" className="text-sm font-bold text-white/90">Now explain your solution</h3>
          <p className="mt-1 text-[11px] leading-5 text-white/55">Questions are based on the identifiers and loop in your submitted code. Your answers are evaluated locally with a heuristic, not an LLM.</p>
          <form onSubmit={(formEvent) => void evaluateViva(formEvent)} className="mt-3 space-y-4">
            {vivaQuestions.map((question, index) => {
              const evaluation = vivaEvaluations.find((item) => item.questionId === question.id);
              return <div key={question.id} className="rounded-xl border-l-2 border-brand bg-white/[.025] p-3">
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
                {evaluation && <p className="mt-2 rounded-lg bg-brand/[.07] px-3 py-2 text-xs leading-5 text-white/75"><strong><AnimatedNumber value={evaluation.score * 100} suffix="%" /> · Heuristic feedback:</strong> {evaluation.feedback}</p>}
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
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#10161a] px-4 py-2 text-[10px] uppercase tracking-[.12em] text-white/35"><span>{sourceCode.length.toLocaleString()} chars</span><span>{language}</span><span className="text-[#e8bd64]">{language === "typescript" ? "TypeScript uses the server execution provider" : "Runs locally in your browser"}</span></div>
    </div>
    {timelineError && <p role="status" className="rounded-xl border border-[#725b36] bg-[#292318] px-4 py-3 text-xs text-[#e8d4ad]">{timelineError}</p>}
    <SessionReplay key={sessionId} sessionId={sessionId || "loading"} events={timeline} onStartNewAttempt={startNewAttempt} />
  </div>;
}
