# Guia de Deploy — LuxTranslator no Hostinger VPS

Guia passo-a-passo para colocar a app a correr num VPS Hostinger (Ubuntu), com HTTPS e arranque automático.

## 0. Pré-requisitos

- VPS Hostinger ativo (Ubuntu 22.04 recomendado), com acesso SSH (IP, utilizador `root`, password ou chave SSH — disponível no hPanel da Hostinger em "VPS → Detalhes").
- Domínio `app.luxtransfers.pt` já registado, com acesso à Zona DNS (hPanel → Domínios → DNS).

## 1. Ligar ao VPS por SSH

No teu PC (PowerShell):
```
ssh root@O_TEU_IP_DO_VPS
```

## 2. Atualizar o sistema e instalar dependências

```
apt update && apt upgrade -y
apt install -y curl git nginx ufw
```

## 3. Instalar Node.js 18

```
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node -v
```

## 4. Instalar o PM2 (gestor de processos)

Mantém a app sempre ligada e reinicia-a automaticamente se falhar.
```
npm install -g pm2
```

## 5. Clonar o repositório

```
mkdir -p /var/www
cd /var/www
git clone https://github.com/DevJeanPaulo/luxtranslator.git luxtranslator
cd luxtranslator/App
npm install --omit=dev
```

## 6. Criar o ficheiro de configuração com as chaves reais

Este ficheiro NUNCA vai para o GitHub (está no `.gitignore`).
```
cp ecosystem.config.example.js ecosystem.config.js
nano ecosystem.config.js
```
Substitui `cola-aqui-a-tua-chave-anthropic` e `cola-aqui-a-tua-chave-deepl` pelas chaves reais. Guarda com `Ctrl+O`, `Enter`, sai com `Ctrl+X`.

## 7. Iniciar a app com PM2

```
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
O último comando (`pm2 startup`) vai imprimir uma linha de comando — copia-a e cola-a no terminal para ativar o arranque automático após reiniciar o servidor.

Verifica que está a correr:
```
pm2 status
pm2 logs luxtranslator --lines 20
```
Deves ver `LuxTranslator em http://localhost:8080`.

## 8. Configurar o Nginx (proxy reverso)

```
cp /var/www/luxtranslator/App/nginx-luxtranslator.conf /etc/nginx/sites-available/luxtranslator
ln -s /etc/nginx/sites-available/luxtranslator /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## 9. Apontar o domínio para o VPS

No hPanel da Hostinger → Domínios → `app.luxtransfers.pt` → Gerir DNS:
- Cria/edita o registo **A** do subdomínio `app` para apontar para o **IP do VPS**.
- Remove qualquer registo antigo que apontasse para o Railway.
- Espera a propagação (normalmente 5-30 min).

## 10. Ativar HTTPS (SSL grátis)

Depois do DNS propagar (testa com `ping app.luxtransfers.pt` — deve devolver o IP do VPS):
```
apt install -y certbot python3-certbot-nginx
certbot --nginx -d app.luxtransfers.pt
```
Segue as instruções no ecrã (email, aceitar termos). O Certbot configura o HTTPS e a renovação automática.

## 11. Firewall

```
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 12. Testar

Abre `https://app.luxtransfers.pt` no browser — deve carregar a app normalmente, com cadeado verde.

## Atualizações futuras

Sempre que fizeres alterações e um `git push` para o GitHub, atualiza o servidor assim:
```
cd /var/www/luxtranslator
git pull origin master
cd App
npm install --omit=dev
pm2 restart luxtranslator
```

Podes guardar isto como um script `deploy.sh` no servidor para facilitar:
```
cat > /var/www/deploy.sh << 'EOF'
#!/bin/bash
cd /var/www/luxtranslator
git pull origin master
cd App
npm install --omit=dev
pm2 restart luxtranslator
EOF
chmod +x /var/www/deploy.sh
```
Depois, para atualizar, basta correr `/var/www/deploy.sh` no VPS.
