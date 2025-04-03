const logger = require("./logger");
const app = require("./app");
const http = require("http");

const port = process.env.PORT || app.get("port") || 3030;
const host = process.env.HOST || app.get("host") || "localhost";

const server = http.createServer(app);

server.listen(port);

process.on("unhandledRejection", (reason, p) =>
  logger.error("Unhandled Rejection at: Promise ", p, reason),
);

server.on("listening", () => {
  // Méthode correcte de logging avec Winston
  logger.info(`Feathers application started on http://${host}:${port}`);
});

server.on("error", (error) => {
  logger.error("Server start error:", error);
});
