'use strict';

angular.module('schedApp')
  .service('parseFunctions', function ($http, parse, $window) {
    var moment = $window.moment;

    var getCoachAvailability = function (fromDT, toDT) {
      return $http({
        method: 'POST',
        url: parse.apiUrl + 'functions/getCoachAvailability',
        data: {
          from: fromDT.utc().format(),
          to: toDT.utc().format()
        },
        headers: parse.getUserHeaders(),
        transformResponse: function(response) {
          response = JSON.parse(response);

          //Transform the response data into local time.
          if (response.result) {
            var newResponse = {
              result: {}
            };
            for (var key in response.result) {
              var availableHours = response.result[key];
              for (var i = 0; i < availableHours.length; i++) {
                var availableDT = moment.utc(key, 'YYYY-MM-DD').hours(availableHours[i]).local();
                var newKey = availableDT.format('YYYY-MM-DD');
                if (newResponse.result.hasOwnProperty(newKey)=== false) {
                  newResponse.result[newKey] = [];
                }
                newResponse.result[newKey].push(availableDT.hours());
              }
            }

            return newResponse;
          } else {
            return response;
          }
        }
      });
    };

    var getMyAppointments = function () {
      return $http({
        method: 'GET',
        url: parse.apiUrl + 'classes/appointment',
        params: {
          where: {client: parse.pointerFor(parse.user)}
        },
        headers: parse.getUserHeaders(),
        transformResponse: function (response) {
          response = JSON.parse(response);

          if (response.results) {
            for (var i = 0; i < response.results.length; i++) {
              var appt = response.results[i];
              appt.startDate = moment.utc(appt.startDate.iso).local().format();
              appt.endDate = moment.utc(appt.endDate.iso).local().format();
            }
          }
          
          return response;
        }
      });
    };

    return {
      getCoachAvailability: getCoachAvailability,
      getMyAppointments: getMyAppointments
    };
  });
