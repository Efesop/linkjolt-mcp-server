FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# LINKJOLT_API_KEY is optional: without it the server still lists every tool and
# the three planning tools work; the rest ask for a LinkJolt account.
ENTRYPOINT ["node", "dist/index.js"]
