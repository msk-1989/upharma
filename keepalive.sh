#!/bin/bash
cd /home/z/my-project
while true; do
  node .next/standalone/server.js -p 3000 2>/dev/null
  sleep 0.5
done
