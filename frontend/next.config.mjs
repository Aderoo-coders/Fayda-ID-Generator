/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["jsbarcode", "ethiopian-calendar-date-converter"],

  experimental: {
    // Next.js 14.x uses this key (renamed to top-level `serverExternalPackages` in Next.js 15+).
    // Prevents the server build from bundling browser-only packages that contain
    // import.meta / WASM / dynamic require.
    serverComponentsExternalPackages: [
      "@imgly/background-removal",
      "@mediapipe/tasks-vision",
      "onnxruntime-web",
      "onnxruntime-node",
      "tesseract.js",
      "pdfjs-dist",
    ],
  },

  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
      process.env.GOOGLE_CLIENT_ID?.trim() ||
      "",
  },

  webpack: (config, { isServer }) => {
    // Packages that must never be parsed/bundled by webpack on either side.
    // They either use import.meta (ESM-only, breaks Terser/CJS output) or
    // are WASM/native modules that load themselves at runtime.
    const neverBundle = [
      "@imgly/background-removal",
      "@mediapipe/tasks-vision",
      "onnxruntime-web",
      "onnxruntime-node",
      "tesseract.js",
      "pdfjs-dist",
    ];

    const existingExternals = Array.isArray(config.externals)
      ? config.externals
      : config.externals
      ? [config.externals]
      : [];

    // Mark as externals on BOTH server and client.
    // On the server: prevent Node.js-incompatible browser WASM from being required.
    // On the client: prevent Terser from choking on import.meta inside onnxruntime-web's
    //   pre-built ESM bundles (ort.bundle.min.mjs, ort.webgpu.bundle.min.mjs, etc.).
    //   These packages handle their own loading (CDN fetch / dynamic import) at runtime.
    config.externals = [
      ...existingExternals,
      ({ request }, callback) => {
        if (
          request &&
          neverBundle.some(
            (pkg) => request === pkg || request.startsWith(pkg + "/")
          )
        ) {
          // Use 'module' condition so both CJS and ESM callers get an external stub.
          return callback(null, "commonjs " + request);
        }
        callback();
      },
    ];

    // Suppress "Critical dependency" warnings from dynamic require() calls
    // inside tesseract.js and onnxruntime-web.
    config.module = config.module || {};
    config.module.exprContextCritical = false;

    // Prevent webpack from trying to parse .node binaries (onnxruntime-node).
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.node$/,
      use: "node-loader",
    });

    return config;
  },
};

export default nextConfig;
