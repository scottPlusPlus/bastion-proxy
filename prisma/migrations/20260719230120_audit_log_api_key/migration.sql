-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "envVarKey" TEXT,
    "apiKeyId" TEXT,
    "apiKeyName" TEXT,
    "targetUrl" TEXT,
    "requestBytes" INTEGER,
    "responseBytes" INTEGER,
    "secretKeys" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "envVarKey", "id", "projectId", "requestBytes", "responseBytes", "secretKeys", "targetUrl") SELECT "action", "createdAt", "envVarKey", "id", "projectId", "requestBytes", "responseBytes", "secretKeys", "targetUrl" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
