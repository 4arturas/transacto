#!/bin/sh
cp /default-flows.json /data/flows.json
echo "Seeded /data/flows.json from default"
/usr/src/node-red/entrypoint.sh "$@" &
NR_PID=$!
echo "Waiting for Node-RED to start..."
node /deploy-flows.js
echo "Flows deployed, Node-RED is ready"
wait $NR_PID
