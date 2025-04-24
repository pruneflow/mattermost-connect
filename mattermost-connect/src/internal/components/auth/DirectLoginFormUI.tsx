// src/internal/components/auth/DirectLoginFormUI.tsx
/**
 * Login form for direct mode with server URL field
 */
import React from "react";
import LoginFormUI, { LoginFormUIProps } from "./LoginFormUI";

export interface DirectLoginFormUIProps
  extends Omit<LoginFormUIProps, "showServerUrl"> {
  /** Initial server URL value */
  initialServerUrl?: string;
}

const DirectLoginFormUI: React.FC<DirectLoginFormUIProps> = (props) => {
  return <LoginFormUI {...props} showServerUrl={true} />;
};

export default DirectLoginFormUI;
