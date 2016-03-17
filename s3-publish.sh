sh "build-release.sh"

rm -r s3_publish
mkdir s3_publish

cp "quirkbot.zip" "s3_publish/quirkbot-chrome-app.zip"
aws s3 sync s3_publish s3://code.quirkbot.com/downloads --exclude *.DS_Store

aws s3 sync s3_publish s3://code.quirkbot.com/install/chrome --delete --exclude *.DS_Store
