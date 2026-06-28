const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

const ROOT = "/opt/visionco-wa-test";

const REMOTE_INBOX = "gdrive:VisionCo Marketing/Flyers/Inbox";
const REMOTE_USED = "gdrive:VisionCo Marketing/Flyers/Used";

const LOCAL_WORKING = path.join(ROOT, "flyers/group-working");
const LOCAL_USED = path.join(ROOT, "flyers/used");
const ACTIVE_GROUPS_FILE = path.join(ROOT, "config/active-groups.json");

const ALERT_NUMBER = "263778095142";
const ALERT_CHAT_ID = `${ALERT_NUMBER}@c.us`;

const CAPTION = `*VisionCo.*
Smart Solution • Stronger Businesses
💬Dm for more info`;

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function run(cmd) {
  console.log("RUN:", cmd);
  execSync(cmd, { stdio: "inherit" });
}

function tryRun(cmd) {
  console.log("RUN:", cmd);
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (err) {
    console.log("WARNING: Command failed:", err.message);
    return false;
  }
}

function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function harareTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Harare",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

function harareDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Harare",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function extFromMime(mime) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";

  if (mime === "video/mp4") return ".mp4";
  if (mime === "video/quicktime") return ".mov";
  if (mime === "video/webm") return ".webm";
  if (mime === "video/x-m4v") return ".m4v";

  return "";
}

function isAllowedMediaMime(mime) {
  const m = String(mime || "");
  return m.startsWith("image/") || m.startsWith("video/");
}

function mediaLabel(mime) {
  return String(mime || "").startsWith("video/") ? "Video" : "Image";
}

function safeName(name) {
  return String(name || "media")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function getDriveMedia() {
  const raw = sh(`rclone lsjson "${REMOTE_INBOX}" --files-only`);
  const files = JSON.parse(raw || "[]");

  return files
    .filter(f => f && f.ID && f.MimeType && isAllowedMediaMime(f.MimeType))
    .map(f => ({
      id: f.ID,
      name: f.Name || f.Path || "media",
      path: f.Path || f.Name || "media",
      mime: f.MimeType,
      ext: extFromMime(f.MimeType),
      size: f.Size || 0
    }))
    .filter(f => f.ext);
}

function getDriveMediaCount() {
  try {
    return getDriveMedia().length;
  } catch {
    return "unknown";
  }
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function findLocalFile(selected) {
  const files = fs.readdirSync(LOCAL_WORKING)
    .map(name => path.join(LOCAL_WORKING, name))
    .filter(file => fs.statSync(file).isFile());

  let found = files.find(file => {
    const st = fs.statSync(file);
    return selected.size && st.size === selected.size;
  });

  if (found) return found;

  found = files
    .map(file => ({ file, time: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.time - a.time)[0];

  return found ? found.file : null;
}

async function sendAlert(client, text) {
  try {
    console.log("===== SENDING PERSONAL ALERT =====");
    console.log(text);

    const numberId = await client.getNumberId(ALERT_NUMBER);

    if (numberId && numberId._serialized) {
      await client.sendMessage(numberId._serialized, text);
    } else {
      await client.sendMessage(ALERT_CHAT_ID, text);
    }

    console.log("Personal alert sent.");
    await sleep(5000);
  } catch (e) {
    console.log("WARNING: Alert failed:", e.message);
  }
}

async function createClient() {
  return new Client({
    authStrategy: new LocalAuth({ clientId: "visionco-0778095142" }),
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
}

async function main() {
  fs.mkdirSync(LOCAL_WORKING, { recursive: true });
  fs.mkdirSync(LOCAL_USED, { recursive: true });

  const groups = JSON.parse(fs.readFileSync(ACTIVE_GROUPS_FILE, "utf8")).groups || [];
  if (!groups.length) throw new Error("No active groups found.");

  const mediaFiles = getDriveMedia();

  const client = await createClient();

  client.on("ready", async () => {
    console.log("WhatsApp ready.");

    if (!mediaFiles.length) {
      await sendAlert(
        client,
        `VisionCo post Update\nNo pictures or videos available on ${harareDate()}\nMedia files left in the folder: 0`
      );

      await client.destroy();
      process.exit(0);
    }

    const selected = randomItem(mediaFiles);
    const type = mediaLabel(selected.mime);
    const stamp = Date.now();
    const usedFileName = `${stamp}-${safeName(selected.name)}${selected.ext}`;

    console.log("Selected media:", selected.name);
    console.log("Type:", type);
    console.log("Mime:", selected.mime);
    console.log("Groups:", groups.length);

    run(`rm -rf ${shellQuote(LOCAL_WORKING)}/*`);
    run(`rclone copy "${REMOTE_INBOX}" ${shellQuote(LOCAL_WORKING)} --max-depth 1 -P`);

    const localSource = findLocalFile(selected);
    if (!localSource) throw new Error("No usable local media after download.");

    const sendPath = path.join(LOCAL_WORKING, usedFileName);
    fs.copyFileSync(localSource, sendPath);

    console.log("Prepared send file:", sendPath);
    console.log("Sending to active groups...");

    const media = MessageMedia.fromFilePath(sendPath);

    let success = 0;
    let failed = 0;
    const failedGroups = [];

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];

      try {
        console.log(`Sending ${i + 1}/${groups.length}: ${g.name}`);
        await client.sendMessage(g.id, media, { caption: CAPTION });
        success++;
        await sleep(12000);
      } catch (err) {
        failed++;
        failedGroups.push(g.name);
        console.log(`FAILED: ${g.name}: ${err.message}`);
        await sleep(5000);
      }
    }

    const localUsedPath = path.join(LOCAL_USED, usedFileName);
    fs.copyFileSync(sendPath, localUsedPath);

    tryRun(`rclone copyto ${shellQuote(localUsedPath)} "${REMOTE_USED}/${usedFileName}" -P`);

    const inboxOriginalPath = `${REMOTE_INBOX}/${selected.path}`;
    const removedFromInbox = tryRun(`rclone deletefile ${shellQuote(inboxOriginalPath)} -P --drive-use-trash=true`);

    const mediaLeft = getDriveMediaCount();

    let alert = `VisionCo post Update\n${type} sent at ${harareTime()}\nGroups posted: ${success}/${groups.length}\nMedia files left in the folder: ${mediaLeft}`;

    if (failed > 0) {
      alert += `\nFailed groups: ${failed}`;
    }

    if (!removedFromInbox) {
      alert += `\nWarning: media saved to Used, but Inbox removal needs checking`;
    }

    await sendAlert(client, alert);

    console.log("DONE:");
    console.log(`Posted: ${success}/${groups.length}`);
    console.log(`Failed: ${failed}`);
    console.log(`Media left: ${mediaLeft}`);

    await client.destroy();
    process.exit(0);
  });

  client.on("auth_failure", msg => {
    console.error("AUTH FAILURE:", msg);
    process.exit(1);
  });

  client.initialize();
}

main().catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
