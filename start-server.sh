#!/bin/bash
export DATABASE_URL="file:/home/z/my-project/prisma/dev.db"
cd /home/z/my-project

# Kill old processes
pkill -f "next start" 2>/dev/null
sleep 1

# Start fresh
nohup npx next start -p 3000 > /tmp/upharma-server.log 2>&1 &
echo "Started at $(date)" >> /tmp/upharma-server.log
