/**
 * Deprecated:
 * Embedded `User.designations[]` field is no longer used in this codebase.
 *
 * Use `migrateDesignationsToCollection.js` to backfill `user_designations`
 * from existing embedded data (if any), and then remove embedded data if desired.
 */

console.warn(
  "migrateDesignationSchema.js is deprecated. Use server/scripts/migrateDesignationsToCollection.js instead.",
);

