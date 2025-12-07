# Dockerfile für React + TypeScript (CRA) mit Hot Reloading
FROM node:20-alpine

# Arbeitsverzeichnis im Container
WORKDIR /app

# package.json & package-lock.json kopieren und Abhängigkeiten installieren
COPY package.json package-lock.json* ./
RUN npm install

# gesamten Quellcode kopieren
COPY . .

# Port für React Dev Server
EXPOSE 3000

# Dev-Server starten, auf allen Interfaces lauschen für Hot Reloading
CMD ["npm", "start", "--", "--host", "0.0.0.0"]
