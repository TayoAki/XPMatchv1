# syntax=docker/dockerfile:1
# Multi-stage build for Railway (or any Docker host). Produces Next.js standalone output.

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    COPILOTKIT_TELEMETRY_DISABLED=true

FROM base AS deps
# .npmrc carries legacy-peer-deps, which npm ci needs to accept the test tooling's peer ranges.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time. Railway passes service
# variables to the Docker build as build args, so declare the ones the client needs.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
ARG NEXT_PUBLIC_COPILOTKIT_INSPECTOR
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=$NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID \
    NEXT_PUBLIC_COPILOTKIT_INSPECTOR=$NEXT_PUBLIC_COPILOTKIT_INSPECTOR
RUN mkdir -p public && npm run build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Local PGlite fallback (only used when DATABASE_URL is not set) writes here.
RUN mkdir -p /app/.data && chown app:app /app/.data
USER app
EXPOSE 3000
CMD ["node", "server.js"]
