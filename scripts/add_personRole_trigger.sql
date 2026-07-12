DELIMITER $$

CREATE TRIGGER before_person_role_insert
BEFORE INSERT ON PersonRole
FOR EACH ROW
BEGIN
    IF NEW.assignedAt IS NULL THEN
        SET NEW.assignedAt = NOW();
    END IF;
END$$

DELIMITER ;


DELIMITER $$

CREATE TRIGGER before_person_role_insert
BEFORE INSERT ON PersonRole
FOR EACH ROW
BEGIN
    IF NEW.assignedAt IS NULL THEN
        SET NEW.assignedAt = NOW();
    END IF;
END$$

DELIMITER ;
