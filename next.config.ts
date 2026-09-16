import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @node-rs/jieba 是 CJS 原生模块，需要作为外部包处理
  serverExternalPackages: ["@node-rs/jieba", "@node-rs/jieba-linux-x64-gnu"],
};

export default nextConfig;
