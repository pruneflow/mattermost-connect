const mailer = require("feathers-mailer");
const hooks = require("./mailer.hooks");
const { HtmlMailFactory } = require("./mailer.factory");

module.exports = async function (app) {
  const transporter = app.get("mailer").transporter;
  app.use(
    "/api/mailer",
    mailer(transporter, { from: app.get("defaultEmail"), replyTo: "" }),
  );

  const service = app.service("api/mailer");
  service.hooks(hooks);
};
