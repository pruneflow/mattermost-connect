// Données de test pour le mode démonstration
export const mockTeams = [
  {
    id: "team1",
    name: "engineering",
    display_name: "Équipe Ingénierie",
    description: "Équipe pour les développeurs et ingénieurs",
  },
  {
    id: "team2",
    name: "marketing",
    display_name: "Équipe Marketing",
    description: "Équipe pour le marketing et la communication",
  },
];

export const mockChannels = {
  team1: [
    {
      id: "channel1",
      name: "general",
      display_name: "Général",
      header: "Canal de discussion général",
      type: "O", // Public
      purpose: "Discussions générales de l'équipe",
      team_id: "team1",
    },
    {
      id: "channel2",
      name: "dev",
      display_name: "Développement",
      header: "Canal de développement logiciel",
      type: "O", // Public
      purpose: "Discussions techniques",
      team_id: "team1",
    },
    {
      id: "channel3",
      name: "private-channel",
      display_name: "Canal Privé",
      header: "Canal privé pour l'équipe",
      type: "P", // Private
      purpose: "Discussions confidentielles",
      team_id: "team1",
    },
  ],
  team2: [
    {
      id: "channel4",
      name: "general",
      display_name: "Général",
      header: "Canal général marketing",
      type: "O", // Public
      purpose: "Discussions générales marketing",
      team_id: "team2",
    },
    {
      id: "channel5",
      name: "campaigns",
      display_name: "Campagnes",
      header: "Organisation des campagnes marketing",
      type: "O", // Public
      purpose: "Planification de campagnes",
      team_id: "team2",
    },
  ],
};

export const mockUsers = [
  {
    id: "user1",
    username: "johndoe",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
  },
  {
    id: "user2",
    username: "janedoe",
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
  },
  {
    id: "user3",
    username: "bobsmith",
    first_name: "Bob",
    last_name: "Smith",
    email: "bob@example.com",
  },
];

export const mockMessages = {
  channel1: [
    {
      id: "post1",
      user_id: "user1",
      channel_id: "channel1",
      message: "Bonjour tout le monde ! Comment allez-vous aujourd'hui ?",
      create_at: Date.now() - 3600000, // 1 heure avant
      update_at: Date.now() - 3600000,
    },
    {
      id: "post2",
      user_id: "user2",
      channel_id: "channel1",
      message: "Salut John ! Tout va bien ici, et toi ?",
      create_at: Date.now() - 3500000, // 58 minutes avant
      update_at: Date.now() - 3500000,
    },
    {
      id: "post3",
      user_id: "user1",
      channel_id: "channel1",
      message:
        "Très bien, merci ! J'ai une question sur le projet **Alpha** - quelqu'un a-t-il mis à jour la documentation ?",
      create_at: Date.now() - 3400000, // 56 minutes avant
      update_at: Date.now() - 3400000,
    },
    {
      id: "post4",
      user_id: "user3",
      channel_id: "channel1",
      message:
        "J'ai commencé à mettre à jour la documentation hier. Voici le lien [Documentation Alpha](https://example.com/docs/alpha)",
      create_at: Date.now() - 1800000, // 30 minutes avant
      update_at: Date.now() - 1800000,
    },
  ],
  channel2: [
    {
      id: "post5",
      user_id: "user1",
      channel_id: "channel2",
      message:
        "Voici du code JavaScript pour résoudre ce problème:\n```javascript\nfunction solution(input) {\n  return input.filter(x => x > 0).map(x => x * 2);\n}\n```",
      create_at: Date.now() - 7200000, // 2 heures avant
      update_at: Date.now() - 7200000,
    },
    {
      id: "post6",
      user_id: "user3",
      channel_id: "channel2",
      message:
        "Merci pour la solution, mais je pense qu'on peut l'optimiser davantage.",
      create_at: Date.now() - 5400000, // 1.5 heures avant
      update_at: Date.now() - 5400000,
    },
  ],
  channel3: [
    {
      id: "post7",
      user_id: "user2",
      channel_id: "channel3",
      message:
        "Rappel: la réunion confidentielle est programmée pour demain à 14h.",
      create_at: Date.now() - 86400000, // 1 jour avant
      update_at: Date.now() - 86400000,
    },
  ],
  channel4: [],
  channel5: [
    {
      id: "post8",
      user_id: "user2",
      channel_id: "channel5",
      message:
        "La nouvelle campagne va être lancée la semaine prochaine. Tout le monde est prêt ?",
      create_at: Date.now() - 172800000, // 2 jours avant
      update_at: Date.now() - 172800000,
    },
  ],
};

export const currentUser = {
  id: "user1",
  username: "johndoe",
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  roles: "system_user",
};
