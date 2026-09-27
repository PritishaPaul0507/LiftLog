FROM node:24-alpine

WORKDIR /app

COPY FE/package*.json ./

RUN npm ci

COPY FE/ .

EXPOSE 4200

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200"]