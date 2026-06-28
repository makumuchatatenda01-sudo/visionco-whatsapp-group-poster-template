const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "visionco-0778095142"
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions"
    ]
  }
});

client.on("qr", qr => {
  console.log("");
  console.log("===== SCAN THIS QR WITH WHATSAPP =====");
  qrcode.generate(qr, { small: true });
  console.log("");
});

client.on("ready", async () => {
  console.log("===== WHATSAPP LINKED SUCCESSFULLY =====");
  console.log("You can now press CTRL+C.");
});

client.on("authenticated", () => {
  console.log("Authenticated. Waiting for ready...");
});

client.on("auth_failure", msg => {
  console.error("AUTH FAILURE:", msg);
});

client.initialize();
