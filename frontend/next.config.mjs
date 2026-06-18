/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["jsbarcode", "ethiopian-calendar-date-converter"],

  experimental: {
    // Next.js 14.x key to prevent server build from trying to bundle browser-only/WASM packages
    serverComponentsExternalPackages: [
      "@imgly/background-removal",
      "@mediapipe/tasks-vision",
      "onnxruntime-web",
      "onnxruntime-node",
      "tesseract.js",
      "pdfjs-dist",
    ],
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      };
    }

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };

    // Disable Webpack 5's automatic asset resolution for `new URL(..., import.meta.url)`.
    // This stops onnxruntime-web's internal worker/wasm files (like `ort.bundle.min.mjs`)
    // from being copied to `static/media/` as raw assets, which avoids Terser minifier
    // syntax errors during production compilation since `import.meta` cannot be parsed
    // by Terser in non-ESM chunk assets.
    config.module = config.module || {};
    config.module.parser = {
      ...config.module.parser,
      javascript: {
        ...config.module.parser?.javascript,
        url: false,
      },
    };

    return config;
  },
};

export default nextConfig;