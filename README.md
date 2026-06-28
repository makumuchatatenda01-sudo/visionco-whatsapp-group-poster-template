# VisionCo WhatsApp Group Poster Bot

Reusable WhatsApp group posting bot.

## What it does

- Picks one random image or video from Google Drive Inbox
- Sends it to selected WhatsApp groups
- Moves used media to Google Drive Used
- Removes used media from Inbox so it is not reused
- Sends personal alert after posting
- Sends empty-folder alert if there is no media

## Setup

1. Run npm install
2. Copy .env.example to .env
3. Link WhatsApp using scripts/link-whatsapp.js
4. Save groups using scripts/save-all-groups.js
5. Add chosen groups to config/active-groups.json
6. Run run-send-one-groups.sh

## Main files

- scripts/send-one-image-active-groups.js
- scripts/save-all-groups.js
- scripts/test-personal-alert.js
- scripts/link-whatsapp.js
- run-send-one-groups.sh
- config/active-groups.json
- config/active-groups.example.json
- .env.example

## Schedule example

Monday to Saturday at 06:00, 12:00, and 18:00 Harare time.

Server UTC cron:

0 4,10,16 * * 1-6 /path/to/bot/run-send-one-groups.sh >> /path/to/bot/logs/group-post-schedule.log 2>&1
