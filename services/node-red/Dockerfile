FROM nodered/node-red:latest

RUN npm install @oriolrius/node-red-contrib-kafka node-red-contrib-postgresql

USER root
RUN apk add --no-cache ca-certificates && \
    K6_ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
    wget -qO /tmp/k6.tar.gz "https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-linux-${K6_ARCH}.tar.gz" && \
    tar xzf /tmp/k6.tar.gz -C /usr/local/bin --strip-components=1 && \
    rm /tmp/k6.tar.gz && k6 version

RUN echo "https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
    apk add --no-cache hurl && hurl --version
USER node-red

COPY services/node-red/node-red-flows.json /default-flows.json
COPY services/node-red/entrypoint.sh /custom-entrypoint.sh
USER root
RUN chmod +x /custom-entrypoint.sh && chown node-red:node-red /custom-entrypoint.sh
USER node-red
ENTRYPOINT ["/custom-entrypoint.sh"]
