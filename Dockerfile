FROM node:18
WORKDIR /app

# Install Boost Filesystem library
RUN apt-get update && apt-get install -y libboost-filesystem-dev

# Copy DopeBrix scripts and Fairbrix node binary
COPY DopeBrix/ ./DopeBrix/
COPY fbrix-node/fairbrixd ./fbrix-node/fairbrixd
COPY fbrix-node/fbx.conf ./fbrix-node/fbx.conf

# Ensure fairbrixd is executable
RUN chmod +x ./fbrix-node/fairbrixd

# Copy and set up start-all.sh
WORKDIR /app/DopeBrix
RUN npm install --omit=dev || true
RUN chmod +x start-all.sh

# Start the node and related scripts
CMD ["./start-all.sh"]
