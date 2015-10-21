'use strict';

angular.module('schedApp')
  .controller('MainCtrl', function ($q, $scope, coachAvailability, myAppointments, $window, availabilityHelper, parseFunctions, parse, myCoach) {
    $scope.makeAppointment = function (dt) {
      console.log('make appointment for ' + dt.calendar());
      parseFunctions.makeAppointment(dt).then(function () {
        refreshData().then(function() {
          $scope.tab = 1;
        });
      }, function (result) {
        console.log('There was a problem scheduling the appointment. ' + result.data.error);
      });
    };

    $scope.printAppointment = function (appt) {
      return moment(appt.startDate).format();
    };

    $scope.cancelAppointment = function (appt) {
      parseFunctions.cancelAppointment(appt.objectId).then(refreshData);
    };

    function refreshData() {
      $scope.refreshingData = true;
      var refreshPromises = [];
      refreshPromises.push(parseFunctions.getMyAppointments());
      refreshPromises.push(parseFunctions.getCoachAvailability());

      var all = $q.all(refreshPromises);
      all.then(function(responses) {
        $scope.refreshingData = false;
        myAppointments = responses[0];
        coachAvailability = responses[1];
        processAvailabilities();
        processAppointments();
      }, function (error) {
        $scope.refreshingData = false;
        console.log('There was a problem refreshing the data: ' + error);
      });

      return all;
    }

    function processAvailabilities() {
      availabilityHelper.initialize(coachAvailability.data.result);
      $scope.availsAsap = availabilityHelper.filterSoonest(3);
      $scope.availsMornings = availabilityHelper.filterMornings(3);
      $scope.availsAfternoons = availabilityHelper.filterAfternoons(3);
      $scope.availsLater = availabilityHelper.filterLater(3);
    }

    function processAppointments() {
      $scope.myAppts = myAppointments.data.results;
    }

    var moment = $window.moment;

    processAvailabilities();
    processAppointments();

    $scope.coachName = myCoach.data.firstName + ' ' + myCoach.data.lastName;
  });
