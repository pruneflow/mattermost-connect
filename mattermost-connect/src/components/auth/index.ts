// src/components/auth/index.ts
/**
 * Exports all authentication components
 */

export { default as Login } from "./Login";
export { default as DirectLogin } from "./DirectLogin";
export { default as ProxyLogin } from "./ProxyLogin";
export { default as DemoLogin } from "./DemoLogin";

export type { LoginProps } from "./Login";
export type { DirectLoginProps } from "./DirectLogin";
export type { ProxyLoginProps } from "./ProxyLogin";
export type { DemoLoginProps } from "./DemoLogin";
