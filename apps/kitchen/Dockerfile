FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package.json
COPY tsconfig.base.json tsconfig.base.json
COPY eslint.config.mjs eslint.config.mjs
COPY packages packages
COPY apps/kitchen apps/kitchen

RUN npm install
RUN npm run build -w packages/shared && npm run build -w apps/kitchen

CMD ["npm", "run", "preview", "-w", "apps/kitchen", "--", "--host", "0.0.0.0", "--port", "4174"]
