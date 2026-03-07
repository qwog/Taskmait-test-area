FROM node:20-alpine

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
