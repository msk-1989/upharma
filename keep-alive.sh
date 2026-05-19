#!/bin/bash
cd /home/z/my-project
while true; do
  cp -r .next/static .next/standalone/.next/static 2>/dev/null
  node .next/standalone/server.js -p 3000 -H 0.0.0.0 2>/dev/null
  echo "Server died, restarting in 2s..."
  sleep 2
done
