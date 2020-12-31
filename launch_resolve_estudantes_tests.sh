#!/bin/bash
set -e
# set -x

if [ "$ESTUDANTE_RESOLVER_URL" = "" ]; then
  echo "ESTUDANTE_RESOLVER_URL is required"
  exit 1
fi

if [ "$RUN_PARALLEL_USERS" = "" ]; then
  echo "RUN_PARALLEL_USERS is required"
  exit 1
fi

if [ "$TAKE_SCREENSHOTS_CHANCE" = "" ]; then
  echo "TAKE_SCREENSHOTS_CHANCE not provided. Defaulting to 100"
  TAKE_SCREENSHOTS_CHANCE=100
fi

if [ "$TAKE_SCREENSHOTS" = "false" ]; then
  echo "Disabling screenshots"
  TAKE_SCREENSHOTS_CHANCE=0
fi

if [ "$TIME_BETWEEN_NEW_USERS" = "" ]; then
  echo "TIME_BETWEEN_NEW_USERS not provided. Defaulting to 0"
  TIME_BETWEEN_NEW_USERS=0
fi

if [ "$TIME_BETWEEN_NEW_TESTS" = "" ]; then
  echo "TIME_BETWEEN_NEW_TESTS not provided. Defaulting to 1.0"
  TIME_BETWEEN_NEW_TESTS=1.0
fi


echo "Preparing run for $RUN_PARALLEL_USERS users"
UF="./users.txt"
echo '' > $UF # always reset local users because they will resolved from external server

echo "Resolving $RUN_PARALLEL_USERS users at $ESTUDANTE_RESOLVER_URL before running tests..."
for COUNTER in $(seq 1 $RUN_PARALLEL_USERS); do

  echo "Resolving account for the $COUNTER user..."
  EMAIL0=$(curl -L --fail ''"$ESTUDANTE_RESOLVER_URL"'' --compressed)
  echo $?

  echo "Account $EMAIL0 resolved successfully"
  echo $EMAIL0 >> $UF

  sleep $TIME_BETWEEN_NEW_USERS
done


echo ">>>Launching tests now"
/showusers.sh &

C=1
while read EMAIL0; do
  if [ -z "$EMAIL0" ]; then
    echo "Ignoring empty email..."
  else
    if [ "$C" -gt "$RUN_PARALLEL_USERS" ]; then
      break
    fi
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
    EMAIL=$EMAIL0 PASSWORD="1234" BROWSERID=$EMAIL0 TAKE_SCREENSHOTS=$TAKE_SCREENSHOTS LOG_ENABLE=true \
      jest --bail 1 --runInBand --testTimeout=30000 --maxConcurrency=1 --useStderr 2>&1 &

    C=$((C+1))

    sleep $TIME_BETWEEN_NEW_TESTS
  fi
done <$UF

/exitfinished.sh
