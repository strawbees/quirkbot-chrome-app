define(
[
	'happy/utils/Network',
	'Promise'
],
function (
	Network,
	Promise
){
	"use strict";

	var network = new Network();

	var Definitions = function(){
		var
		self = this,
		data = {};

		
		var load = function (url) {
			return new Promise(function(resolve, reject){
				loadJson(url)
				.then(function(index) {
					return loadInternal(index)
				})
				.then(function(definitions) {
					data = definitions;
					resolve(definitions)
				})
				.catch(function (error) {
					reject(error);
				})
			});
		}		

		var loadInternal = function (index) {
			var promises = [];
			for(var type in index){
				(function (type) {
					var promise = new Promise(function(resolve, reject){
						loadJson(index[type])
						.then(function (definition) {
							definition.type = type;
							index[type] = definition;
							resolve(definition);
						})
						.catch(function (error) {
							reject(error);
						})
					})
					promises.push(promise)
				})(type)
			}
			return new Promise(function(resolve, reject){
				Promise.all(promises)
				.then(function(){
					resolve(index);
				})
				.catch(function(error){
					reject(error);
				});
			});
		}


		var loadJson = function(url){

			return new Promise(function(resolve, reject){
				network.ajax({
					url: url,
					onSuccess: function(request){
						resolve(JSON.parse(request.responseText));
					},
					onError: reject
				})
			})
		}

		var getData = function(){
			return data;
		}

		Object.defineProperty(self, 'data', {
			get: getData
		});
		Object.defineProperty(self, 'load', {
			value: load
		});

	}

	var definitions = new Definitions();

	return definitions;
});