FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY public ./public

EXPOSE 4000
CMD ["npm", "run", "dev"]
