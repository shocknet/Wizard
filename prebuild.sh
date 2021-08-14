#!/bin/bash

nvm install $nodejs_version
if [[ "$OSTYPE" != "darwin"* ]]
then
  apt update && apt-get install alien -y && snap install snapcraft --classic
fi
