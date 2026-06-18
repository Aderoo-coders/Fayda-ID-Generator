/// <reference lib="webworker" />

import * as ort from "onnxruntime-web";

declare const self: DedicatedWorkerGlobalScope;

export {};

ort.env.wasm.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

let session: ort.InferenceSession | null = null;

self.addEventListener("message", async (e) => {
  const { type, payload } = e.data || {};

  try {
    switch (type) {
      case "INIT_MODEL":
        session = await ort.InferenceSession.create(
          payload.modelPath,
          {
            executionProviders: ["wasm"],
          }
        );

        self.postMessage({
          type: "MODEL_READY",
        });
        break;

      case "RUN_INFERENCE":
        if (!session) {
          throw new Error("Model not initialized");
        }

        const results = await session.run(payload.feeds);

        self.postMessage({
          type: "INFERENCE_SUCCESS",
          payload: results,
        });
        break;
    }
  } catch (err: any) {
    self.postMessage({
      type: "INFERENCE_FAILURE",
      error: err?.message || "Unknown error",
    });
  }
});