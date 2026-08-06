/**
 * Runs BEFORE Jest loads any test modules (setupFiles, not setupFilesAfterEach).
 * This is the only safe place to set process.env vars that are consumed at
 * module-import time (e.g. env.ts reads MONGODB_URI on require()).
 */
process.env.NODE_ENV = "test";
process.env.PORT = "5001";
process.env.MONGODB_URI = "mongodb://localhost:27017/loan-emi-system-test";
process.env.JWT_SECRET = "test-jwt-secret-min-32-chars-long!!";
process.env.JWT_EXPIRES_IN = "7d";
