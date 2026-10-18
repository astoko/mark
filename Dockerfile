FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public
ENV PORT=3000 HOST=0.0.0.0 DATA_DIR=/app/data
EXPOSE 3000
RUN mkdir -p /app/data && chown node:node /app/data
USER node
CMD ["node", "server.js"]
