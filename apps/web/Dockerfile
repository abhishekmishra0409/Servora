FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package.json
COPY tsconfig.base.json tsconfig.base.json
COPY eslint.config.mjs eslint.config.mjs
COPY packages packages
COPY apps/api apps/api
COPY apps/web apps/web

RUN npm install
RUN npm run build -w packages/shared && npm run build -w apps/web

CMD ["npm", "run", "start", "-w", "apps/web"]
