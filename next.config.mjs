/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["jsbarcode", "ethiopian-calendar-date-converter"],
};

export default nextConfig;
