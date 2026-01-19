FROM node:22-alpine AS build

WORKDIR /app
COPY apps/client /app/apps/client
COPY apps/server /app/apps/server
COPY package*.json /app/

RUN npm ci

RUN npm run build --workspace=client
RUN npm run build --workspace=server

FROM node:22-alpine AS runtime

RUN apk add --no-cache ipmitool

WORKDIR /app

COPY --from=build /app/package*.json /app/
COPY --from=build /app/apps/server/dist /app/apps/server/dist
COPY --from=build /app/apps/server/package*.json /app/apps/server/
COPY --from=build /app/apps/client/dist /app/public

RUN npm ci --omit=dev --workspace=server

EXPOSE 3000

CMD ["node", "apps/server/dist/main.js"]