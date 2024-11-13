FROM node:19-alpine AS build

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run-script build

FROM nginx:1.25.3

COPY --from=build /app/index.html /usr/share/nginx/html/index.html
COPY --from=build /app/styles /usr/share/nginx/html/styles
COPY --from=build /app/node_modules/reveal.js /usr/share/nginx/html/node_modules/reveal.js
