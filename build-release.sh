rm quirkbot.zip
zip -vr quirkbot.zip \
_locales/ \
icons/ \
manifest.json \
src \
-x "*.DS_Store" \
"*/node_modules/*" \
"*npm-debug.log"
