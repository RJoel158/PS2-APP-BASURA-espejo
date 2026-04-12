FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads uploads/temp uploads/images uploads/announcements

EXPOSE 3000

CMD ["npm", "start"]
