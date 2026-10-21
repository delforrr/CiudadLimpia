FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global npm@11.17.0 --ignore-scripts --no-audit --no-fund
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
