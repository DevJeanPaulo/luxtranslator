// Copia este ficheiro para "ecosystem.config.js" DIRETAMENTE NO SERVIDOR (não no teu PC, não no Git)
// e substitui os valores pelas tuas chaves reais.
// O ecosystem.config.js real NUNCA deve ser enviado para o GitHub (já está no .gitignore).

module.exports = {
  apps: [
    {
      name: "luxtranslator",
      script: "server.js",
      cwd: "/var/www/luxtranslator",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
        ANTHROPIC_API_KEY: "cola-aqui-a-tua-chave-anthropic",
        DEEPL_API_KEY: "cola-aqui-a-tua-chave-deepl"
      }
    }
  ]
};
