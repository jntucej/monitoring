sed -i -E 's/^\{\$PUBLIC_URL.*$/:80 {/g' Caddyfile
sed -i -E '/^[[:space:]]*tls /d' Caddyfile
