SELECT
       p.pid,
       p.userName,
       p.emailAddress,
       p.activeRid,
       ar.roleName AS activeRoleName
     FROM Person p
     LEFT JOIN Roles ar ON ar.rid = p.activeRid
     ORDER BY p.pid DESC
     LIMIT 10;


SELECT      
    p.pid AS person_id,     
    p.firstName,      
    p.lastName,       
    r.rid AS role_id,     
    r.roleName,     
    r.description,
    pr.assignedAt,     
    pr.revokedAt 
FROM Person p 
LEFT JOIN PersonRole pr ON p.pid = pr.personId 
LEFT JOIN Roles r ON pr.roleId = r.rid;
