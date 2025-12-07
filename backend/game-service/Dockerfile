# Dockerfile für Node.js + TypeScript mit Hot Reloading
FROM node:18-alpine

# Arbeitsverzeichnis im Container
WORKDIR /app

# package.json & package-lock.json kopieren und Abhängigkeiten installieren
COPY package.json package-lock.json* ./
RUN npm install

# gesamten Quellcode kopieren
COPY . .

# Port für Game Service
EXPOSE 8001

# Dev-Server mit Hot Reloading starten
CMD ["npm", "run", "dev"]
