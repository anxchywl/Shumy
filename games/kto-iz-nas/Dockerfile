FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js questions.js drawing.js qr.js ./
COPY public/ ./public/
USER node
EXPOSE 5181
CMD ["node", "server.js"]
