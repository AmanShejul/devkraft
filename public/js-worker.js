self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.WebSocket = undefined;
self.EventSource = undefined;
self.importScripts = undefined;
self.indexedDB = undefined;
self.caches = undefined;

self.onmessage = (event) => {
  const { id, code } = event.data ?? {};
  if (typeof id !== "number" || typeof code !== "string") {
    self.postMessage({ id, ok: false, error: "The JavaScript worker received an invalid request." });
    return;
  }

  const output = [];
  const stringify = (value) => {
    if (typeof value === "string") return value;
    try {
      const json = JSON.stringify(value);
      return json === undefined ? String(value) : json;
    } catch {
      return String(value);
    }
  };
  const capturedConsole = {
    log: (...values) => output.push(values.map(stringify).join(" ")),
    info: (...values) => output.push(values.map(stringify).join(" ")),
    warn: (...values) => output.push(values.map(stringify).join(" ")),
    error: (...values) => output.push(values.map(stringify).join(" ")),
    clear: () => output.splice(0, output.length),
  };

  try {
    new Function("console", `"use strict";\n${code}`)(capturedConsole);
    self.postMessage({ id, ok: true, output: output.join("\n") });
  } catch (error) {
    self.postMessage({ id, ok: false, output: output.join("\n"), error: error instanceof Error ? error.message : String(error) });
  }
};
