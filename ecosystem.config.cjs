require('dotenv').config();

module.exports = {
  apps: [{
    name: "Cedeg",
    script: './dist/index.js',
    watch: './dist',
    env: {
      "NODE_ENV": "production"
    },
  }],

  deploy: {
    production: {
      user: 'pi',
      host: process.env.SERVER_IP,
      ref: 'origin/master',
      repo: 'git@github.com:mazynoah/cedeg-presence-discord-bot.git',
      path: '/home/pi/bots/cedeg',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && rm ./dist -rf && tsc --build tsconfig.json && pm2 reload ecosystem.config.cjs',
      'pre-setup': '',
      env: {
        NODE_ENV: "production",
        TOKEN: process.env.TOKEN,
        ADMIN_ID: process.env.ADMIN_ID
      }
    }
  }
};