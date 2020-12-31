#!/bin/sh

while true; do
  QTTY=$(ps ax | grep chrome | wc -l)
  QTTY=$((QTTY - 1))
  QTTYJ=$(ps ax | grep jest | wc -l)
  QTTYJ=$((QTTYJ - 1))
  echo ""
  echo ""
  echo ">>>>>> ACTIVE USERS: $QTTYJ - CHROME PROCESSES: $QTTY"
  echo ""
  echo ""
  sleep 5
done

