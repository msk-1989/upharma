#!/bin/bash
cd /home/z/my-project/.next/standalone
while true; do
  NODE_OPTIONS='--max-old-space-size=512' node server.js -p 3000 2>/tmp/next-server.log
  sleep 0.5
done
