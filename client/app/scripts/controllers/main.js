'use strict';

angular.module('schedApp')
  .controller('MainCtrl', function ($q, $scope, coachAvailability, myAppointments, availabilityHelper, parseFunctions, parse, myCoach) {

    /* Attempts to make an appointment at the given moment */
    $scope.makeAppointment = function (dt) {
      $scope.refreshingData = true;
      parseFunctions.makeAppointment(dt).then(function () {
        refreshData().then(function() {
          $scope.tab = 1;
        });
      }, function (result) {
        console.log('There was a problem scheduling the appointment. ' + result.data.error);
      });
    };

    /* Attempts to cancel the given appointment. */
    $scope.cancelAppointment = function (appt) {
      $scope.refreshingData = true;
      parseFunctions.cancelAppointment(appt.objectId).then(refreshData);
    };

    /* Make more availability cards visible in the given category. */
    $scope.seeMore = function (avails) {
      if (avails === $scope.availsAsap) {
        $scope.asapLimit += 6;
      } else if (avails === $scope.availsMornings) {
        $scope.morningsLimit += 6;
      } else if (avails === $scope.availsAfternoons) {
        $scope.afternoonsLimit += 6;
      } else if (avails === $scope.availsLater) {
        $scope.laterLimit += 6;
      }
    };

    /* Gets all available appointment slots and the user's appointments. */
    function refreshData() {
      $scope.refreshingData = true;
      var refreshPromises = [];
      refreshPromises.push(parseFunctions.getMyAppointments());
      refreshPromises.push(parseFunctions.getCoachAvailability());

      //Send both requests off at the same time. Callback after both return.
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
        $scope.refreshingData = false;
      });

      return all;
    }

    /* Transforms the availability data into a format that is ideal for the UI. */
    function processAvailabilities() {
      availabilityHelper.initialize(coachAvailability.data.result);
      $scope.availsAsap = availabilityHelper.filterSoonest();
      $scope.availsMornings = availabilityHelper.filterMornings();
      $scope.availsAfternoons = availabilityHelper.filterAfternoons();
      $scope.availsLater = availabilityHelper.filterLater();
      $scope.numResults = availabilityHelper.numResults;
    }

    /* Makes the appointments data available to the UI */
    function processAppointments() {
      $scope.myAppts = myAppointments.data.results;
    }

    /*
    KICK THINGS OFF
    */
    $scope.coachName = myCoach.data.firstName + ' ' + myCoach.data.lastName;
    $scope.asapLimit = 3;
    $scope.morningsLimit = 3;
    $scope.afternoonsLimit = 3;
    $scope.laterLimit = 3;

    processAvailabilities();
    processAppointments();
  });
