#!/usr/bin/env sh

#npm install

if [ -d "./build" ]
then
    rm -fr ./build
fi

babel src --out-dir build/src
babel index.js --out-file build/index.js