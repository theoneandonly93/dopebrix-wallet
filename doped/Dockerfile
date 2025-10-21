# Dopelganga Reward Server Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN cd doped && npm install express
EXPOSE 9500
CMD ["node", "doped/reward_server.js"]
