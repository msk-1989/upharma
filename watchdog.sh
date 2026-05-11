#!/bin/bash
cd /home/z/my-project
while true; do
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Server down, restarting..." >> /tmp/watchdog.log
    pkill -f "next start" 2>/dev/null
    sleep 2
    npx next start -p 3000 > /tmp/nextprod.log 2>&1 &
    echo "[$(date)] Restarted PID: $!" >> /tmp/watchdog.log
  fi
  sleep 5
done