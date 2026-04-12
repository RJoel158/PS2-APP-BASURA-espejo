module.exports = {
  apps: [
    {
      name: 'greenbit-api',
      script: './server.js',
      exec_mode: 'cluster',
      instances: process.env.PM2_INSTANCES || process.env.PM2_CANARY_INSTANCES || 'max',
      max_memory_restart: process.env.PM2_MAX_MEMORY_RESTART || '600M',
      time: true,
      env: {
        NODE_ENV: 'production',
        TRUST_PROXY: process.env.TRUST_PROXY || '1'
      },
      env_canary: {
        NODE_ENV: 'production',
        TRUST_PROXY: process.env.TRUST_PROXY || '1',
        PM2_INSTANCES: process.env.PM2_CANARY_INSTANCES || '2',
        PORT: process.env.PM2_CANARY_PORT || '3001'
      }
    }
  ]
};
