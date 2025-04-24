// src/internal/components/auth/ProxyLoginFormUI.tsx
/**
 * Login form for proxy mode without server URL field
 */
import React from "react";
import LoginFormUI, { LoginFormUIProps } from "./LoginFormUI";

export type ProxyLoginFormUIProps = Omit<LoginFormUIProps, "showServerUrl">;

const ProxyLoginFormUI: React.FC<ProxyLoginFormUIProps> = (props) => {
  return <LoginFormUI {...props} showServerUrl={false} />;
};

export default ProxyLoginFormUI;
