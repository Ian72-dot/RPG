FROM node:20-alpine
WORKDIR /app

# Dependencies first, so this layer caches between source changes.
COPY package.json ./
RUN npm install --omit=optional

# Then the source, then the client build.
COPY . .
RUN npm run build

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/server.js"]
