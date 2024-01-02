# syntax = docker/dockerfile:1.2
FROM node:20.10-alpine3.19

EXPOSE 4000

WORKDIR /usr/src/kiwey-chat-backend

COPY . .

RUN --mount=type=secret,id=_env,dst=./.env
RUN printenv

RUN npm install
RUN npx prisma generate --schema ./src/prisma/schema.prisma

ENTRYPOINT ["npm", "run", "dev"]