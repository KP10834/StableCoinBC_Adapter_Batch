module.exports = {
  apps: [
    {
      name: "balance-check",
      script: "dist/jobs/balance/index.js",
      cron_restart: "*/5 * * * *",
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "health-check",
      script: "dist/jobs/health-check/index.js",
      cron_restart: "*/5 * * * *",
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "pending-tx",
      script: "dist/jobs/pending-tx/index.js",
      cron_restart: "*/5 * * * *",
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "block-scan-verify",
      script: "dist/jobs/block-scan-verify/index.js",
      cron_restart: "*/10 * * * *",
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
