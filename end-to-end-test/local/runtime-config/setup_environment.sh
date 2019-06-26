#!/usr/bin/env bash

set -e

# -+-+-+-+-+-+-+ ENVIRONMENTAL VARIABLES +-+-+-+-+-+-+-

echo export E2E_CBIOPORTAL_HOST_NAME=cbioportal
echo export CBIOPORTAL_URL="http://cbioportal:8080"
echo export DOCKER_NETWORK_NAME=endtoend_localdb_network
echo export SESSION_SERVICE_HOST_NAME=cbio-session-service
echo export SCREENSHOT_IMAGE_NAME=cbio-screenshot
echo export SCREENSHOT_DIRECTORY=./local/screenshots
echo export JUNIT_REPORT_PATH=./local/junit/
echo export SPEC_FILE_PATTERN=./local/specs/**/*.spec.js

echo export DB_CGDS_URL=https://raw.githubusercontent.com/cBioPortal/cbioportal/v2.0.0/db-scripts/src/main/resources/cgds.sql
echo export DB_SEED_URL=https://raw.githubusercontent.com/cBioPortal/datahub/master/seedDB/seed-cbioportal_hg19_v2.7.3.sql.gz

# -+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-

parse_custom_backend_var() {
    # Parse BACKEND environmental variable. This must occur after PR evaluation
    # because this possibly overwrites variables extracted from the GitHub pull request.
    if [[ $BACKEND =~ (.+):(.+) ]]; then
        echo "export BACKEND_PROJECT_USERNAME=${BASH_REMATCH[1]}"
        echo "export BACKEND_BRANCH=${BASH_REMATCH[2]}"
    else
        echo "Error: could not parse BACKEND variable from custom.sh. Expected format: <BACKEND_GITHUB_USER>:<BACKEND_BRANCH> (e.g. 'cbioportal:rc')"
        exit 1
    fi
}

# Check whether running in CircleCI environment
if [[ "$CIRCLECI" = true ]]; then

    # Check whether running in context of a pull request
    # by extracting the pull request number
    if [[ "$CIRCLE_PULL_REQUEST" =~ \/([0-9]+)$ ]] ; then
        
        GITHUB_PR_API_PATH="${CIRCLE_PULL_REQUEST/github\.com\//api\.github\.com\/repos/}"
        GITHUB_PR_API_PATH="${GITHUB_PR_API_PATH/\/pull\//\/pulls\/}"

        python3 $TEST_HOME/shared/get_pullrequest_info.py $GITHUB_PR_API_PATH
        eval $(python3 $TEST_HOME/shared/get_pullrequest_info.py $GITHUB_PR_API_PATH)
        
        # Check whether the pull request is of 'draft' state when BACKEND is specified in custom.sh 
        # This requirement ensures that only pull requests against a accepted backend are merged
        if [[ -n $BACKEND ]] && [[ $PULL_REQUEST_STATE != "draft" ]]; then
            echo "Error: BACKEND variable defined in custom.sh, but pull request state is not 'draft'"
            echo "Remove BACKEND variable from custom.sh or change the pull request into a draft pull request."
            exit 1
        fi

    fi

    # Check whether custom BACKEND environmental var is defined (required when running outside context of a pull request on CircleCI)
    if [[ -z $BACKEND ]]; then
        if [[ -z $CIRCLE_PULL_REQUEST ]]; then
            echo Error: BACKEND environmental variable not set in /env/custom.sh. This is required when running outside context of a pull request on CircleCI.
            exit 1
        fi
    else
        parse_custom_backend_var
    fi

    echo export FRONTEND_SHA1=$CIRCLE_SHA1
    echo export FRONTEND_SHA1_SHORT=$(echo $CIRCLE_SHA1 | awk '{print substr($0,0,10)}')
    echo export FRONTEND_PROJECT_USERNAME=$CIRCLE_PROJECT_USERNAME
    echo export FRONTEND_GROUPID=com.github.$CIRCLE_PROJECT_USERNAME

else
    # When not running in CircleCI environment, check whether custom BACKEND environmental var is defined (required when running outside CircleCI context)
    if [[ -z $BACKEND ]]; then
        echo Error: BACKEND environmental variable not set in /env/custom.sh. This is required when running outside the CircleCI environment.
        exit 1
    else
        parse_custom_backend_var
    fi

    FRONTEND_SHA1=$(git rev-parse HEAD 2> /dev/null | sed "s/\(.*\)/\1/")
    echo export FRONTEND_SHA1=$FRONTEND_SHA1
    echo export FRONTEND_SHA1_SHORT=$(echo $FRONTEND_SHA1 | awk '{print substr($0,0,10)}')

    FRONTEND_PROJECT_USERNAME=$(git config --local remote.origin.url|sed -n "s#.*/\([^.]*\)/.*#\1#p")
    echo export FRONTEND_PROJECT_USERNAME=$FRONTEND_PROJECT_USERNAME
    echo export FRONTEND_GROUPID=com.github.$FRONTEND_PROJECT_USERNAME
fi

python3 $TEST_HOME/shared/read_portalproperties.py portal.properties
# retrieves
    # DB_USER                       ->  (e.g. 'cbio_user')
    # DB_PASSWORD                   ->  (e.g. 'cbio_pass')
    # DB_PORTAL_DB_NAME             ->  (e.g. 'endtoend_local_cbiodb')
    # DB_CONNECTION_STRING          ->  (e.g. 'jdbc:mysql://cbiodb-endtoend:3306/')
    # DB_HOST                       ->  (e.g. 'cbiodb-endtoend')