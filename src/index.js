if (typeof window !== 'undefined'
	&& typeof window.chrome !== 'undefined'
	&& typeof window.chrome.serial !== 'undefined') {
	require('./src/libs/chrome-arduino')
	require('./src/libs/ChromeExternalAPIServer')
	require('./src/Utils')
	require('./src/serial')
	require('./src/HexUploader')
	require('./src/Quirkbot')
	require('./src/main')
}

let module
if (typeof window.__quirkbotChromeApp !== 'undefined') {
	module = window.__quirkbotChromeApp
}

module.exports = module
