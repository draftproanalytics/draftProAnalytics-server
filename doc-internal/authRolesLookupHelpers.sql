-- actionId by actionCode
SELECT actionId, actionCode FROM PermissionAction;

-- domainId by domainCode
SELECT domainId, domainCode FROM FeatureDomain;

-- roleId by roleName
SELECT rid, roleName FROM Roles;


verify Role/Permissions
SELECT r.roleName, v.domainCode, v.actionCode
FROM vRoleEffectivePermission v
JOIN Roles r ON r.rid = v.roleId
WHERE r.roleName IN ('public','qa','dev','admin')
ORDER BY r.roleName, v.domainCode, v.actionCode;


verify User Roles/Permissions
SELECT p.userName, r.roleName, v.domainCode, v.actionCode
FROM Person p
JOIN Roles r ON r.rid = p.activeRid
JOIN vRoleEffectivePermission v ON v.roleId = r.rid
WHERE p.userName = 'eusdart98';

/*
Your DB has:
Person(pid, userName, activeRid)
Roles(rid, roleName, isActive)
PersonRole(personId, roleId, isActive, ...)
RoleAssumeRule(fromRoleId, toRoleId, isAllowed, ...)
vRoleEffectivePermission(roleId, domainCode, actionCode)
*/