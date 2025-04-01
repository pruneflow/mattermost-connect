import { useEffect, useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";

/**
 * Composant pour afficher du contenu en onglets
 * @param {Array} tabs - Tableau d'objets {label, content}
 * @param activeTab
 * @param onTabChange
 */
const TabbedContent = ({ tabs, activeTab = 0, onTabChange }) => {
  const [tabValue, setTabValue] = useState(activeTab);

  // Mettre à jour la valeur locale lorsque activeTab change
  useEffect(() => {
    setTabValue(activeTab);
  }, [activeTab]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (onTabChange) {
      onTabChange(event, newValue);
      Z;
    }
  };

  // Composant interne pour le panneau d'un onglet
  const TabPanel = ({ children, value, index }) => {
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`tabpanel-${index}`}
        aria-labelledby={`tab-${index}`}
      >
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
      </div>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="dashboard tabs"
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} id={`tab-${index}`} />
          ))}
        </Tabs>
      </Box>
      {tabs.map((tab, index) => (
        <TabPanel key={index} value={tabValue} index={index}>
          {tab.content}
        </TabPanel>
      ))}
    </Box>
  );
};

export default TabbedContent;
