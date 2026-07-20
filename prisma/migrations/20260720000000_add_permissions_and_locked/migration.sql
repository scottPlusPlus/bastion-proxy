-- Add locked flag to EnvVar
ALTER TABLE "EnvVar" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable ApiKeyPermission
CREATE TABLE "ApiKeyPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    CONSTRAINT "ApiKeyPermission_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ApiKeyPermission_apiKeyId_resource_action_key" ON "ApiKeyPermission"("apiKeyId", "resource", "action");

-- Preserve proxy access for API keys issued before permissions were introduced.
INSERT INTO "ApiKeyPermission" ("id", "apiKeyId", "resource", "action")
SELECT 'legacy-env-read-' || "id", "id", 'ENV', 'READ'
FROM "ApiKey";
