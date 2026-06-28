#!/bin/bash
set -e

cd /opt/visionco-wa-test

echo "===== VISIONCO GROUP POST STARTED ====="
date
TZ=Africa/Harare date

node scripts/send-one-image-active-groups.js

echo "===== VISIONCO GROUP POST FINISHED ====="
date
TZ=Africa/Harare date
