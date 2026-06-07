#!/bin/sh
cp /default-flows.json /data/flows.json
echo "Seeded /data/flows.json from default"
exec /usr/src/node-red/entrypoint.sh "$@"
