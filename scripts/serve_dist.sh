#!/usr/bin/env bash

set -e 
set -u # unset variables throw error
set -o pipefail # pipes fail when partial command fails

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# serve frontend as https if CBIOPORTAL_URL contains https, use http otherwise
bash ${SCRIPT_DIR}/env_vars.sh || exit 1
eval "$(bash $SCRIPT_DIR/env_vars.sh)"
(echo $CBIOPORTAL_URL | grep -q https) \
&& ( \
    openssl \
        req -newkey rsa:2048 -new -nodes -x509 -days 1 -keyout key.pem -out cert.pem \
        -subj "/C=US/ST=Denial/L=Springfield/O=Dis/CN=localhost" && \
    ./node_modules/http-server/bin/http-server -S -C cert.pem --cors dist/ -p 3000 \
) || ./node_modules/http-server/bin/http-server --cors dist/ -p 3000
