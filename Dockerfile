FROM node:22.17.1-alpine

ENV PNPM_HOME=/home/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN mkdir $PNPM_HOME
RUN npm i pnpm@10 --location=global

RUN apk add --update python3 make g++ gcompat && rm -rf /var/cache/apk/*

ARG ICC_COMMIT_HASH
ARG ICC_COMMIT_BRANCH
ARG ICC_BUILD_TIME

ENV VITE_API_BASE_URL=VITE_API_BASE_URL_VALUE
ENV VITE_SERVER_URL=VITE_SERVER_URL_VALUE
ENV VITE_TERMS_VERSION=VITE_TERMS_VERSION_VALUE
ENV VITE_SUPPORTED_LOGINS=VITE_SUPPORTED_LOGINS_VALUE
ENV APP_HOME=/home/app/node/

ENV VITE_ICC_COMMIT_HASH=${ICC_COMMIT_HASH}
ENV VITE_ICC_COMMIT_BRANCH=${ICC_COMMIT_BRANCH}
ENV VITE_ICC_BUILD_TIME=${ICC_BUILD_TIME}

# env vars needed for wattpm build
ENV PLT_ICC_LOGGER_LEVEL=info

WORKDIR $APP_HOME

COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml

COPY platformatic.json platformatic.json
COPY entrypoint.sh /entrypoint.sh
COPY services services
COPY clients clients
COPY lib lib

RUN pnpm i
RUN pnpm run build

EXPOSE 3042

ENTRYPOINT "/entrypoint.sh"
LABEL org.opencontainers.image.source=https://github.com/platformatic/intelligent-command-center
