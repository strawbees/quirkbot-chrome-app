if (typeof window !== 'undefined'
	&& typeof window.chrome !== 'undefined'
	&& typeof window.chrome.serial !== 'undefined') {
	require('./libs/chrome-arduino')
	window.ChromeExternalAPIServer = require('./libs/ChromeExternalAPIServer')
	require('./Utils')
	require('./serial')
	window.HexUploader = require('./HexUploader')
	window.QuirkbotChromeExtension = require('./QuirkbotChromeExtension')
	require('./main')
	module.exports = window.__quirkbotChromeApp
}
