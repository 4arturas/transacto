FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx tsc -p tsconfig.json

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "dist/index.js"]
