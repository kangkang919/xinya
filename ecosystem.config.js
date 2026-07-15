module.exports = {
  apps: [{
    name: 'xinya',
    script: 'node',
    args: '--env-file=/www/wwwroot/xinya/.env.production node_modules/.bin/next start -p 3000',
    cwd: '/www/wwwroot/xinya',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}