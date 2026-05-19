# NERO CLUB FITNESS — Guía de Puesta en Marcha

## Requisitos
- Node.js 18 o superior → https://nodejs.org
- Cuenta en Supabase → https://supabase.com (gratis)

---

## 1. Instalar dependencias

```bash
npm install
```

---

## 2. Configurar Supabase

### 2a. Crear la base de datos
1. Ve a **app.supabase.com** → tu proyecto → **SQL Editor**
2. Pega el contenido de `supabase_schema.sql` y ejecuta

### 2b. Crear las variables de entorno
```bash
cp .env.example .env
```
Edita `.env` con tus valores (los encuentras en **Settings → API**):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 2c. Crear el usuario Admin
1. Ve a **Authentication → Users → Add user**
2. Ingresa el email y contraseña del admin
3. Ejecuta en SQL Editor:
```sql
UPDATE profiles SET role = 'admin', name = 'Tu Nombre'
WHERE email = 'tu@email.cl';
```

---

## 3. Levantar en desarrollo

```bash
npm run dev
```
Abre **http://localhost:5173** en tu navegador.

---

## 4. Conectar Supabase al código

En `src/App.jsx`, busca las líneas marcadas con `// 🔌 SUPABASE:` — son los puntos donde reemplazas los datos ficticios por llamadas reales usando las funciones de `src/lib/supabase.js`.

Por ejemplo, el login:
```js
// Antes (mock):
const ok = onLogin(email, password)

// Después (Supabase):
import { signIn, getProfile } from './lib/supabase'
const { data, error } = await signIn(email, password)
const profile = await getProfile()
```

---

## 5. Build para producción

```bash
npm run build
```
La carpeta `dist/` está lista para subir a **Vercel**, **Netlify** o cualquier hosting estático.

---

## Credenciales de demo (modo sin Supabase)

| Rol      | Email                  | Contraseña  |
|----------|------------------------|-------------|
| Admin    | admin@neroclub.cl      | admin123    |
| Vendedor | diego@neroclub.cl      | vendor123   |
| Vendedor | vale@neroclub.cl       | vendor456   |

---

## Estructura del proyecto

```
nero-club/
├── public/
│   └── favicon.svg          ← Ícono N de Nero Club
├── src/
│   ├── lib/
│   │   └── supabase.js      ← Cliente y helpers de Supabase
│   ├── App.jsx              ← Aplicación completa (Landing + Admin + Vendedor)
│   ├── index.css            ← Estilos globales + Tailwind
│   └── main.jsx             ← Entry point
├── supabase_schema.sql      ← Schema completo con RLS
├── .env.example             ← Plantilla de variables de entorno
├── index.html               ← HTML con fuentes Bebas Neue + Barlow Condensed
├── tailwind.config.js
├── vite.config.js
└── package.json
```
