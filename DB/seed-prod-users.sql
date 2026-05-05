START TRANSACTION;

-- Seed de usuarios base para produccion
-- Passwords estan hasheados con bcrypt (coinciden con Tilin43* del dump vigente).

-- Admin
SET @admin_email = 'svr0035567@est.univalle.edu';
SET @admin_phone = '+59169443250';
INSERT INTO users (password, roleId, state, registerDate, email, phone)
SELECT '$2b$10$K5svNBLRD7Trl0FAe4NoQ.0Gh.cbAObMs6t/kBmw59ezOlaHNNMGe', 1, 2, NOW(), @admin_email, @admin_phone
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = @admin_email);
SET @admin_id := (SELECT id FROM users WHERE email = @admin_email LIMIT 1);
INSERT INTO person (firstname, lastname, userId, state)
SELECT 'Joel', 'Saavedra', @admin_id, 1
WHERE @admin_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM person WHERE userId = @admin_id);

-- Reciclador
SET @reciclador_email = 'ninja4321jsvj@gmail.com';
INSERT INTO users (password, roleId, state, registerDate, email, phone)
SELECT '$2b$10$rtbLtoVffSvj9K34PoTx..Xa7Nhku89fq7tTLgEsiNN2T5UbX9LdS', 3, 2, NOW(), @reciclador_email, NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = @reciclador_email);
SET @reciclador_id := (SELECT id FROM users WHERE email = @reciclador_email LIMIT 1);
INSERT INTO person (firstname, lastname, userId, state)
SELECT 'Mateo', 'Saavedra', @reciclador_id, 1
WHERE @reciclador_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM person WHERE userId = @reciclador_id);

-- Recolector
SET @recolector_email = 'ronaldjoelsaavedra@gmail.com';
INSERT INTO users (password, roleId, state, registerDate, email, phone)
SELECT '$2b$10$xLfZL4jqEnqtUzlqQk3LZuZYuoppM/j7OoevGabGwcyd1yNwb7mtq', 2, 2, NOW(), @recolector_email, NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = @recolector_email);
SET @recolector_id := (SELECT id FROM users WHERE email = @recolector_email LIMIT 1);
INSERT INTO person (firstname, lastname, userId, state)
SELECT 'Ronald', 'Saavedra', @recolector_id, 1
WHERE @recolector_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM person WHERE userId = @recolector_id);

COMMIT;
