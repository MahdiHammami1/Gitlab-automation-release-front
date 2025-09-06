# ====== Étape 1 : Build Angular ======
FROM node:20-alpine AS build
WORKDIR /app

# Installer dépendances
COPY package*.json ./
RUN npm ci

# Copier le reste du code
COPY . .

# Build Angular (prod)
RUN npm run build -- --configuration=production

# ====== Étape 2 : Serveur NGINX ======
FROM nginx:1.27-alpine

# Supprimer config par défaut
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copier config custom
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier build Angular
COPY --from=build /app/dist/ /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
