#!/bin/sh
docker run --rm -it \
        -p 9190:80 \
        -v $(pwd):/workspace \
        -v /home/$USER/.gitconfig:/root/.gitconfig \
        juanitomint/c9collab:nvm 