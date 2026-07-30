FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
ARG VITE_QUICKMEET_API_URL=http://localhost:8787
ENV VITE_QUICKMEET_API_URL=$VITE_QUICKMEET_API_URL
RUN npm run build -w @quickmeet/sdk \
    && npm run build -w @quickmeet/react \
    && npm run build -w @quickmeet/demo

FROM nginx:1.27-alpine
COPY apps/demo/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/demo/dist /usr/share/nginx/html
EXPOSE 80
