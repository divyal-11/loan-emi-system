module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["**/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setEnv.ts"],
  globals: {
    "ts-jest": {
      tsconfig: {
        module: "commonjs",
        moduleResolution: "node",
      },
    },
  },
};
