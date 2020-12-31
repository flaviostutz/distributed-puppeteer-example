#!/bin/sh

F=0
while true; do
  QTTY=$(ps ax | grep chrome | wc -l)
  QTTY=$((QTTY - 1))
  QTTYJ=$(ps ax | grep jest | wc -l)
  QTTYJ=$((QTTYJ - 1))
  # echo "users=$QTTYJ; chrome=$QTTY"
  if [ "$QTTYJ" -eq "0" ]; then
      if [ "$F" = "1" ]; then
          echo "Tests finished. Will exit in a minute."
          sleep 60
          echo ">>>>>> ALL TESTS FINISHED. EXITING NOW."
          exit 0
      fi
  fi
  if [ "$QTTY" -gt "3" ]; then
    if [ "$F" = "0" ]; then
        echo "User activity detected. Will exit if chrome count arrives 0 now."
    fi
    F=1
  fi
  sleep 10
done
