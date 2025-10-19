#!/bin/bash
set -e

# Start Fairbrix node in the background
./fbrix-node/fbrix -conf=./fbrix-node/fbx.conf &

# Wait a few seconds for node to start
sleep 5

# Start DopeBrix proxy server
node server/index.js
