'use strict';

angular.module('schedApp')
  .directive('appointmentCard', function (colorHelper) {
    return {
      templateUrl: 'views/appointment-card.html',
      restrict: 'E',
      scope: {
        appt: '=',
        disabled: '=',
        onCancelAppt: '&',
        coachName: '='
      },
      replace: true,
      link: function postLink(scope, element) {

        scope.moment = moment(scope.appt.startDate);
        
        //Convert the appointment hour to a percentage from morning to evening (0 to 1)
        var hr = scope.moment.hour();
        var hourPct = (hr - 7) / 7;

        //Colors used - Hard coded, but could be exposed to the directive.
        var morningGradient = [215, 247, 251];
        var afternoonGradient = [239, 217, 196];
        var morningHeaderColor = [127, 127, 229];
        var afternoonHeaderColor = [61, 61, 147];

        //Set the gradient color based on the time.
        var gradientColor = colorHelper.colorScale(hourPct, morningGradient, afternoonGradient);
        colorHelper.setGradient(element, gradientColor);

        //Set the header color based on the time.
        var header = element.find('.ac-header');
        var headerColor = colorHelper.colorScale(hourPct, morningHeaderColor, afternoonHeaderColor);
        header.css('background-color', headerColor);
      }
    };
  });
