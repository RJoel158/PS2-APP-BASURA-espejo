-- ============================================================
-- GreenBit Recycling Platform - Datos de Prueba
-- ============================================================
-- Contraseña para TODOS los usuarios de prueba: Test1234
-- Hash bcrypt: $2b$10$RF1BPPw8HjQIjJ7m9BE/fuB.MaeJ9lRVFGaVxjcrRKUUD1Kyf6oba
-- ============================================================

-- Limpiar datos existentes (orden inverso por FK)
DELETE FROM score;
DELETE FROM image;
DELETE FROM schedule;
DELETE FROM appointmentconfirmation;
DELETE FROM announcement;
DELETE FROM request;
DELETE FROM material;
DELETE FROM person;
DELETE FROM institution;
DELETE FROM advertisement;
DELETE FROM users;
DELETE FROM role;

-- ============================================================
-- 1. ROLES (4 roles del sistema)
-- ============================================================
INSERT INTO role (id, name) VALUES
  (1, 'admin'),
  (2, 'recolector'),
  (3, 'reciclador'),
  (4, 'guest');

-- ============================================================
-- 2. USUARIOS (7 usuarios de prueba)
-- ============================================================
-- state: 0=eliminado, 1=activo(password temporal), 2=activo(password cambiado), 3=pendiente aprobación
INSERT INTO users (id, username, password, roleId, state, registerDate, email, phone) VALUES
  (1,  'admin_principal',  '$2b$10$RF1BPPw8HjQIjJ7m9BE/fuB.MaeJ9lRVFGaVxjcrRKUUD1Kyf6oba', 1, 2, '2025-01-15 10:00:00', 'admin@greenbit.com', '+59171000001'),
  (2,  'recolector_juan',  '$2b$10$RF1BPPw8HjQIjJ7m9BE/fuB.MaeJ9lRVFGaVxjcrRKUUD1Kyf6oba', 2, 2, '2025-02-01 09:00:00', 'juan.recolector@gmail.com', '+59172000001'),
  (3,  'recolector_maria', '$2b$10$RF1BPPw8HjQIjJ7m9BE/fuB.MaeJ9lRVFGaVxjcrRKUUD1Kyf6oba', 2, 2, '2025-02-10 11:00:00', 'maria.recolector@gmail.com', '+59172000002'),
  (4,  'reciclador_carlos','$2b$10$RF1BPPw8HjQIjJ7m9BE/fuB.MaeJ9lRVFGaVxjcrRKUUD1Kyf6oba', 3, 2, '2025-03-01 08:30:00', 'carlos.reciclador@gmail.com', '+59173000001'),
  (5,  'reciclador_ana',   '$2b$10$RF1BPPw8HjQIjJ7m9BE/fuB.MaeJ9lRVFGaVxjcrRKUUD1Kyf6oba', 3, 2, '2025-03-05 14:00:00', 'ana.reciclador@gmail.com', '+59173000002'),
  (6,  'reciclador_luis',  '$2b$10$RF1BPPw8HjQIjJ7m9BE/fuB.MaeJ9lRVFGaVxjcrRKUUD1Kyf6oba', 3, 2, '2025-03-10 16:00:00', 'luis.reciclador@gmail.com', '+59173000003'),
  (7,  'empresa_ecogreen', '$2b$10$RF1BPPw8HjQIjJ7m9BE/fuB.MaeJ9lRVFGaVxjcrRKUUD1Kyf6oba', 2, 2, '2025-02-20 10:00:00', 'contacto@ecogreen.com', '+59174000001');

-- ============================================================
-- 3. PERSONAS (vinculadas a usuarios tipo persona)
-- ============================================================
INSERT INTO person (id, firstname, lastname, userId, state) VALUES
  (1, 'Administrador', 'Principal',    1, 2),
  (2, 'Juan',          'Pérez López',  2, 2),
  (3, 'María',         'García Ríos',  3, 2),
  (4, 'Carlos',        'Mamani Quispe',4, 2),
  (5, 'Ana',           'Flores Vargas',5, 2),
  (6, 'Luis',          'Rojas Mendoza',6, 2);

-- ============================================================
-- 4. INSTITUCIÓN (vinculada al usuario empresa)
-- ============================================================
INSERT INTO institution (id, companyName, nit, userId, state) VALUES
  (1, 'EcoGreen Bolivia S.R.L.', '1234567890', 7, 2);

-- ============================================================
-- 5. MATERIALES (6 tipos de materiales reciclables)
-- ============================================================
INSERT INTO material (id, name, description, createdDate, modifiedBy, state) VALUES
  (1, 'Plástico',    'Botellas PET, envases plásticos, bolsas',                  '2025-01-20 10:00:00', 1, 1),
  (2, 'Vidrio',      'Botellas de vidrio, frascos, vidrio plano',                '2025-01-20 10:05:00', 1, 1),
  (3, 'Papel',       'Papel blanco, periódico, cartón, revistas',                '2025-01-20 10:10:00', 1, 1),
  (4, 'Metal',       'Latas de aluminio, chatarra, envases metálicos',           '2025-01-20 10:15:00', 1, 1),
  (5, 'Orgánico',    'Restos de comida, cáscaras, residuos de jardín',           '2025-01-20 10:20:00', 1, 1),
  (6, 'Electrónico', 'Celulares, computadoras, baterías, cables electrónicos',   '2025-01-20 10:25:00', 1, 1);

-- ============================================================
-- 6. SOLICITUDES DE RECICLAJE (5 requests en distintos estados)
-- ============================================================
-- state: 1=open, 2=accepted, 3=confirmed, 4=closed, 5=cancelled
-- Coordenadas en zona de Cochabamba, Bolivia
INSERT INTO request (id, idUser, description, state, registerDate, materialId, latitude, longitude) VALUES
  (1, 4, 'Tengo 3 bolsas grandes de botellas PET para reciclar',           1, '2025-04-01 09:00:00', 1, -17.393800, -66.157000),
  (2, 5, 'Papel de oficina y cartones de mudanza, aproximadamente 20kg',   1, '2025-04-02 10:30:00', 3, -17.396500, -66.160200),
  (3, 4, 'Latas de aluminio de refrescos, 2 bolsas medianas',             2, '2025-03-20 14:00:00', 4, -17.389200, -66.153800),
  (4, 6, 'Botellas de vidrio de restaurante, cajas completas',            4, '2025-03-10 08:00:00', 2, -17.401000, -66.165500),
  (5, 5, 'Residuos electrónicos: 2 celulares viejos y cables',            5, '2025-03-15 11:00:00', 6, -17.385000, -66.148000);

-- ============================================================
-- 7. HORARIOS (schedule para cada solicitud)
-- ============================================================
INSERT INTO schedule (id, startHour, endHour, monday, tuesday, wednesday, thursday, friday, saturday, sunday, requestId) VALUES
  (1, '08:00:00', '12:00:00', 1, 1, 1, 1, 1, 0, 0, 1),
  (2, '14:00:00', '18:00:00', 1, 0, 1, 0, 1, 1, 0, 2),
  (3, '09:00:00', '11:00:00', 0, 1, 0, 1, 0, 1, 0, 3),
  (4, '07:00:00', '10:00:00', 1, 1, 1, 1, 1, 1, 0, 4),
  (5, '10:00:00', '15:00:00', 0, 0, 1, 0, 0, 1, 1, 5);

-- ============================================================
-- 8. IMÁGENES (fotos asociadas a solicitudes)
-- ============================================================
INSERT INTO image (id, idRequest, image, uploadedDate, state) VALUES
  (1, 1, '/uploads/images/sample-plastico-1.jpg', '2025-04-01 09:01:00', 1),
  (2, 1, '/uploads/images/sample-plastico-2.jpg', '2025-04-01 09:01:30', 1),
  (3, 2, '/uploads/images/sample-papel-1.jpg',    '2025-04-02 10:31:00', 1),
  (4, 3, '/uploads/images/sample-metal-1.jpg',    '2025-03-20 14:01:00', 1),
  (5, 4, '/uploads/images/sample-vidrio-1.jpg',   '2025-03-10 08:01:00', 1),
  (6, 4, '/uploads/images/sample-vidrio-2.jpg',   '2025-03-10 08:01:30', 1);

-- ============================================================
-- 9. CITAS DE RECOLECCIÓN (appointments en distintos estados)
-- ============================================================
-- state: 0=pendiente, 1=aceptado, 2=cancelado, 3=terminado
INSERT INTO appointmentconfirmation (id, idRequest, acceptedDate, state, collectorId) VALUES
  (1, 3, '2025-03-22', 1, 2),   -- Request 3 aceptada por Juan (recolector)
  (2, 4, '2025-03-12', 3, 3),   -- Request 4 completada por María (recolectora)
  (3, 5, '2025-03-17', 2, 2);   -- Request 5 cancelada

-- ============================================================
-- 10. CALIFICACIONES (scores de citas completadas)
-- ============================================================
INSERT INTO score (id, appointmentConfirmationId, score, createdDate, comment) VALUES
  (1, 2, 5, '2025-03-12 16:00:00', 'Excelente servicio, muy puntual y amable'),
  (2, 2, 4, '2025-03-12 16:30:00', 'Buen reciclador, material bien separado');

-- ============================================================
-- 11. ANUNCIOS (creados por el admin)
-- ============================================================
INSERT INTO announcement (id, title, imagePath, targetRole, state, createdDate, createdBy) VALUES
  (1, 'Campaña de Reciclaje 2025',           '/uploads/announcements/campana-2025.jpg',    'both',        1, '2025-03-01 09:00:00', 1),
  (2, 'Nuevos puntos de recolección',         '/uploads/announcements/nuevos-puntos.jpg',   'recolector',  1, '2025-03-15 10:00:00', 1),
  (3, 'Tips para separar residuos en casa',   '/uploads/announcements/tips-separar.jpg',    'reciclador',  1, '2025-04-01 08:00:00', 1);

-- ============================================================
-- Resumen de datos insertados:
--   4 roles, 7 usuarios, 6 personas, 1 institución,
--   6 materiales, 5 solicitudes, 5 horarios, 6 imágenes,
--   3 citas, 2 calificaciones, 3 anuncios
--
-- Credenciales de prueba (misma contraseña para todos):
--   admin@greenbit.com / Test1234 (admin)
--   juan.recolector@gmail.com / Test1234 (recolector)
--   maria.recolector@gmail.com / Test1234 (recolector)
--   carlos.reciclador@gmail.com / Test1234 (reciclador)
--   ana.reciclador@gmail.com / Test1234 (reciclador)
--   luis.reciclador@gmail.com / Test1234 (reciclador)
--   contacto@ecogreen.com / Test1234 (recolector/empresa)
-- ============================================================
