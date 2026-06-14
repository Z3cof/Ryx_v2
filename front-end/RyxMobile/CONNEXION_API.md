# Connexion au back-end avec Expo Go

Avec **Expo Go** (`npx expo start`), l’app ne peut souvent pas joindre `127.0.0.1`. Il faut utiliser l’**IP de ton Mac** dans un fichier `.env`.

## Étapes

1. **Trouve l’IP de ton Mac**  
   Dans le Terminal : `ifconfig | grep "inet "`  
   Note l’adresse en **192.168.x.x** (pas 127.0.0.1).

2. **Crée le fichier `.env`**  
   À la racine de ce projet (`RyxMobile/`), copie `.env.example` en `.env` :
   ```bash
   cp .env.example .env
   ```
   Ouvre `.env` et remplace `192.168.1.1` par ton IP, par exemple :
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.19:3000
   ```

3. **Lance le back-end** (dans un autre terminal)  
   ```bash
   cd ../../back-end
   npm start
   ```
   Tu dois voir : `Serveur lancé sur http://0.0.0.0:3000`.

4. **Redémarre Metro avec cache vide**  
   ```bash
   npx expo start -c
   ```
   Ouvre l’app dans Expo Go (simulateur ou téléphone sur le même Wi‑Fi).

L’inscription et la connexion devraient alors fonctionner.
