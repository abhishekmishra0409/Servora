FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package.json
COPY tsconfig.base.json tsconfig.base.json
COPY eslint.config.mjs eslint.config.mjs
COPY packages packages
COPY apps/realtime apps/realtime

RUN npm install
RUN npm run build -w packages/shared && npm run build -w apps/realtime

CMD ["node", "apps/realtime/dist/main.js"]

