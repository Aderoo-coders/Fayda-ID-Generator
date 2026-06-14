/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["jsbarcode", "ethiopian-calendar-date-converter"],

  experimental: {
    // Next.js 14.2 — correct key for preventing SSR bundling of browser-only packages.
    serverComponentsExternalPackages: [
      "@imgly/background-removal",
      "@mediapipe/tasks-vision",
      "onnxruntime-web",
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
    // Belt-and-suspenders: also mark these packages as webpack externals on the
    // server so Webpack never opens their files (avoids import.meta parse errors).
    if (isServer) {
      const browserOnlyPkgs = [
        "@imgly/background-removal",
        "@mediapipe/tasks-vision",
        "onnxruntime-web",
        "tesseract.js",
        "pdfjs-dist",
      ];
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];

      config.externals = [
        ...existingExternals,
        ({ request }, callback) => {
          if (
            request &&
            browserOnlyPkgs.some(
              (pkg) => request === pkg || request.startsWith(pkg + "/")
            )
          ) {
            return callback(null, "commonjs " + request);
          }
          callback();
        },
      ];
    }

    // Suppress "Critical dependency" warnings from dynamic require() calls
    // inside tesseract.js and onnxruntime-web.
    config.module = config.module || {};
    config.module.exprContextCritical = false;

    return config;
  },
};

export default nextConfig;
