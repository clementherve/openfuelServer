FROM node:17.5.0-alpine
WORKDIR /app
COPY ./ /app
RUN npm i
EXPOSE 8080
CMD ["npm", "start"]