FROM node:22-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY src ./src
COPY sql ./sql

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/server.js"]