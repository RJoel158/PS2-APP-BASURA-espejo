USE `reciclaje_proyecto2db`;
CREATE TABLE IF NOT EXISTS `role` (
  `id` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` ENUM('admin', 'recolector', 'reciclador', 'guest') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB
  AUTO_INCREMENT=5
  DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `roleId` TINYINT UNSIGNED NULL DEFAULT NULL,
  `state` TINYINT NOT NULL DEFAULT '1',
  `registerDate` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `phone` VARCHAR(20) NULL DEFAULT NULL,
  `usersId` INT UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_role` (`roleId`),
  KEY `idx_users_users1` (`usersId`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`roleId`)
    REFERENCES `role` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_users1` FOREIGN KEY (`usersId`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `advertisement` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `path` VARCHAR(255) DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `status` TINYINT DEFAULT '1',
  `userId` INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_advertisement_users` (`userId`),
  CONSTRAINT `fk_advertisement_users` FOREIGN KEY (`userId`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `request` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idUser` INT UNSIGNED DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `state` TINYINT DEFAULT '1' COMMENT '1 = open, 2 = accepted, 3 = confirmed, 4 = closed, 5 = cancelled',
  `registerDate` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `materialId` INT UNSIGNED DEFAULT NULL,
  `latitude` DECIMAL(10,6) DEFAULT NULL,
  `longitude` DECIMAL(10,6) DEFAULT NULL,
  `modificationDate` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_request_user` (`idUser`),
  KEY `idx_request_material` (`materialId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS `appointmentconfirmation` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idRequest` INT UNSIGNED DEFAULT NULL,
  `acceptedDate` DATE DEFAULT NULL,
  `state` TINYINT DEFAULT '1' COMMENT '0 = pendiente, 1 = aceptado, 2 = cancelado, 3 = terminado',
  `collectorId` INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_appoint_request` (`idRequest`),
  KEY `idx_appoint_collector` (`collectorId`),
  CONSTRAINT `fk_appoint_collector` FOREIGN KEY (`collectorId`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_appoint_request` FOREIGN KEY (`idRequest`)
    REFERENCES `request` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS `image` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idRequest` INT UNSIGNED DEFAULT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `uploadedDate` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `state` TINYINT NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_image_request` (`idRequest`),
  CONSTRAINT `fk_image_request` FOREIGN KEY (`idRequest`)
    REFERENCES `request` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `institution` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyName` VARCHAR(255) DEFAULT NULL,
  `nit` VARCHAR(50) DEFAULT NULL,
  `userId` INT UNSIGNED NOT NULL,
  `state` TINYINT NOT NULL DEFAULT '1' COMMENT '0 = rechazado/inactivo, 1 = pendiente, 2 = activo',
  PRIMARY KEY (`id`),
  KEY `idx_institution_users` (`userId`),
  CONSTRAINT `fk_institution_users` FOREIGN KEY (`userId`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `material` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `createdDate` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `modifiedBy` INT UNSIGNED DEFAULT NULL,
  `modifiedDate` TIMESTAMP NULL DEFAULT NULL,
  `state` TINYINT NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_material_modifiedBy` (`modifiedBy`),
  CONSTRAINT `fk_material_modifiedBy` FOREIGN KEY (`modifiedBy`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `person` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `firstname` VARCHAR(100) DEFAULT NULL,
  `lastname` VARCHAR(100) DEFAULT NULL,
  `userId` INT UNSIGNED NOT NULL,
  `state` TINYINT NOT NULL DEFAULT '1' COMMENT '0 = rechazado/inactivo, 1 = pendiente, 2 = activo',
  PRIMARY KEY (`id`),
  KEY `idx_person_users` (`userId`),
  CONSTRAINT `fk_person_users` FOREIGN KEY (`userId`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `schedule` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `startHour` TIME DEFAULT NULL,
  `endHour` TIME DEFAULT NULL,
  `monday` TINYINT DEFAULT '0',
  `tuesday` TINYINT DEFAULT '0',
  `wednesday` TINYINT DEFAULT '0',
  `thursday` TINYINT DEFAULT '0',
  `friday` TINYINT DEFAULT '0',
  `saturday` TINYINT DEFAULT '0',
  `sunday` TINYINT DEFAULT '0',
  `requestId` INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_schedule_request` (`requestId`),
  CONSTRAINT `fk_schedule_request` FOREIGN KEY (`requestId`)
    REFERENCES `request` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `score` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `appointmentConfirmationId` INT UNSIGNED DEFAULT NULL,
  `score` TINYINT UNSIGNED DEFAULT NULL,
  `createdDate` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `comment` VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_score_appointment` (`appointmentConfirmationId`),
  CONSTRAINT `fk_score_appointment` FOREIGN KEY (`appointmentConfirmationId`)
    REFERENCES `appointmentconfirmation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla: announcement (Anuncios creados solo por administrador)
CREATE TABLE IF NOT EXISTS `announcement` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(150) NOT NULL,
  `imagePath` VARCHAR(255) NOT NULL,
  `targetRole` ENUM('recolector', 'reciclador', 'both') NOT NULL DEFAULT 'both',
  `state` TINYINT NOT NULL DEFAULT '1',
  `createdDate` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_announcement_state` (`state`),
  KEY `idx_announcement_role` (`targetRole`),
  CONSTRAINT `fk_announcement_admin` FOREIGN KEY (`createdBy`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
