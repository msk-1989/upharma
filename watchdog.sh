#!/bin/bash
cd /home/z/my-project/.next/standalone
while true; do
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Server down, restarting..." >> /tmp/watchdog.log
    node server.js -p 3000 >> /tmp/nextprod.log 2>&1 &
    echo "[$(date)] Restarted PID: $!" >> /tmp/watchdog.log
  fi
  sleep 3
done