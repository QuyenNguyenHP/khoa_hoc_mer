# Apache2 deployment

1. Build the frontend:

   ```bash
   npm run build
   ```

2. Copy `dist/` to `/var/www/comernganhmay.online`.

3. Enable the virtual host:

   ```bash
   sudo cp deploy/apache2/comernganhmay.online.conf /etc/apache2/sites-available/
   sudo a2ensite comernganhmay.online.conf
   sudo a2enmod proxy proxy_http rewrite headers
   sudo apache2ctl configtest
   sudo systemctl reload apache2
   ```

4. Point DNS records for `comernganhmay.online` and `www.comernganhmay.online` to this server, then create an HTTPS certificate, for example with Certbot.
