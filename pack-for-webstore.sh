rm quirkbot.zip
zip -vr quirkbot.zip \
_locales/ \
icons/ \
manifest.json \
reset-firmware \
src \
-x "*.DS_Store" \
"*/node_modules/*" \
"*npm-debug.log"
