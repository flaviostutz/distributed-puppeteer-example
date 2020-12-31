#!/bin/bash
set -e
# set -x

if [ "$TEST_ID" = "" ]; then
  echo "TEST_ID is required"
  exit 1
fi

echo "Preparing run for $RUN_PARALLEL_USERS emulated users"

UF="/data/users.txt"
if [ "$FORCE_USER_CREATION" == "true" ]; then
  echo "FORCE_USER_CREATION is true, so existing users file will be deleted and new users will be created"
  if [ -f $UF ]; then
    mv $UF /data/users-delete.txt
  fi
fi

UC="0"
if [ -f "$UF" ]; then
  UC=$(cat $UF | wc -l)
fi

echo "Reusing $UC pre created users. Needs $RUN_PARALLEL_USERS"

if [ "$UC" -lt "$RUN_PARALLEL_USERS" ]; then
  NC=$((RUN_PARALLEL_USERS - UC))
  echo "Creating additional $NC users before running tests..."

  for COUNTER in $(seq 1 $NC); do
    USERID=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 5 | head -n 1)
    EMAIL0="$USERID@aaaaa.com"

    echo "Creating account $EMAIL0 with password '1234'..."
    curl -L --fail ''"$APP_BACKEND_URL"'/api/v1/alunos' \
      -H 'Connection: keep-alive' \
      -H 'Accept: application/json' \
      -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36' \
      -H 'Content-Type: application/json' \
      -H 'Sec-Fetch-Site: same-site' \
      -H 'Sec-Fetch-Mode: cors' \
      -H 'Sec-Fetch-Dest: empty' \
      -H 'Accept-Language: en-US,en;q=0.9,pt;q=0.8' \
      --data-binary '{"nome":"Puppeteer parallel='"$RUN_PARALLEL_USERS"' time='"$MIN_QUESTION_TIME"'-'"$MAX_QUESTION_TIME"' '"$USERID"'","cpf":"'"$USERID"'","email":"'"$EMAIL0"'","senha":"03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4","id_faculdade":12,"id_curso":3,"id_faculdade_fase":2,"turno":"NOTURNO"}' \
      --compressed
    echo $?
    echo "Account $EMAIL0 created successfully"

    echo "Adding $EMAIL0 as audience for test $TEST_ID"
    curl -L --fail --request POST ''"$APP_BACKEND_URL"'/api/v1/testes/'"$TEST_ID"'/assign' \
      --header 'Content-Type: application/json' \
      --data-raw '{ "email": "'"$EMAIL0"'" }'

    echo "$USERID" >> $UF

    sleep $TIME_BETWEEN_NEW_USERS
  done
fi


echo ">>>Launching tests now"
/showusers.sh &

C=1
while read USERID; do
  EMAIL0="$USERID@aaaaaa.com"
  echo "Launching tests for $EMAIL0 ($C)..."

  TAKE_SCREENSHOTS="false"
  if [ "$TAKE_SCREENSHOTS_CHANCE" != "0" ]; then
    DICE=$(( RANDOM % 100 ))
    if [ $DICE -le $TAKE_SCREENSHOTS_CHANCE ]; then
      TAKE_SCREENSHOTS="true"
      echo "Will take screenshots for '$EMAIL0'"
    fi
  fi

  #use stderr and then redirect in order to get logs from inside Jest (seems like it directs to directly to out device by default)
  EMAIL="$EMAIL0" PASSWORD="1234" BROWSERID="$USERID" TAKE_SCREENSHOTS=$TAKE_SCREENSHOTS LOG_ENABLE=true \
    jest --bail 1 --runInBand --testTimeout=30000 --maxConcurrency=1 --useStderr 2>&1 &

  C=$((C+1))
  if [ "$C" -gt "$RUN_PARALLEL_USERS" ]; then
    break
  fi

  sleep $TIME_BETWEEN_NEW_TESTS
done <$UF


/exitfinished.sh

