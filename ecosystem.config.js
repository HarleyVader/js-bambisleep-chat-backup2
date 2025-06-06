module.exports = {
  apps: [{
    name: 'bambisleep-chat',
    script: 'x-hypno-boot.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G', 
    env: {
      NODE_ENV: 'production',
      SERVER_PORT: 6969
    },
    env_development: {
      NODE_ENV: 'development',
      SERVER_PORT: 6969
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }],

  // PM2.io configuration
  pmx: {
    public_key: 'eccuuo8utvbp9g3',
    secret_key: 'wbitflwoinahavz'
  }
};
