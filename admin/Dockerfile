FROM node:lts-alpine

WORKDIR /tt-admin

# install app dependencies
COPY ./package*.json ./

RUN npm install

CMD [ "npm", "run", "dev" ]
