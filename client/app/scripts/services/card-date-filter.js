'use strict';

angular.module('schedApp')
  .filter('cardDate', function ($window) {
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
    }
  });