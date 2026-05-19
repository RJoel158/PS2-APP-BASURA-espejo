GreenBit Recycling Platform


Technical Doc: Doc\MANUAL_TECNICO_GREEN_BIT.pdf
Functionality demonstrative video: https://univalleedu-my.sharepoint.com/:v:/g/personal/smm0034570_est_univalle_edu/IQAFXHTQ4CygSIBwKrIc_Xy9AacoFklxFgKqu_3zDVOTyqE?e=AnhPEl

Overview
The GreenBit Recycling Platform is a full-stack application built with a Node.js/Express backend and a React/Vite frontend. This repository is prepared for production deployment using Docker Compose.

Repository Layout
- back/: Backend API and services
- front/: Frontend web application
- DB/: Database seed SQL
- docker-compose.prod.yml: Production compose file

Production Requirements
- Docker Engine
- Docker Compose

Production Deploy
1) Set production environment files
- back/.env.prod
- front/.env.prod

2) Update secrets in back/.env.prod
- DB_PASSWORD
- JWT_SECRET
- JWT_REFRESH_SECRET
- Optional: GMAIL_USER, GMAIL_APP_PASSWORD

3) Build and run

   docker compose -f docker-compose.prod.yml up --build -d

4) Verify services

   docker compose -f docker-compose.prod.yml ps

Ports
- Frontend: http://localhost (port 80)
- Backend: internal container port 3000
- MySQL: port 3306 (host mapped)

Environment Configuration
Backend (back/.env.prod)
- NODE_ENV=production
- LOG_LEVEL=silent
- ENABLE_REQUEST_LOGS=false
- DB_* and JWT_* values must be set for production

Frontend (front/.env.prod)
- VITE_NODE_ENV=production
- VITE_LOG_LEVEL=silent
- VITE_ENABLE_DEBUG_LOGS=false
- VITE_SHOW_DEBUG_INFO=false

Database Seed
The production stack loads DB/mysql-greenbit_alwaysdata_net.sql on first run. If you need to reinitialize the database, remove the volume:

   docker compose -f docker-compose.prod.yml down -v
   docker compose -f docker-compose.prod.yml up --build -d

Notes
- Logs are silenced in production via environment flags.
- Use a secure secret for JWT values.
- If you run behind a reverse proxy, confirm FRONTEND_URL and TRUST_PROXY settings.

Local Development (Optional)
For development, use the standard docker-compose.yml and the dev .env files. Enable logs by setting:
- back/.env: LOG_LEVEL=info, ENABLE_REQUEST_LOGS=true
- front/.env: VITE_LOG_LEVEL=info, VITE_ENABLE_DEBUG_LOGS=true

License
MIT. See LICENSE for details.
