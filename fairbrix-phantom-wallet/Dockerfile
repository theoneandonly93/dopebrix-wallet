FROM node:18
WORKDIR /app
COPY DopeBrix/ ./DopeBrix/
WORKDIR /app/DopeBrix
RUN npm install --production || true
RUN chmod +x start-all.sh
CMD ["./start-all.sh"]
