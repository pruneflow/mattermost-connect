import type { Meta, StoryObj, Decorator } from "@storybook/react";
import React, { useState } from "react";
import { MattermostProvider } from "../../../context/MattermostProvider";
import TeamSelector from "./TeamSelector";
import { Team } from "../../../types";

// Mock Mattermost service pour Storybook
const createMockMattermostService = () => ({
  getTeams: async () => mockTeams,
  getCurrentUser: async () => ({
    id: "user1",
    username: "johndoe",
    first_name: "John",
    last_name: "Doe",
  }),
  // Autres méthodes mockées si nécessaire
});

// Decorateur pour fournir un MattermostProvider factice
const MattermostProviderDecorator: Decorator = (Story) => (
  <MattermostProvider
    serviceProvider={{
      setupService: createMockMattermostService,
      isConnected: true,
      skipConnectionTest: true,
    }}
  >
    <Story />
  </MattermostProvider>
);

const meta: Meta<typeof TeamSelector> = {
  title: "Components/TeamSelector",
  component: TeamSelector,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [MattermostProviderDecorator],
  argTypes: {
    variant: {
      control: { type: "select", options: ["list", "grid", "tabs", "sidebar"] },
    },
    onSelectTeam: { action: "team selected" },
  },
};

export default meta;

type Story = StoryObj<typeof TeamSelector>;

// Mock teams data
const mockTeams: Team[] = [
  {
    id: "team1",
    name: "engineering",
    display_name: "Engineering Team",
    description: "Team for developers and engineers",
    member_count: 12,
  },
  {
    id: "team2",
    name: "marketing",
    display_name: "Marketing Team",
    description: "Team for marketing and communications",
    member_count: 8,
  },
  {
    id: "team3",
    name: "product",
    display_name: "Product Management",
    description: "Team for product managers and designers",
    member_count: 5,
  },
  {
    id: "team4",
    name: "support",
    display_name: "Customer Support",
    description: "Team for customer success and support",
    member_count: 15,
  },
];

// Wrapper component to manage selection state
const TeamSelectorWrapper = (args) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(
    undefined,
  );

  const handleSelectTeam = (team: Team) => {
    setSelectedTeamId(team.id);
    args.onSelectTeam(team);
  };

  return (
    <TeamSelector
      {...args}
      selectedTeamId={selectedTeamId}
      onSelectTeam={handleSelectTeam}
    />
  );
};

export const List: Story = {
  render: (args) => <TeamSelectorWrapper {...args} variant="list" />,
  args: {
    showIcons: true,
    showDescriptions: true,
    showMemberCount: true,
    maxNameLength: 0,
  },
};

export const Grid: Story = {
  render: (args) => <TeamSelectorWrapper {...args} variant="grid" />,
  args: {
    showIcons: true,
    showDescriptions: true,
    showMemberCount: true,
    maxNameLength: 20,
  },
};

export const Tabs: Story = {
  render: (args) => <TeamSelectorWrapper {...args} variant="tabs" />,
  args: {
    showIcons: true,
    showMemberCount: true,
    maxNameLength: 15,
  },
};

export const Sidebar: Story = {
  render: (args) => (
    <div style={{ height: "500px", width: "100px" }}>
      <TeamSelectorWrapper {...args} variant="sidebar" />
    </div>
  ),
  args: {
    showIcons: true,
    showDescriptions: true,
    showMemberCount: true,
  },
};

// Variations
export const ListNoIcons: Story = {
  ...List,
  args: {
    ...List.args,
    showIcons: false,
  },
};

export const GridNoDescription: Story = {
  ...Grid,
  args: {
    ...Grid.args,
    showDescriptions: false,
  },
};

export const TabsLimitedName: Story = {
  ...Tabs,
  args: {
    ...Tabs.args,
    maxNameLength: 10,
  },
};

export const SidebarNoMemberCount: Story = {
  ...Sidebar,
  args: {
    ...Sidebar.args,
    showMemberCount: false,
  },
};
