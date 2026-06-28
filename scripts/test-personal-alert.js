const { Client, LocalAuth } = require("whatsapp-web.js");

const ALERT_NUMBER = "263778095142";

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "visionco-0778095142" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
  }
});

client.on("ready", async () => {
  console.log("WhatsApp ready. Sending test alert...");

  const text = `VisionCo post Update
Test alert working
Images left in the folder: checking`;

  try {
    const numberId = await client.getNumberId(ALERT_NUMBER);
    await client.sendMessage(numberId ? numberId._serialized : `${ALERT_NUMBER}@c.us`, text);
    console.log("Test alert sent.");
  } catch (e) {
    console.log("Alert failed:", e.message);
  }

  setTimeout(async () => {
    await client.destroy();
    process.exit(0);
  }, 5000);
});

client.initialize();
