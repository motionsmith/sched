'use strict';

angular
  .module('schedApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        resolve: {
          coachAvailability: function (parseFunctions, $window) {
            var moment = $window.moment;
            return parseFunctions.getCoachAvailability(moment(), moment().endOf('month'));
          },
          myAppointments: function (parseFunctions) {
            return parseFunctions.getMyAppointments();
          }
        }
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(function (parse) {
    parse.initialize().then(function () {
      console.log('All logged in to parse.');

    }, function () {
      console.log('Had a problem logging into Parse.');
    });
  });
