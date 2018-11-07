if (typeof window !== 'undefined'
	&& typeof window.chrome !== 'undefined'
	&& typeof window.chrome.serial !== 'undefined') {
	require('./libs/chrome-arduino')
	require('./libs/ChromeExternalAPIServer')
	require('./Utils')
	require('./serial')
	require('./HexUploader')
	require('./QuirkbotChromeExtension')
	const quirkbotChromeExtension = new QuirkbotChromeExtension()
	module.exports = quirkbotChromeExtension
}
