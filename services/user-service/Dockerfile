FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx tsc -p tsconfig.json

ENV NODE_ENV=production

EXPOSE 3100

CMD ["node", "dist/server.js"]
