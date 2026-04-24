module.exports = {
  apps: [
    {
      name: 'trimio-api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
