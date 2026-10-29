# Gate Monitor Security Assets

## fail2ban
1. Copy `caddy-4xx.conf` to `/etc/fail2ban/filter.d/caddy-4xx.conf`
2. Copy `gate-monitor.local` to `/etc/fail2ban/jail.d/gate-monitor.conf`
3. Run `sudo systemctl restart fail2ban`

## Docker Hardening & Network Isolation
- All sensitive databases (Postgres, Redis) reside on internal networks without host ports exposed.
- WAF (Coraza + OWASP CRS) can be loaded into Caddy via custom build (`xcaddy build --with github.com/corazawaf/coraza-caddy`).
