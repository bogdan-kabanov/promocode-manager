# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
# bcrypt has no musl prebuild, so it is compiled from source.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=UTC
RUN apk add --no-cache python3 make g++ tzdata wget
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=12 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
