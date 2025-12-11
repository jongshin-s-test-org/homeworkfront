FROM node:24-slim

WORKDIR /app

COPY package*.json ./

# lightningcss musl 버전 명시적 설치
RUN npm ci 

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]