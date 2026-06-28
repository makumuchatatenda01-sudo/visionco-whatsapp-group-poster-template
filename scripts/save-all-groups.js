const fs = require("fs");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");

const ROOT = "/opt/visionco-wa-test";
const OUT = path.join(ROOT, "config/groups.json");

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

client.on("qr", () => {
  console.log("QR requested. WhatsApp needs relinking.");
});

client.on("ready", async () => {
  console.log("WhatsApp ready. Reading groups...");

  const chats = await client.getChats();
  const groups = chats
    .filter(c => c.isGroup)
    .map(c => ({
      name: c.name,
      id: c.id._serialized
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ groups }, null, 2));

  console.log(`Saved ${groups.length} groups to ${OUT}`);
  console.log("");

  groups.forEach((g, i) => {
    console.log(`${i + 1}. ${g.name}`);
    console.log(`   ${g.id}`);
  });

  await client.destroy();
  process.exit(0);
});

client.on("auth_failure", msg => {
  console.error("AUTH FAILURE:", msg);
  process.exit(1);
});

client.initialize();
