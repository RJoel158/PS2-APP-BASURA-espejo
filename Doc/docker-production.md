# Docker Produccion GreenBit

Este setup levanta la plataforma completa en contenedores:

- `db`: MySQL 8 con inicializacion automatica desde `DB/mysql-greenbit_alwaysdata_net.sql`
- `backend`: API Node/Express en `:3000` dentro de la red Docker
- `frontend`: Nginx sirviendo React en `:80`, con proxy hacia backend para `/api`, `/health` y `/socket.io`

Nota de empaquetado final:

- La imagen de backend excluye contenido de pruebas y benchmark (`Scripts/`, reportes y archivos de test) para un artefacto de produccion mas limpio.
- La imagen de frontend excluye artefactos de coverage y logs locales.

## 1) Preparar variables

Desde la raiz del repo:

```bash
cp .env.docker.example .env
```

Ajusta al menos:

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_URL` (en local suele ser `http://localhost`)

## 2) Build y arranque

```bash
docker-compose up -d --build
```

## 3) Validaciones basicas de produccion

```bash
# Estado de servicios
docker-compose ps

# Health del frontend (nginx)
curl -fsS http://localhost/healthz

# Health publico del backend via proxy frontend
curl -fsS http://localhost/health

# Readiness backend (incluye estado DB) via proxy frontend
curl -fsS http://localhost/health/ready

# Endpoint API real via frontend proxy
curl -fsS http://localhost/api/material
```

## 4) Logs operativos

```bash
docker-compose logs -f db
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 5) Parada y limpieza

```bash
docker-compose down
```

Para borrar tambien la data persistida en volumen MySQL:

```bash
docker-compose down -v
```
