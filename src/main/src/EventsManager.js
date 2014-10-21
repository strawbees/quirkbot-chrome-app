define(
[
],
function (
){
	"use strict";

	var EventsManager = function(){
		var self = this,
		stack = [];

		var add = function(object, fnc, priority){
			create('add', 'remove', object, null, fnc, priority);
		}
		var addEventListener = function(object, e, fnc){
			create('addEventListener', 'removeEventListener', object, e, fnc);
		}
		var create = function(addSyntax, removeSyntax, object, e, fnc, priority){
			var ref = {
				add : addSyntax,
				remove: removeSyntax,
				object : object,
				e: e,
				fnc: fnc
			}
			if(typeof priority === 'undefined') priority = 0;
			stack.push(ref);
			if(e){
				ref.object[ref.add](ref.e, ref.fnc);
			}
			else {
				ref.object[ref.add](ref.fnc, this, priority);
			}
			
		}
		var destroy = function(){
			stack.forEach(function(ref){
				if(ref.e)
					ref.object[ref.remove](ref.e, ref.fnc);
				else
					ref.object[ref.remove](ref.fnc);
			});
			stack = [];
		}

		Object.defineProperty(self, 'add', {
			value: add
		});
		Object.defineProperty(self, 'addEventListener', {
			value: addEventListener
		});

		Object.defineProperty(self, 'destroy', {
			value: destroy
		});

	}

	return EventsManager;
});