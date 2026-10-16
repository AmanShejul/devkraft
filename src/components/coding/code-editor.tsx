"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Play, Send, Settings2 } from "lucide-react";
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

export function CodeEditor() {
  const [language, setLanguage] = useState<CodeExecutionRequest["language"]>("typescript");
  const [sourceCode, setSourceCode] = useState(starterCode.typescript);
  const [stdin, setStdin] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("Execution provider not configured. Your code has not been run.");
  const [execution, setExecution] = useState<CodeExecutionResult | null>(null);

  function changeLanguage(nextLanguage: CodeExecutionRequest["language"]) {
    setLanguage(nextLanguage);
    setSourceCode(starterCode[nextLanguage]);
    setExecution(null);
  }

  async function requestExecution(action: "run" | "submit") {
    setPending(true);
    setExecution(null);
    setMessage(action === "run" ? "Checking provider…" : "Checking provider for submission…");
    try {
      const response = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, sourceCode, stdin }),
      });
      const payload = await response.json() as ApiResponse<CodeExecutionResult>;
      if (!payload.ok) throw new Error(payload.error.message);
      setExecution(payload.data);
      setMessage("Code execution completed by the configured provider.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The provider could not run this code.");
    } finally {
      setPending(false);
    }
  }

  return <div className="overflow-hidden rounded-[22px] border border-[#24343d] bg-[#101b22] shadow-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e6b657]" /><span className="text-xs font-bold text-white/85">solution</span><span className="text-xs text-white/40">/</span><label htmlFor="language" className="sr-only">Editor language</label><select id="language" value={language} onChange={(event) => changeLanguage(event.target.value as CodeExecutionRequest["language"])} className="rounded-lg border border-white/10 bg-[#18262e] px-2.5 py-1.5 text-xs font-semibold text-white/80"><option value="typescript">TypeScript</option><option value="javascript">JavaScript</option><option value="python">Python</option></select></div>
      <div className="flex items-center gap-2"><span title="Provider status" className="inline-flex items-center gap-1.5 text-[11px] text-[#e8bd64]"><Settings2 size={13} /> Provider not configured</span><button type="button" onClick={() => void requestExecution("run")} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-60"><Play size={13} fill="currentColor" /> Run</button><button type="button" onClick={() => void requestExecution("submit")} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/85 hover:bg-white/10 disabled:opacity-60"><Send size={13} /> Submit</button></div>
    </div>
    <div className="h-[390px]">
      <Monaco height="390px" theme="vs-dark" language={language} value={sourceCode} onChange={(value) => setSourceCode(value ?? "")} options={{ minimap: { enabled: false }, fontSize: 13, tabSize: 2, scrollBeyondLastLine: false, padding: { top: 16 }, automaticLayout: true, wordWrap: "on", lineNumbersMinChars: 3 }} />
    </div>
    <div className="grid gap-0 border-t border-white/10 md:grid-cols-[0.8fr_1.2fr]">
      <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r"> <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Standard input</span><textarea value={stdin} onChange={(event) => setStdin(event.target.value)} rows={2} placeholder="Optional input" className="mt-2 w-full resize-y bg-transparent font-mono text-xs leading-5 text-white/85 outline-none placeholder:text-white/30" /></label>
      <div className="p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Run result</span><span className="text-[10px] text-white/35">{execution ? `${execution.durationMs ?? "—"} ms` : "No execution"}</span></div>
        <p role="status" className="mt-2 text-xs leading-5 text-[#e8bd64]">{message}</p>
        {execution && <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-xs text-white/80">{execution.stderr || execution.stdout || "Provider returned no output."}</pre>}
      </div>
    </div>
  </div>;
}
