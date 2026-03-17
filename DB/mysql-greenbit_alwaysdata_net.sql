-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mysql-greenbit.alwaysdata.net
-- Generation Time: Mar 16, 2026 at 10:42 PM
-- Server version: 10.11.15-MariaDB
-- PHP Version: 8.4.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `greenbit_v2`
--
CREATE DATABASE IF NOT EXISTS `greenbit_v2` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `greenbit_v2`;

-- --------------------------------------------------------

--
-- Table structure for table `advertisement`
--

CREATE TABLE `advertisement` (
  `id` int(10) UNSIGNED NOT NULL,
  `path` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` tinyint(4) DEFAULT 1,
  `userId` int(10) UNSIGNED DEFAULT NULL,
  `title` varchar(45) DEFAULT 'ANUNCIO',
  `url` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

CREATE TABLE `announcement` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(150) NOT NULL,
  `imagePath` varchar(255) NOT NULL,
  `targetRole` enum('recolector','reciclador','both') NOT NULL DEFAULT 'both',
  `state` tinyint(4) NOT NULL DEFAULT 1,
  `createdDate` timestamp NULL DEFAULT current_timestamp(),
  `createdBy` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `appointmentconfirmation`
--

CREATE TABLE `appointmentconfirmation` (
  `id` int(10) UNSIGNED NOT NULL,
  `idRequest` int(10) UNSIGNED DEFAULT NULL,
  `acceptedDate` date DEFAULT NULL,
  `state` tinyint(4) DEFAULT 1 COMMENT '0 = pendiente, 1 = aceptado, 2 = cancelado, 3 = terminado',
  `collectorId` int(10) UNSIGNED DEFAULT NULL,
  `acceptedHour` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointmentconfirmation`
--

INSERT INTO `appointmentconfirmation` (`id`, `idRequest`, `acceptedDate`, `state`, `collectorId`, `acceptedHour`) VALUES
(214, 137, '2026-03-16', 5, 212, '21:41:00'),
(215, 138, '2026-03-16', 4, 212, '20:31:00');

--
-- Triggers `appointmentconfirmation`
--
DELIMITER $$
CREATE TRIGGER `trg_appointment_request_notify` AFTER INSERT ON `appointmentconfirmation` FOR EACH ROW BEGIN
  IF NEW.state = 0 THEN
    INSERT INTO notifications (userId, actorId, type, title, body, requestId, appointmentId, expireAt)
    SELECT 
      r.idUser,
      NEW.collectorId,
      'request_received',
      'Solicitud de recolección',
      CONCAT('El usuario ', u.email, ' ha solicitado recoger ', 
             COALESCE(m.name, 'tu material'), ' el ',
             DATE_FORMAT(NEW.acceptedDate, '%d/%m/%Y')),
      NEW.idRequest,
      NEW.id,
      NOW() + INTERVAL 7 DAY
    FROM request r
    JOIN users u ON u.id = NEW.collectorId
    LEFT JOIN material m ON m.id = r.materialId
    WHERE r.id = NEW.idRequest;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_appointment_status_notify` AFTER UPDATE ON `appointmentconfirmation` FOR EACH ROW BEGIN
  IF NEW.state != OLD.state THEN
    
    IF NEW.state = 1 THEN
      INSERT INTO notifications (userId, actorId, type, title, body, requestId, appointmentId, expireAt)
      SELECT 
        NEW.collectorId,
        r.idUser,
        'appointment_accepted',
        'Solicitud aceptada',
        CONCAT('Tu solicitud de recolección a ', ur.email, ' de ', COALESCE(m.name, 'tu material'), ' fue aceptada'),
        NEW.idRequest,
        NEW.id,
        NOW() + INTERVAL 7 DAY
      FROM request r
      JOIN users ur ON ur.id = r.idUser
      LEFT JOIN material m ON m.id = r.materialId
      WHERE r.id = NEW.idRequest;
    END IF;
    
    IF NEW.state = 3 THEN
      INSERT INTO notifications (userId, actorId, type, title, body, requestId, appointmentId, expireAt)
      SELECT 
        NEW.collectorId,
        r.idUser,
        'appointment_rejected',
        'Solicitud rechazada',
        CONCAT('Tu solicitud de recolección de ', COALESCE(m.name, 'tu material'), ' a ', ur.email, ' fue rechazada'),
        NEW.idRequest,
        NEW.id,
        NOW() + INTERVAL 7 DAY
      FROM request r
      JOIN users ur ON ur.id = r.idUser
      LEFT JOIN material m ON m.id = r.materialId
      WHERE r.id = NEW.idRequest;
    END IF;
    
    IF NEW.state = 5 THEN
      INSERT INTO notifications (userId, actorId, type, title, body, requestId, appointmentId, expireAt)
      SELECT 
        NEW.collectorId,
        r.idUser,
        'appointment_canceled',
        'Cita cancelada',
        CONCAT('La cita con ', ur.email, ' ha sido cancelada'),
        NEW.idRequest,
        NEW.id,
        NOW() + INTERVAL 7 DAY
      FROM request r
      JOIN users ur ON ur.id = r.idUser
      WHERE r.id = NEW.idRequest;
    END IF;
    
    IF NEW.state = 4 THEN
      INSERT INTO notifications (userId, actorId, type, title, body, requestId, appointmentId, expireAt)
      SELECT 
        NEW.collectorId,
        r.idUser,
        'appointment_completed',
        'Recolección completada',
        CONCAT('La recolección de ', COALESCE(m.name, 'tu material'), ' con ', ur.email, ' ha sido marcada como completada'),
        NEW.idRequest,
        NEW.id,
        NOW() + INTERVAL 7 DAY
      FROM request r
      JOIN users ur ON ur.id = r.idUser
      LEFT JOIN material m ON m.id = r.materialId
      WHERE r.id = NEW.idRequest;
    END IF;
    
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `image`
--

CREATE TABLE `image` (
  `id` int(10) UNSIGNED NOT NULL,
  `idRequest` int(10) UNSIGNED DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `uploadedDate` timestamp NULL DEFAULT current_timestamp(),
  `state` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `image`
--

INSERT INTO `image` (`id`, `idRequest`, `image`, `uploadedDate`, `state`) VALUES
(130, 137, '/uploads/images/request-1773441788102-782639706.png', '2026-03-13 22:41:55', 1),
(131, 138, '/uploads/images/request-1773442674769-624471699.png', '2026-03-13 22:56:41', 1),
(132, 139, '/uploads/images/request-1773547770572-809543575.png', '2026-03-15 04:10:53', 1),
(133, 140, '/uploads/images/request-1773550182783-255295354.png', '2026-03-15 04:51:06', 1),
(134, 141, '/uploads/images/request-1773622064104-744085748.png', '2026-03-16 00:49:07', 1),
(135, 142, '/uploads/images/request-1773666112667-815545208.png', '2026-03-16 13:01:53', 1);

-- --------------------------------------------------------

--
-- Table structure for table `institution`
--

CREATE TABLE `institution` (
  `companyName` varchar(255) DEFAULT NULL,
  `nit` varchar(50) DEFAULT NULL,
  `userId` int(10) UNSIGNED NOT NULL,
  `state` tinyint(4) NOT NULL DEFAULT 1 COMMENT '0 = rechazado/inactivo, 1 = pendiente, 2 = activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material`
--

CREATE TABLE `material` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `createdDate` timestamp NULL DEFAULT current_timestamp(),
  `modifiedBy` int(10) UNSIGNED DEFAULT NULL,
  `modifiedDate` timestamp NULL DEFAULT NULL,
  `state` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `material`
--

INSERT INTO `material` (`id`, `name`, `description`, `createdDate`, `modifiedBy`, `modifiedDate`, `state`) VALUES
(35, 'Papel', 'Papeles de todo tipo.', '2026-03-13 22:40:44', NULL, NULL, 1),
(36, 'Cartones', 'Cartones de todo tipo', '2026-03-13 22:40:56', NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(10) UNSIGNED NOT NULL,
  `userId` int(10) UNSIGNED NOT NULL,
  `actorId` int(10) UNSIGNED DEFAULT NULL,
  `type` enum('request_received','appointment_accepted','appointment_rejected','appointment_canceled','appointment_completed') NOT NULL,
  `title` varchar(200) NOT NULL,
  `body` varchar(600) NOT NULL,
  `requestId` int(10) UNSIGNED DEFAULT NULL,
  `appointmentId` int(10) UNSIGNED DEFAULT NULL,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `readAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `expireAt` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `userId`, `actorId`, `type`, `title`, `body`, `requestId`, `appointmentId`, `read`, `readAt`, `createdAt`, `expireAt`) VALUES
(425, 211, 212, 'request_received', 'Solicitud de recolección', 'El usuario ronaldjoelsaavedra@gmail.com ha solicitado recoger Cartones el 16/03/2026', 137, 214, 1, '2026-03-13 23:55:18', '2026-03-13 23:44:07', '2026-03-20 23:44:07'),
(426, 212, 211, 'appointment_accepted', 'Solicitud aceptada', 'Tu solicitud de recolección a ninja4321jsvj@gmail.com de Cartones fue aceptada', 137, 214, 1, '2026-03-13 23:55:04', '2026-03-13 23:54:27', '2026-03-20 23:54:27'),
(427, 212, 211, 'appointment_canceled', 'Cita cancelada', 'La cita con ninja4321jsvj@gmail.com ha sido cancelada', 137, 214, 1, '2026-03-13 23:55:03', '2026-03-13 23:54:48', '2026-03-20 23:54:48'),
(428, 211, NULL, 'appointment_canceled', '🚫 Cita cancelada', 'Ronald Saavedra Vargas canceló tu cita de recolección', 137, 214, 1, '2026-03-13 23:55:22', '2026-03-13 23:54:49', NULL),
(429, 211, 212, 'request_received', 'Solicitud de recolección', 'El usuario ronaldjoelsaavedra@gmail.com ha solicitado recoger Papel el 16/03/2026', 138, 215, 1, '2026-03-14 00:05:07', '2026-03-14 00:04:06', '2026-03-21 00:04:06'),
(430, 212, 211, 'appointment_accepted', 'Solicitud aceptada', 'Tu solicitud de recolección a ninja4321jsvj@gmail.com de Papel fue aceptada', 138, 215, 1, '2026-03-16 13:57:41', '2026-03-14 00:04:25', '2026-03-21 00:04:25'),
(431, 212, 211, 'appointment_completed', 'Recolección completada', 'La recolección de Papel con ninja4321jsvj@gmail.com ha sido marcada como completada', 138, 215, 1, '2026-03-16 13:57:40', '2026-03-14 00:04:36', '2026-03-21 00:04:36'),
(432, 211, NULL, 'appointment_completed', '🎉 Recolección completada', 'ronaldjoelsaavedra@gmail.com ha completado la recolección de Papel', 138, 215, 1, '2026-03-14 00:05:06', '2026-03-14 00:04:37', NULL),
(433, 212, NULL, 'appointment_completed', '✅ Recolección confirmada', 'Tu recolección ha sido completada. Mateo Saavedra Vargas calificará pronto.', 138, 215, 1, '2026-03-16 13:57:38', '2026-03-14 00:04:38', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `person`
--

CREATE TABLE `person` (
  `firstname` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `userId` int(10) UNSIGNED NOT NULL,
  `state` tinyint(4) NOT NULL DEFAULT 1 COMMENT '0 = rechazado/inactivo, 1 = pendiente, 2 = activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `person`
--

INSERT INTO `person` (`firstname`, `lastname`, `userId`, `state`) VALUES
('Joel', 'Saavedra', 210, 1),
('Mateo', 'Saavedra Vargas', 211, 1),
('Ronald', 'Saavedra Vargas', 212, 1),
('Carlos', 'Calle', 213, 1);

-- --------------------------------------------------------

--
-- Table structure for table `ranking_history`
--

CREATE TABLE `ranking_history` (
  `id` int(11) NOT NULL,
  `periodo_id` int(11) NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `rol` varchar(50) NOT NULL,
  `puntaje_final` decimal(10,2) NOT NULL,
  `posicion` int(11) NOT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ranking_periods`
--

CREATE TABLE `ranking_periods` (
  `id` int(11) NOT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `estado` enum('activo','cerrado') DEFAULT 'activo',
  `creado_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ranking_tops`
--

CREATE TABLE `ranking_tops` (
  `id` int(11) NOT NULL,
  `periodo_id` int(11) NOT NULL,
  `rol` varchar(20) NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `puntaje_final` decimal(10,2) NOT NULL,
  `posicion` int(11) NOT NULL,
  `fecha_cierre` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_info`
--

CREATE TABLE `report_info` (
  `id` int(10) UNSIGNED NOT NULL,
  `reason` varchar(60) NOT NULL,
  `description` varchar(150) DEFAULT NULL,
  `requestId` int(10) UNSIGNED NOT NULL,
  `prosecutorId` int(10) UNSIGNED NOT NULL,
  `reportedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `state` tinyint(3) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `report_info`
--

INSERT INTO `report_info` (`id`, `reason`, `description`, `requestId`, `prosecutorId`, `reportedAt`, `state`) VALUES
(1, 'Incumplimiento de horario', 'no vino', 139, 212, '2026-03-15 04:13:04', 1),
(2, 'Información incorrecta', 'No era papel viejo', 140, 212, '2026-03-15 04:51:46', 0),
(3, 'Incumplimiento de horario', 's', 139, 213, '2026-03-15 05:11:36', 0),
(4, 'Información incorrecta', 'No le sabe', 137, 212, '2026-03-15 06:33:39', 0),
(5, 'Información incorrecta', 's', 140, 212, '2026-03-16 00:06:44', 1),
(6, 'Otro', 'es bait si', 141, 212, '2026-03-16 00:58:05', 1),
(7, 'Incumplimiento de horario', 'Cambió de horario', 141, 213, '2026-03-16 00:59:14', 1);

-- --------------------------------------------------------

--
-- Table structure for table `request`
--

CREATE TABLE `request` (
  `id` int(10) UNSIGNED NOT NULL,
  `idUser` int(10) UNSIGNED DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `state` tinyint(4) DEFAULT 1 COMMENT '1 = open, 2 = accepted, 3 = confirmed, 4 = closed, 5 = cancelled',
  `registerDate` timestamp NULL DEFAULT current_timestamp(),
  `materialId` int(10) UNSIGNED DEFAULT NULL,
  `latitude` decimal(10,6) DEFAULT NULL,
  `longitude` decimal(10,6) DEFAULT NULL,
  `modificationDate` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request`
--

INSERT INTO `request` (`id`, `idUser`, `description`, `state`, `registerDate`, `materialId`, `latitude`, `longitude`, `modificationDate`) VALUES
(137, 211, 'Cartones en deposito.', 6, '2026-03-13 22:41:55', 36, -17.382218, -66.151772, '2026-03-15 06:34:52'),
(138, 211, 'Papeles', 4, '2026-03-13 22:56:41', 35, -17.382202, -66.151761, '2026-03-13 23:04:36'),
(139, 211, 'c', 6, '2026-03-15 04:10:53', 36, -17.388798, -66.157980, '2026-03-15 06:28:51'),
(140, 211, 'papel viejo', 1, '2026-03-15 04:51:05', 35, -17.398627, -66.140213, '2026-03-15 04:51:05'),
(141, 211, 'Pila de papel', 1, '2026-03-16 00:49:07', 35, -17.386750, -66.178837, '2026-03-16 00:49:07'),
(142, 211, 'Catones para la ñon', 1, '2026-03-16 13:01:52', 36, -17.400139, -66.174036, '2026-03-16 13:01:52');

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

CREATE TABLE `role` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `name` enum('admin','recolector','reciclador','guest') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`id`, `name`) VALUES
(1, 'admin'),
(2, 'recolector'),
(3, 'reciclador');

-- --------------------------------------------------------

--
-- Table structure for table `schedule`
--

CREATE TABLE `schedule` (
  `id` int(10) UNSIGNED NOT NULL,
  `startHour` time DEFAULT NULL,
  `endHour` time DEFAULT NULL,
  `monday` tinyint(4) DEFAULT 0,
  `tuesday` tinyint(4) DEFAULT 0,
  `wednesday` tinyint(4) DEFAULT 0,
  `thursday` tinyint(4) DEFAULT 0,
  `friday` tinyint(4) DEFAULT 0,
  `saturday` tinyint(4) DEFAULT 0,
  `sunday` tinyint(4) DEFAULT 0,
  `requestId` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schedule`
--

INSERT INTO `schedule` (`id`, `startHour`, `endHour`, `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`, `requestId`) VALUES
(106, '20:43:00', '21:43:00', 1, 0, 0, 0, 0, 0, 0, 137),
(107, '19:57:00', '20:57:00', 1, 0, 0, 0, 0, 0, 0, 138),
(108, '02:09:00', '23:09:00', 0, 1, 1, 0, 0, 0, 0, 139),
(109, '03:49:00', '21:49:00', 1, 1, 0, 0, 0, 0, 0, 140),
(110, '09:47:00', '21:47:00', 0, 1, 0, 0, 0, 0, 1, 141),
(111, '15:01:00', '16:01:00', 1, 0, 0, 0, 0, 0, 0, 142);

-- --------------------------------------------------------

--
-- Table structure for table `score`
--

CREATE TABLE `score` (
  `id` int(10) UNSIGNED NOT NULL,
  `appointmentConfirmationId` int(10) UNSIGNED DEFAULT NULL,
  `ratedByUserId` int(10) UNSIGNED DEFAULT NULL COMMENT 'Usuario que califica',
  `ratedToUserId` int(10) UNSIGNED DEFAULT NULL COMMENT 'Usuario calificado',
  `score` tinyint(3) UNSIGNED DEFAULT NULL COMMENT 'Calificación de 1 a 5 estrellas',
  `createdDate` timestamp NULL DEFAULT current_timestamp(),
  `comment` varchar(200) DEFAULT NULL,
  `state` tinyint(4) NOT NULL DEFAULT 1 COMMENT '0=inactivo, 1=activo',
  `rating` tinyint(3) UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `score`
--

INSERT INTO `score` (`id`, `appointmentConfirmationId`, `ratedByUserId`, `ratedToUserId`, `score`, `createdDate`, `comment`, `state`, `rating`) VALUES
(104, 215, 211, 212, 15, '2026-03-13 23:04:52', 'Bastante puntual', 1, 5),
(105, 215, 212, 211, 14, '2026-03-15 05:35:09', NULL, 1, 4);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `password` varchar(255) NOT NULL,
  `roleId` tinyint(3) UNSIGNED DEFAULT 3,
  `state` tinyint(4) NOT NULL DEFAULT 0,
  `registerDate` timestamp NULL DEFAULT current_timestamp(),
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `usersId` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `password`, `roleId`, `state`, `registerDate`, `email`, `phone`, `usersId`) VALUES
(210, '$2b$10$giixc00ZhADyh3ooRPEeMuKGY9jmm8j.caPiun1s2cM4HxooqsZii', 1, 2, '2026-03-11 23:25:39', 'svr0035567@est.univalle.edu', '+591 69443250', NULL),
(211, '$2b$10$If835ZNmV4A2sSvcmMNmaOqf/45bhvT35mu/zfLZ3w2kgAFM9uOle', 3, 2, '2026-03-13 22:23:33', 'ninja4321jsvj@gmail.com', '+591 69443250', NULL),
(212, '$2b$10$24OU4NG9tWBx127n2HOJoe09QPCEqeN1I.OoZjhlfZQ18h5XzAxAe', 2, 2, '2026-03-13 22:29:18', 'ronaldjoelsaavedra@gmail.com', '+591 69443250', NULL),
(213, '$2b$10$mKj9ljatdX7gFHNxzX7t3.qBLaFehO766QGb5EqVrwUEzecGbRu4i', 2, 2, '2026-03-15 05:10:05', 'smm0034570@est.univalle.edu', '+591 70321096', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_materials`
--

CREATE TABLE `user_materials` (
  `userId` int(10) UNSIGNED NOT NULL,
  `materialId` int(10) UNSIGNED NOT NULL,
  `state` tinyint(3) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `advertisement`
--
ALTER TABLE `advertisement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_advertisement_users` (`userId`);

--
-- Indexes for table `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_announcement_state` (`state`),
  ADD KEY `idx_announcement_role` (`targetRole`),
  ADD KEY `fk_announcement_admin` (`createdBy`);

--
-- Indexes for table `appointmentconfirmation`
--
ALTER TABLE `appointmentconfirmation`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_appoint_request` (`idRequest`),
  ADD KEY `idx_appoint_collector` (`collectorId`);

--
-- Indexes for table `image`
--
ALTER TABLE `image`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_image_request` (`idRequest`);

--
-- Indexes for table `institution`
--
ALTER TABLE `institution`
  ADD KEY `idx_institution_users` (`userId`);

--
-- Indexes for table `material`
--
ALTER TABLE `material`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_material_modifiedBy` (`modifiedBy`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_created` (`userId`,`createdAt` DESC),
  ADD KEY `idx_user_read` (`userId`,`read`),
  ADD KEY `idx_expire` (`expireAt`),
  ADD KEY `fk_notifications_actor` (`actorId`),
  ADD KEY `fk_notifications_request` (`requestId`),
  ADD KEY `fk_notifications_appointment` (`appointmentId`);

--
-- Indexes for table `person`
--
ALTER TABLE `person`
  ADD KEY `idx_person_users` (`userId`);

--
-- Indexes for table `ranking_history`
--
ALTER TABLE `ranking_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periodo_id` (`periodo_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `ranking_periods`
--
ALTER TABLE `ranking_periods`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ranking_tops`
--
ALTER TABLE `ranking_tops`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periodo_id` (`periodo_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `report_info`
--
ALTER TABLE `report_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `requestID_idx` (`requestId`),
  ADD KEY `prosecutorId_idx` (`prosecutorId`);

--
-- Indexes for table `request`
--
ALTER TABLE `request`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_request_user` (`idUser`),
  ADD KEY `idx_request_material` (`materialId`);

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `schedule`
--
ALTER TABLE `schedule`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_schedule_request` (`requestId`);

--
-- Indexes for table `score`
--
ALTER TABLE `score`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_score_appointment_user` (`appointmentConfirmationId`,`ratedByUserId`),
  ADD KEY `idx_score_appointment` (`appointmentConfirmationId`),
  ADD KEY `idx_score_rated_by` (`ratedByUserId`),
  ADD KEY `idx_score_rated_to` (`ratedToUserId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_users_role` (`roleId`),
  ADD KEY `idx_users_users1` (`usersId`);

--
-- Indexes for table `user_materials`
--
ALTER TABLE `user_materials`
  ADD PRIMARY KEY (`userId`,`materialId`),
  ADD KEY `materialId_idx` (`materialId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `advertisement`
--
ALTER TABLE `advertisement`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `announcement`
--
ALTER TABLE `announcement`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `appointmentconfirmation`
--
ALTER TABLE `appointmentconfirmation`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=216;

--
-- AUTO_INCREMENT for table `image`
--
ALTER TABLE `image`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=136;

--
-- AUTO_INCREMENT for table `material`
--
ALTER TABLE `material`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=434;

--
-- AUTO_INCREMENT for table `ranking_history`
--
ALTER TABLE `ranking_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=176;

--
-- AUTO_INCREMENT for table `ranking_periods`
--
ALTER TABLE `ranking_periods`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `ranking_tops`
--
ALTER TABLE `ranking_tops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=214;

--
-- AUTO_INCREMENT for table `report_info`
--
ALTER TABLE `report_info`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `request`
--
ALTER TABLE `request`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=143;

--
-- AUTO_INCREMENT for table `role`
--
ALTER TABLE `role`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `schedule`
--
ALTER TABLE `schedule`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `score`
--
ALTER TABLE `score`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=214;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `advertisement`
--
ALTER TABLE `advertisement`
  ADD CONSTRAINT `fk_advertisement_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `announcement`
--
ALTER TABLE `announcement`
  ADD CONSTRAINT `fk_announcement_admin` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `appointmentconfirmation`
--
ALTER TABLE `appointmentconfirmation`
  ADD CONSTRAINT `fk_appoint_collector` FOREIGN KEY (`collectorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appoint_request` FOREIGN KEY (`idRequest`) REFERENCES `request` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `image`
--
ALTER TABLE `image`
  ADD CONSTRAINT `fk_image_request` FOREIGN KEY (`idRequest`) REFERENCES `request` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `institution`
--
ALTER TABLE `institution`
  ADD CONSTRAINT `fk_institution_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `material`
--
ALTER TABLE `material`
  ADD CONSTRAINT `fk_material_modifiedBy` FOREIGN KEY (`modifiedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_actor` FOREIGN KEY (`actorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_appointment` FOREIGN KEY (`appointmentId`) REFERENCES `appointmentconfirmation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_request` FOREIGN KEY (`requestId`) REFERENCES `request` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `person`
--
ALTER TABLE `person`
  ADD CONSTRAINT `fk_person_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ranking_history`
--
ALTER TABLE `ranking_history`
  ADD CONSTRAINT `ranking_history_ibfk_1` FOREIGN KEY (`periodo_id`) REFERENCES `ranking_periods` (`id`),
  ADD CONSTRAINT `ranking_history_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `ranking_tops`
--
ALTER TABLE `ranking_tops`
  ADD CONSTRAINT `ranking_tops_ibfk_1` FOREIGN KEY (`periodo_id`) REFERENCES `ranking_periods` (`id`),
  ADD CONSTRAINT `ranking_tops_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `report_info`
--
ALTER TABLE `report_info`
  ADD CONSTRAINT `fk_report_prosecutor` FOREIGN KEY (`prosecutorId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_report_request` FOREIGN KEY (`requestId`) REFERENCES `request` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `schedule`
--
ALTER TABLE `schedule`
  ADD CONSTRAINT `fk_schedule_request` FOREIGN KEY (`requestId`) REFERENCES `request` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `score`
--
ALTER TABLE `score`
  ADD CONSTRAINT `fk_score_appointment` FOREIGN KEY (`appointmentConfirmationId`) REFERENCES `appointmentconfirmation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_score_rated_by` FOREIGN KEY (`ratedByUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_score_rated_to` FOREIGN KEY (`ratedToUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`roleId`) REFERENCES `role` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_users_users1` FOREIGN KEY (`usersId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `user_materials`
--
ALTER TABLE `user_materials`
  ADD CONSTRAINT `fk_um_material` FOREIGN KEY (`materialId`) REFERENCES `material` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_um_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
