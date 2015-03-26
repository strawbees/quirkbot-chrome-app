// Heartbeat to keep the app alive ---------------------------------------------
chrome.runtime.onMessage.addListener(function(){});
setInterval(function (argument) {
	chrome.runtime.sendMessage(chrome.runtime.id, '', function () {});
}, 5000)