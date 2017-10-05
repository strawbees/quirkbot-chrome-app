# Quirkbot for Chrome


## Deploying Releases
To deploy to Amazon S3, please create the corresponding configuration
files in `/aws-config/[environment].json`.
For security, those files should not be included on the repository.

Examples:

#### `/aws-config/stage.json`

```
{
  "key": "YOUR_S3_KEY",
  "secret": "YOUR_S3_SECRET",
  "bucket": "code-stage.quirkbot.com",
  "region": "us-east-1"
}

```
#### `/aws-config/production.json`

```
{
  "key": "YOUR_S3_KEY",
  "secret": "YOUR_S3_SECRET",
  "bucket": "code.quirkbot.com",
  "region": "us-east-1"
}

```

Before deploying, please run the "Building Releases" instructions and make sure
everything works as desired. When you are ready to deploy:

- Update the version in `package.json`
- Run:
```
npm run gulp -- deploy --environment=stage
```
or
```
npm run gulp -- deploy --environment=production
```
- When you are completely satisfied with the deployed release, run:
```
npm publish
```
- Create a git tag.
- Make a manual [Github release](https://github.com/Quirkbot/QuirkbotArduinoLibrary/releases) and upload the generated _quirkbot-arduino-library-*.zip_.
- Upload _quirkbot-arduino-library-*.zip_ manually to the Chrome Webstore

## Publishing to NPM registry
**Do not call `npm publish` directly!** Use instead:
```
npm run custom_publish
```
It will call `npm shrinkwrap` and build the distributions in all the environments before publishing it to NPM.