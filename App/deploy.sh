#!/bin/bash
set -e

cd /var/www/luxtranslator || exit 1

git pull origin master

cd App || exit 1
npm install --omit=dev
pm2 restart luxtranslator
