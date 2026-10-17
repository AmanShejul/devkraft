// Pyodide 0.26.4 is pinned so deployments do not silently change runtimes.
// This release supports the classic worker/importScripts API used here.
const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

let runtimePromise = loadPyodide({ indexURL: PYODIDE_BASE_URL });

runtimePromise
  .then(() => self.postMessage({ type: "ready" }))
  .catch((caught) => {
    const error = caught instanceof Error ? caught.message : String(caught);
    self.postMessage({ type: "runtime-error", error });
  });

self.onmessage = async (event) => {
  const message = event.data;
  const id = message && message.id;
  const code = message && message.code;
  let output = "";
  let errorOutput = "";

  try {
    if (typeof id !== "number" || typeof code !== "string") {
      throw new Error("The Python worker received an invalid request.");
    }

    const pyodide = await runtimePromise;
    pyodide.setStdout({ batched: (text) => { output += text; } });
    pyodide.setStderr({ batched: (text) => { errorOutput += text; } });
    await pyodide.runPythonAsync(code);
    self.postMessage({ id, ok: true, output: output + errorOutput });
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : String(caught);
    self.postMessage({ id, ok: false, output, error: errorOutput ? `${errorOutput}\n${error}` : error });
  }
};
