#!/bin/bash

# Install AWS CLI
curl "https://bootstrap.pypa.io/get-pip.py" -o "get-pip.py"
python get-pip.py
pip install awscli --ignore-installed six

# Zip up everything with the exception of node_modules (including dist)
ts=`date +%s`
fn="$EB_APP_NAME-$ts.zip"
find ./app/ -path '*/node_modules/*' -prune -o -path '*/\.git*' -prune -o -type f -print | zip $fn -@
S3_KEY="$S3_KEY/$fn"
# Copy the app to S3
aws s3 cp $fn "s3://$S3_BUCKET/$S3_KEY"

# Create a new version in eb
echo "Creating ElasticBeanstalk Application Version ..."
aws elasticbeanstalk create-application-version \
  --application-name $EB_APP_NAME \
  --version-label "$EB_APP_NAME-$ts" \
  --description "$EB_APP_NAME-$ts" \
  --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" --auto-create-application

# Update to that version
echo "Updating ElasticBeanstalk Application Version ..."
aws elasticbeanstalk update-environment \
  --application-name $EB_APP_NAME \
  --environment-name $EB_APP_ENV \
  --version-label "$EB_APP_NAME-$ts"

echo "Done! Deployed version $EB_APP_NAME-$ts"
