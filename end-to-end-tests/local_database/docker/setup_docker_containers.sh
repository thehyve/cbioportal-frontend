#!/usr/bin/env bash

set -e 
set -u # unset variables throw error
set -o pipefail # pipes fail when partial command fails

run_database_container() {
    # create local database from with cbioportal db and seed data
    download_db_seed
    docker volume rm MYSQL_DATA_DIR 2> /dev/null || true
    docker stop $DB_HOST  2> /dev/null && docker rm $DB_HOST 2> /dev/null
    docker run -d \
        --name=$DB_HOST \
        --net=$DOCKER_NETWORK_NAME \
        -e MYSQL_ROOT_PASSWORD=$DB_USER \
        -e MYSQL_USER=$DB_USER \
        -e MYSQL_PASSWORD=$DB_PASSWORD \
        -e MYSQL_DATABASE=$DB_PORTAL_DB_NAME \
        -v "MYSQL_DATA_DIR:/var/lib/mysql/" \
        -v "/tmp/cgds.sql:/docker-entrypoint-initdb.d/cgds.sql:ro" \
        -v "/tmp/seed.sql.gz:/docker-entrypoint-initdb.d/seed_part1.sql.gz:ro" \
        mysql:5.7

    sleeptime=0
    maxtime=180
    while ! docker run --rm --net=$DOCKER_NETWORK_NAME mysql:5.7 mysqladmin ping -u $DB_USER -p$DB_PASSWORD -h$DB_HOST --silent; do
        echo Waiting for cbioportal database to initialize...
        sleeptime=$sleeptime+10
        if (($sleeptime > $maxtime)); then 
            echo Timeout reached. Terminating test!
            exit 1
        fi
        sleep 10
    done

    # migrate database schema to most recent version
    echo Migrating database schema to most recent version ...
    docker run --rm \
        --net=$DOCKER_NETWORK_NAME \
        -v "$TEST_HOME/local_database/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
        cbioportal-endtoend-image \
        python3 /cbioportal/core/src/main/scripts/migrate_db.py -y -p /cbioportal/portal.properties -s /cbioportal/db-scripts/src/main/resources/migration.sql
}

build_cbioportal_image() {

    curdir=$PWD
    
    cd /tmp
    rm -rf cbioportal
    git clone --depth 1 -b $BACKEND_BRANCH_NAME "https://github.com/$BACKEND_ORGANIZATION/cbioportal.git"
    docker stop $E2E_CBIOPORTAL_HOST_NAME 2> /dev/null && docker rm $E2E_CBIOPORTAL_HOST_NAME  2> /dev/null
    cp $TEST_HOME/local_database/docker/Dockerfile cbioportal
    cp $TEST_HOME/local_database/runtime-config/portal.properties cbioportal
    cd cbioportal
    # docker build -f Dockerfile.local -t cbioportal-backend-endtoend .
    docker rm cbioportal-endtoend-image 2> /dev/null || true
    cp $TEST_HOME/local_database/docker/catalina_server.xml.patch .
    docker build -f Dockerfile -t cbioportal-endtoend-image . \
        --build-arg MAVEN_OPTS="-Dfrontend.version=$FRONTEND_COMMIT_HASH -Dfrontend.groupId=$FRONTEND_GROUPID" \
        --build-arg SESSION_SERVICE_HOST_NAME=$SESSION_SERVICE_HOST_NAME

    cd $curdir
}

run_cbioportal_container() {

    # start cbioportal
    docker run -d --restart=always \
        --name=$E2E_CBIOPORTAL_HOST_NAME \
        --net=$DOCKER_NETWORK_NAME \
        -v "$TEST_HOME/local_database/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
        -e CATALINA_OPTS='-Xms2g -Xmx4g' \
        cbioportal-endtoend-image
    
    sleeptime=0
    maxtime=180
    while ! docker run --rm --net=$DOCKER_NETWORK_NAME cbioportal-endtoend-image ping -c 1 "$E2E_CBIOPORTAL_HOST_NAME" &> /dev/null; do
        echo Waiting for cbioportal to initialize...
        sleeptime=$sleeptime+10
        if (($sleeptime > $maxtime)); then 
            echo Timeout reached. Terminating test!
            exit 1
        fi
        sleep 10
    done

}

load_studies_in_db() {

    for DIR in $TEST_HOME/local_database/studies/*/; do
        docker run --rm \
            --name=cbioportal-importer \
            --net=$DOCKER_NETWORK_NAME \
            -v "$TEST_HOME/local_database/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
            -v "$DIR:/study:ro" \
            cbioportal-endtoend-image \
            python3 /cbioportal/core/src/main/scripts/importer/metaImport.py \
            --url_server "http://$E2E_CBIOPORTAL_HOST_NAME:8080/cbioportal" \
            --study_directory /study \
            --override_warning
    done

}

check_jitpack_download_frontend() {
    # check whether jitpack versions for the frontend exist
    # url="https://jitpack.io/com/github/$FRONTEND_ORGANIZATION/cbioportal-frontend/$FRONTEND_COMMIT_HASH/cbioportal-frontend-$FRONTEND_COMMIT_HASH.jar"
    # # trigger build
    # curl -s --head $url | head -n 0
    # FRONTEND_COMMIT_HASH_SHORT=$(echo $FRONTEND_COMMIT_HASH | awk '{print substr($0,0,10)}')
    url_short="https://jitpack.io/com/github/$FRONTEND_ORGANIZATION/cbioportal-frontend/$FRONTEND_COMMIT_HASH/cbioportal-frontend-$FRONTEND_COMMIT_HASH.jar"
    sleeptime=0
    maxtime=1200
    while (($sleeptime < $maxtime)); do
        if !(curl -s --head $url_short | head -n 1 | egrep "HTTP/[0-9.]+ 200"); then
            echo Waiting for jitpack to build the frontend package...
            sleep 10
            sleeptime=$sleeptime+10
        else
            sleeptime=maxtime+1
        fi
    done

    if !(curl -s --head $url_short | head -n 1 | egrep "HTTP/[0-9.]+ 200"); then
        echo "Could not find frontend .jar (version: $FRONTEND_COMMIT_HASH, org: $FRONTEND_ORGANIZATION) at jitpack (url: $url_short)"
        exit 1
    fi
}

download_db_seed() {
    # download db schema and seed data
    curdir=$PWD
    cd /tmp
    curl $DB_CGDS_URL > cgds.sql
    curl $DB_SEED_URL > seed.sql.gz
    cd $curdir
}

run_session_service() {
    docker stop mongoDB && docker rm mongoDB
    docker run -d --name=mongoDB --net=$DOCKER_NETWORK_NAME \
        -e MONGO_INITDB_DATABASE=session_service \
        mongo:4.0

    docker stop cbio-session-service && docker rm cbio-session-service
    docker run -d --name=cbio-session-service --net=$DOCKER_NETWORK_NAME -p 8084:8080 \
        -e JAVA_OPTS="-Dspring.data.mongodb.uri=mongodb://mongoDB:27017/session-service" \
        thehyve/cbioportal-session-service:cbiov2.1.0
}

echo Wait for JitPack download of frontend code 
check_jitpack_download_frontend

echo Build portal image
build_cbioportal_image

echo Run database container, import seed and migrate schema
run_database_container

echo Start session service
run_session_service

echo Run cbioportal container
run_cbioportal_container

echo Load studies into local database
load_studies_in_db

exit 0