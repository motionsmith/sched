'use strict';

/* Filters that print moment objects into formats for the UI */
angular.module('schedApp')
  .filter('cardDate', function () {
    return function (input) {
    	return input.format('MMM D');
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
  })
  .filter('cardTimeToNow', function () {
    return function (input) {
      return input.fromNow();
    };
  });