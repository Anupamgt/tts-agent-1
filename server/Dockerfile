FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production
ENV TRACE_DIR=/app/data/traces
ENV BIND_HOST=0.0.0.0
EXPOSE 8000
CMD ["node", "src/index.js", "api"]
