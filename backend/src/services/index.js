const users = require("./users/users.service.js");
const mattermostSpaces = require("./mattermost-spaces/mattermost-spaces.service");
const mattermostIntegration = require("./mattermost-integration/mattermost-integration.js");
const knex = require("../models/knex");
const tokens = require("./tokens/tokens.service.js");
const statistics = require("./statistics/statistics.service.js");
const teamMembers = require("./team-members/team-members.service.js");
const channels = require("./channels/channels.service.js");
const teamMembersBulk = require("./team-members-bulk/team-members-bulk.service");
const mailer = require("./mailer/mailer.service.js");

module.exports = function (app) {
  app.configure(knex);
  app.configure(mattermostIntegration);
  app.configure(users);
  app.configure(mattermostSpaces);
  app.configure(tokens);
  app.configure(statistics);
  app.configure(teamMembers);
  app.configure(channels);
  app.configure(teamMembersBulk);
  app.configure(mailer);
};
