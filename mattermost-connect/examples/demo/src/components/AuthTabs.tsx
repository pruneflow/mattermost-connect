import React from "react";
import { Tabs, Tab } from "@mui/material";

type AuthMode = "direct" | "proxy" | "demo";

interface AuthTabsProps {
  activeTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}

export const AuthTabs: React.FC<AuthTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <Tabs
      value={activeTab}
      onChange={onTabChange}
      centered
      sx={{
        mb: 3,
        "& .MuiTabs-indicator": {
          backgroundColor: "#0058CC",
        },
      }}
    >
      <Tab
        label="Direct Mode"
        sx={{
          textTransform: "none",
          fontWeight: activeTab === 0 ? 600 : 400,
          color: activeTab === 0 ? "#0058CC" : "#666",
        }}
      />
      <Tab
        label="Proxy Mode"
        sx={{
          textTransform: "none",
          fontWeight: activeTab === 1 ? 600 : 400,
          color: activeTab === 1 ? "#0058CC" : "#666",
        }}
      />
      <Tab
        label="Demo Mode"
        sx={{
          textTransform: "none",
          fontWeight: activeTab === 2 ? 600 : 400,
          color: activeTab === 2 ? "#0058CC" : "#666",
        }}
      />
    </Tabs>
  );
};