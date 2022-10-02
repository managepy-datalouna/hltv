FROM node:16

WORKDIR /app

COPY package.json /app
COPY yarn.lock /app

RUN yarn install 

EXPOSE 3000

CMD ["node", "./src/index.js"]