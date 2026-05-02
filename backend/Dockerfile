# GitHub Intelligence Dashboard — backend (production)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

EXPOSE 5000

# Render/Railway inject PORT; default 5000 for local Docker
ENV PORT=5000

CMD ["node", "src/server.js"]
