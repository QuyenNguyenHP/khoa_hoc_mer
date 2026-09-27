# Docker deployment

The containers publish only `127.0.0.1:18090`. Apache owns public ports 80/443 and proxies the domain to that port.

```bash
docker compose up -d --build
docker compose ps
curl -I http://127.0.0.1:18090
```

Then replace the current Apache virtual host with `deploy/apache2/comernganhmay.online-docker.conf`, enable it, and reload Apache:

```bash
sudo cp deploy/apache2/comernganhmay.online-docker.conf /etc/apache2/sites-available/comernganhmay.online.conf
sudo apache2ctl configtest && sudo systemctl reload apache2
```

Do not publish Docker directly to 80/443 while Apache is running; those ports are already used for HTTPS and certificate renewal.
