if (typeof window !== 'undefined'
	&& typeof window.chrome !== 'undefined'
	&& typeof window.chrome.serial !== 'undefined') {
	require('./libs/chrome-arduino')
	require('./libs/ChromeExternalAPIServer')
	require('./Utils')
	require('./serial')
	require('./HexUploader')
	require('./Quirkbot')
	require('./main')
}

if (typeof window.__quirkbotChromeApp !== 'undefined') {
	module.exports = window.__quirkbotChromeApp
}
