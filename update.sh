#!/bin/bash

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

stop nmeasocketio

su ubuntu -c 'git reset --hard origin/master && git stash && git pull && git stash pop'

su ubuntu -c 'npm install --production'

echo "Now running " `cat version.txt`

start nmeasocketio

HOSTNAME=`hostname`

echo Connect to $HOSTNAME
echo Go to http://172.16.10.1:8888/admin.html

