
USE reciclaje_proyecto2db;

ALTER TABLE score DROP CONSTRAINT `score`;

ALTER TABLE score 
ADD CONSTRAINT `score` CHECK (score >= 0 AND score <= 15);

SHOW CREATE TABLE score;

SELECT 
    CONSTRAINT_NAME, 
    CHECK_CLAUSE 
FROM 
    INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
WHERE 
    TABLE_NAME = 'score' 
    AND TABLE_SCHEMA = 'reciclaje_proyecto2db';
