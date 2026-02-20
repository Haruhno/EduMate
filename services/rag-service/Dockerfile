FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install --production

COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 3005

CMD ["npm", "start"]
