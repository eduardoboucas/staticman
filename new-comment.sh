#!/bin/bash
while [[ $# > 1 ]]
do
key="$1"

case $key in
    -c|--config)
    CONFIG_FILE="$2"
    shift
    ;;
    -p|--post)
    POST_SLUG="$2"
    shift
    ;;
    -n|--name)
    NAME="$2"
    shift
    ;;
    -d|--date)
    DATE="$2"
    shift
    ;;    
    -h|--hash)
    EMAIL_HASH="$2"
    shift
    ;;
    -u|--url)
    URL="$2"
    shift
    ;;        
    -m|--message)
    MESSAGE="$2"
    shift
    ;;
    -r|--repo)
    REPO="$2"
    shift
    ;;
    -c|--commit-message)
    COMMIT_MESSAGE="$2"
    shift
    ;;
    --default)
    DEFAULT=YES
    shift
    ;;
    *)
    ;;
esac
shift
done

# Read config file
source ${CONFIG_FILE}

FILE="name: \"${NAME}\"\ndate: \"${DATE}\"\nhash: ${EMAIL_HASH}\n"

if [ ! -z "$URL" ]; then
    FILE=${FILE}"url: \"${URL}\"\n"
fi

FILE=${FILE}"message: \"${MESSAGE}\"\n"

# Change directory to repo
cd ${GIT_REPO}

# Form comment file directory
COMMENTS_DIR=${COMMENTS_DIR_FORMAT//@post-slug/$POST_SLUG}

# Create directory if does not exist
if [ ! -d "$COMMENTS_DIR" ]; then
  mkdir -p ${COMMENTS_DIR}
fi

COMMENT_TIMESTAMP=`date +%Y%m%d%H%M%S`
COMMENT_FILE=${COMMENTS_FILE_FORMAT//@timestamp/$COMMENT_TIMESTAMP}
COMMENT_FILE=${COMMENTS_DIR}/${COMMENT_FILE//@hash/$EMAIL_HASH}

# Abort if file already exists
if [ -f $COMMENT_FILE ]; then
    exit 0
fi

# Create file
printf "$FILE" > $COMMENT_FILE

# Prepare Git and commit file
GIT_ORIGIN="https://${GIT_USERNAME}:${GIT_TOKEN}@github.com/${GIT_REPO_REMOTE}"

git config user.name ${GIT_USER}
git config user.email ${GIT_EMAIL}
git pull ${GIT_ORIGIN} master
git add ${COMMENT_FILE}
git commit -m "${COMMIT_MESSAGE}"
git push --quiet ${GIT_ORIGIN} master > /dev/null 2>&1
