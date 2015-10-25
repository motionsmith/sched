'use strict';

angular.module('schedApp')
  .filter('cardDate', function ($window) {
  	var moment = $window.moment;
    return function (input) {
    	if (input.year() === moment().year()) {
    		return input.format('MMM D');
    	} else {
    		return input.format('MMM D YYYY');
    	}
    };
  })
  .filter('cardDay', function () {
  	return function (input) {
  		return input.format('ddd');
  	};
  })
  .filter('cardTime', function () {
  	return function (input) {
  		return input.format('h A');
  	};
  });
