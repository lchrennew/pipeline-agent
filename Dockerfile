FROM node:14.5.0-alpine3.12
MAINTAINER lichun
COPY package.json ./
RUN npm i
COPY . .
CMD ["sh", "start.sh"]
