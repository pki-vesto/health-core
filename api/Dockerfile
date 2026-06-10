# Health Core API — mirrors the proven shred-api image so it reuses the exact
# better-sqlite3 native build approach (alpine + transient build deps).
FROM node:22-alpine

RUN apk add --no-cache python3 make g++ \
 && mkdir -p /app /core \
 && chown -R node:node /app /core

WORKDIR /app
COPY --chown=node:node package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
 && apk del python3 make g++ \
 && rm -rf /root/.npm /tmp/* /var/cache/apk/*

COPY --chown=node:node . .

USER node
ENV NODE_ENV=production
ENV PORT=8090
ENV CORE_DB=/core/core.db
EXPOSE 8090

CMD ["node", "server.js"]
