#!/usr/bin/python3

import sys
import json
import requests
import re

issue_number=sys.argv[1]

url = "https://api.github.com/repos/cBioPortal/cbioportal-frontend/pulls/"+issue_number

myResponse = requests.get(url)

# For successful API call, response code will be 200 (OK)
if(myResponse.ok):

    jData = json.loads(myResponse.content)

    frontend_branch_name = jData['head']['ref']
    frontend_commit_hash = jData['head']['sha']
    frontend_organization = jData['head']['repo']['full_name'].split("/")[0].lower()
    frontend_repo_name = jData['head']['repo']['name']

    frontend_base_branch_name = jData['base']['ref']
    frontend_base_commit_hash = jData['base']['sha']
    frontend_base_organization = jData['base']['repo']['full_name'].split("/")[0].lower()
    frontend_base_repo_name = jData['base']['repo']['name']

    backend_organization = ""
    backend_branch_name = ""
    pr_match = re.search(r"BACKEND_BRANCH=([^\s]+):([^\s]+)", jData['body'])
    if pr_match is not None :
        backend_organization = pr_match.group(1).lower()
        backend_branch_name = pr_match.group(2)

    print(
      "export FRONTEND_BRANCH_NAME="+ frontend_branch_name + "\n"
      "export FRONTEND_COMMIT_HASH="+ frontend_commit_hash + "\n"
      "export FRONTEND_ORGANIZATION="+ frontend_organization + "\n"
      "export FRONTEND_REPO_NAME="+ frontend_repo_name + "\n"
      "export FRONTEND_BASE_BRANCH_NAME="+ frontend_base_branch_name + "\n"
      "export FRONTEND_BASE_COMMIT_HASH="+ frontend_base_commit_hash + "\n"
      "export FRONTEND_BASE_ORGANIZATION="+ frontend_base_organization + "\n"
      "export FRONTEND_BASE_REPO_NAME="+ frontend_base_repo_name + "\n"
      "export BACKEND_ORGANIZATION="+ backend_organization + "\n"
      "export BACKEND_BRANCH_NAME="+ backend_branch_name)

else:
  # If response code is not ok (200), print the resulting http error code with description
    myResponse.raise_for_status()