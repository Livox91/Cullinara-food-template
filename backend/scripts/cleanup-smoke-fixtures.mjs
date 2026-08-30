import "dotenv/config";
import pg from "pg";

const database = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await database.connect();
  await database.query(`
    UPDATE "BusinessMembership"
    SET "status" = 'REVOKED', "updatedAt" = now()
    WHERE "businessId" IN (SELECT "id" FROM "Business" WHERE "slug" LIKE 'smoke-foods-%')
  `);
  await database.query(`
    UPDATE "Business"
    SET "status" = 'CLOSED', "updatedAt" = now()
    WHERE "slug" LIKE 'smoke-foods-%'
  `);
  await database.query(`
    UPDATE "AuthSession"
    SET "revokedAt" = COALESCE("revokedAt", now()), "updatedAt" = now()
    WHERE "userId" IN (
      SELECT "id" FROM "User"
      WHERE "email" LIKE 'business-owner-%@example.test'
         OR "email" LIKE 'business-member-%@example.test'
    )
  `);
  const result = await database.query(`
    UPDATE "User"
    SET "status" = 'DELETED', "updatedAt" = now()
    WHERE "email" LIKE 'business-owner-%@example.test'
       OR "email" LIKE 'business-member-%@example.test'
  `);
  console.log(JSON.stringify({ softDeletedUsers: result.rowCount }));
} finally {
  await database.end();
}
