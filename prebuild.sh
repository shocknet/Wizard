nvm install $nodejs_version
if [[ "$OSTYPE" != "darwin"* ]]
then
  sudo apt update && sudo apt-get install alien -y && sudo snap install snapcraft --classic
fi
