FROM node:20-alpine
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps || (echo "continuing without lockfile" && npm install --legacy-peer-deps)
COPY frontend /app
RUN npm run build \
  && mkdir -p .next/standalone/.next \
  && cp -r .next/static .next/standalone/.next/static \
  && if [ -d "public" ]; then cp -r public .next/standalone/public; fi
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
