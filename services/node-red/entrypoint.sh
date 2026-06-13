#!/bin/sh
cp /default-flows.json /data/flows.json
echo "Seeded /data/flows.json from default"
if [ ! -f /data/settings.js ]; then
    cp /default-settings.js /data/settings.js
    echo "Seeded /data/settings.js from default"
fi
/usr/src/node-red/entrypoint.sh "$@" &
NR_PID=$!
echo "Waiting for Node-RED to start..."
node /deploy-flows.js
echo "Flows deployed, Node-RED is ready"
wait $NR_PID
