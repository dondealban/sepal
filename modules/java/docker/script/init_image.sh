#!/usr/bin/env bash

apt-get -y update && apt-get install -y software-properties-common

apt-get -y update && apt-get install -qq -y \
    sudo \
    supervisor \
    gettext \
    curl \
    unzip \
    zip

# Installing Java
export SDKMAN_DIR=/usr/local/lib/sdkman
curl -s get.sdkman.io | bash
source "$SDKMAN_DIR/bin/sdkman-init.sh"
yes | sdk install java 12.0.2.hs-adpt

ln -s `which java` /usr/local/bin/java
