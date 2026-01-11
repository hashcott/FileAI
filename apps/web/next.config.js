/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ["@fileai/shared"],
    output: "standalone",
};

module.exports = nextConfig;
