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
          coachAvailability: function (parseFunctions) {
            return parseFunctions.getCoachAvailability();
          },
          myAppointments: function (parseFunctions) {
            return parseFunctions.getMyAppointments();
          },
          myCoach: function (parseFunctions) {
            return parseFunctions.getCoach();
          },
          loggedIn: function (parse) {
            return parse.loginPromise;
          }
        }
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
      parse.logOut();
    });
  });
