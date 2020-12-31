#!/bin/sh

set -e

mkdir -p /app/screenshots/

if [ "$CONSUL_HOST" != "" ]; then
    MY_IP=$(curl ifconfig.me)

    echo "Registering instance to Consul with public ip $MY_IP so that Prometheus can query metrics on this instance"

    curl --fail --location -X PUT ''$CONSUL_HOST'/v1/agent/service/register' \
    --header 'Content-Type: application/json' \
    --data-raw '{
    "Address": "'$MY_IP'",
    "ID": "'$MY_IP'",
    "Name": "puppeteer",
    "Port": 8880
    }
    '
fi

echo "Lauching in TEST_MODE = RESOLVE_ALUNOS_PROMGREP. Promgrep activated."
/startmonitored_resolve_estudantes.sh &

/exitfinished.sh
