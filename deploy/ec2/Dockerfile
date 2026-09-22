FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN node deploy/ec2/build.mjs
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/data/study.sqlite TRUST_PROXY=1
RUN mkdir /data && chown node:node /data
COPY --from=build --chown=node:node /app/dist-ec2/ ./
USER node
VOLUME /data
EXPOSE 3000
CMD ["node","server.mjs"]
