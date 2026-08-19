FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3080
ENV PORT=3080

CMD ["node", "server.js"]
