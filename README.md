# FEPAKA — Gestión de Arbitraje

## Instalación local (Windows)

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/fepaka-arbitraje.git
cd fepaka-arbitraje
```

### 2. Configurar el backend
```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tu DATABASE_URL de Railway
npm run dev
```

### 3. Configurar el frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Edita .env.local con tu URL del backend
npm run dev
```
Abre http://localhost:5173

---

## Deploy en Railway (backend)

1. En Railway, conecta tu repositorio GitHub
2. Selecciona la carpeta `/backend` como Root Directory
3. Agrega las variables de entorno:
   - `DATABASE_URL` → se llena automáticamente desde el PostgreSQL de Railway
   - `JWT_SECRET` → una clave larga y segura
   - `FRONTEND_URL` → tu URL de Vercel
   - `NODE_ENV` → production

## Deploy en Vercel (frontend)

1. Importa el repositorio en Vercel
2. Selecciona la carpeta `/frontend` como Root Directory
3. Agrega la variable de entorno:
   - `VITE_API_URL` → tu URL del backend de Railway + `/api`

---

## Usuario por defecto
- **Usuario:** admin
- **Contraseña:** admin123
- ⚠️ Cámbiala inmediatamente después del primer login.
