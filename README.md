# backend-hsm-pkcs11

API Node.js/TypeScript utilisant SoftHSM (PKCS#11) pour gérer des clés EC P-256 et signer via ECDSA.

## Statut
En construction – services PKCS#11 et routes à compléter.

## Installation rapide
```bash
# Dépendances système (exemples)
# macOS (brew)
brew install softhsm
# Debian/Ubuntu
# sudo apt-get install softhsm2

cp .env.example .env
# Editer PKCS11_MODULE_PATH selon votre système (exemples ci-dessous)

npm install
npm run softhsm:init
npm run dev
```

### Chemins typiques du module libsofthsm
macOS (Homebrew):
```bash
export PKCS11_MODULE_PATH="$(brew --prefix softhsm)/lib/softhsm/libsofthsm2.so"
```
Linux (Debian/Ubuntu):
```bash
export PKCS11_MODULE_PATH=/usr/lib/softhsm/libsofthsm2.so
```
Vérifier l'existence:
```bash
test -f "$PKCS11_MODULE_PATH" || echo "Chemin incorrect"
```

Vous pouvez lancer:
```bash
npm run env:check
```
pour valider les variables.

## Endpoints prévus
- POST /api/v1/keys
- GET /api/v1/keys
- GET /api/v1/keys/:id
- DELETE /api/v1/keys/:id
- POST /api/v1/sign

## Sécurité
- PIN jamais loggé
- Rate limit, helmet, cors

## Tests
```bash
npm test
```

## Licence
MIT
