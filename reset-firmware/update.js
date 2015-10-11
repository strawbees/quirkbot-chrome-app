"use strict";

var COMPILER_URL = 'http://quirkbot-compiler.herokuapp.com';

var request = require('request-promise');
var utils = require('./utils');

var pass = utils.pass;
var readFile = utils.readFile;


var newHex;
var oldHex;
request(COMPILER_URL+'/cfirmware-reset')
.then(function (data) {
	data = JSON.parse(data);
	newHex = data.value;
	if(!newHex){
		throw new Error('Hex is empty')
	}
})
.then(utils.readFile('firmware.hex'))
.then(function (hex) {
	oldHex = hex;
})
.then(function(){
	return utils.writeFile('firmware.hex', newHex)();
})
.then(function(){
	return utils.writeFile('firmware.js', "var RESET_FIRMWARE='" + newHex.replace(/(?:\r\n|\r|\n)/g, '\\n')+ "';")();
})
.then(function () {
	console.log('Firmware was updated sucessfuly!');
	if(oldHex === newHex){
		console.log('(But there was no change in the firmware)');
	}
})
.catch(function (error) {
	console.log(error)
	console.log('Firmeware update canceled.')
})
