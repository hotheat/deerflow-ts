#!/usr/bin/env bash

set -e

RUN_DIR=$(pwd)

SCRIPT_DIR=$(
  cd $(dirname "$0")
  pwd
)

clear() {
    rm -rf ./dist/*
}

generate_prisma() {
    ./node_modules/.bin/prisma generate
}

tsc() {
    ./node_modules/.bin/tsc --project tsconfig.build.json --skipLibCheck
}

copy() {
    cp ./package.json ./dist/package.json
    cp ./pnpm-lock.yaml ./dist/pnpm-lock.yaml
}

install() {
    cd ./dist
    pnpm install --prod --frozen-lockfile
    cd ..
}

compile() {
    clear
    generate_prisma
    tsc
    copy
    install
}

start() {
    cd "$SCRIPT_DIR" && cd ..
    compile
    cd "$RUN_DIR"
}

start
