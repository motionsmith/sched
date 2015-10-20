'use strict';

angular.module('schedApp')
  .controller('MainCtrl', function ($scope, coachAvailability, myAppointments, $window, availabilityHelper) {
    var moment = $window.moment;
    availabilityHelper.initialize(coachAvailability.data.result);
    $scope.soonestAppointments = availabilityHelper.filterSoonest(3);
  });
