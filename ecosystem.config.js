module.exports = {
  apps: [
    {
      name: 'voice-agent-backend',
      cwd: '/opt/voice-agent/backend',
      script: '/opt/voice-agent/backend/src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
}
