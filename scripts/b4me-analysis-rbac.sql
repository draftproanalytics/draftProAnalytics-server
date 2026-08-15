-- DraftProAnalytics: B4Me Analysis RBAC
-- VIEW + RUN: public, dev, qa, admin
-- EDIT: dev, qa, admin only
-- Safe to re-run.

START TRANSACTION;

INSERT INTO FeatureDomain (domainCode, displayName, isMaintenance)
VALUES ('B4ME_ANALYSIS', 'B4Me Analysis', 0)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName), isMaintenance = VALUES(isMaintenance);

INSERT INTO PermissionAction (actionCode, description)
VALUES
  ('VIEW', 'View feature data and screens'),
  ('RUN', 'Run feature analysis or jobs'),
  ('EDIT', 'Edit feature-owned configuration or observed metrics')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Every standard DPA role may view and run B4Me Analysis.
INSERT INTO RolePermission (roleId, domainId, actionId, isAllowed)
SELECT r.rid, fd.domainId, pa.actionId, 1
FROM Roles r
JOIN FeatureDomain fd ON fd.domainCode = 'B4ME_ANALYSIS'
JOIN PermissionAction pa ON pa.actionCode IN ('VIEW', 'RUN')
WHERE LOWER(r.roleName) IN ('public', 'dev', 'qa', 'admin')
ON DUPLICATE KEY UPDATE isAllowed = 1;

-- Public may not edit B4Me-owned metrics/configuration.
INSERT INTO RolePermission (roleId, domainId, actionId, isAllowed)
SELECT r.rid, fd.domainId, pa.actionId, 0
FROM Roles r
JOIN FeatureDomain fd ON fd.domainCode = 'B4ME_ANALYSIS'
JOIN PermissionAction pa ON pa.actionCode = 'EDIT'
WHERE LOWER(r.roleName) = 'public'
ON DUPLICATE KEY UPDATE isAllowed = 0;

-- Dev, QA, and Admin may edit B4Me-owned metrics/configuration.
INSERT INTO RolePermission (roleId, domainId, actionId, isAllowed)
SELECT r.rid, fd.domainId, pa.actionId, 1
FROM Roles r
JOIN FeatureDomain fd ON fd.domainCode = 'B4ME_ANALYSIS'
JOIN PermissionAction pa ON pa.actionCode = 'EDIT'
WHERE LOWER(r.roleName) IN ('dev', 'qa', 'admin')
ON DUPLICATE KEY UPDATE isAllowed = 1;

COMMIT;

-- Verification
SELECT r.roleName, fd.domainCode, pa.actionCode, rp.isAllowed
FROM RolePermission rp
JOIN Roles r ON r.rid = rp.roleId
JOIN FeatureDomain fd ON fd.domainId = rp.domainId
JOIN PermissionAction pa ON pa.actionId = rp.actionId
WHERE fd.domainCode = 'B4ME_ANALYSIS'
ORDER BY r.rid, FIELD(pa.actionCode, 'VIEW', 'RUN', 'EDIT');
