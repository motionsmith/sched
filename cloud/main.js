var moment = require('cloud/moment');
var _ = require('underscore');

var Appointment = Parse.Object.extend('appointment');
var User = Parse.Object.extend('_User');
var Coach = Parse.Object.extend('coach');

/*
Cuts off the minutes, seconds, and milliseconds, so the times are on the hour.
*/

/*
Makes an appointment between the user who makes the query and the user's coach.
request = {
	date: dateObject
};
@param: (date) Minutes/seconds get zeroed off (or not used).
Date should be converted to UTC on client.
Hour is validated to be both available to the coach and within the coach's operating hours.
*/
Parse.Cloud.beforeSave('appointment', function (request, response) {
	var appointment = request.object;
	var startDT = moment.utc(appointment.get('startDate')).startOf('hour');
	var endDT = startDT.clone().endOf('hour');

	//If a client property is specified, this is a post from the MT,
	//just ignore validation.
	var client = appointment.get('client');
	if (client) {
		response.success();
		return;
	}

	//In order for the time to be valid, it must:
	//1. Be the user's only appointment that month.
	var onlyApptQuery = new Parse.Query(Appointment);
	onlyApptQuery.equalTo('client', request.user);
	onlyApptQuery.greaterThan('startDate', startDT.clone().startOf('month').toDate());
	onlyApptQuery.lessThan('startDate', endDT.clone().endOf('month').toDate());

	//2. Not conflict with another appointment.
	var conflictingApptsQuery = new Parse.Query(Appointment);
	conflictingApptsQuery.equalTo('coach', request.user.get('coach'));
	conflictingApptsQuery.equalTo('startDate', startDT.toDate());

	var validApptQuery = Parse.Query.or(onlyApptQuery, conflictingApptsQuery);
	validApptQuery.find()
	.then(function (results) {
		if (results.length === 0) {
			//3. Be within the coach's work hours.
			return new Parse.Query(Coach).find(request.user.get('coach').id);
		} else {
			return Parse.Promise.error('That time is not available for this user.');
		}
	})
	.then(function (coach) {
		var coachWorkHours = coach[0].get('workHours');
		var apptHour = startDT.day()* 24 + startDT.hours();
		if (coachWorkHours.indexOf(apptHour) !== -1) {
			appointment.set('client', request.user);
			appointment.set('coach', request.user.get('coach'));
			appointment.set('startDate', startDT.toDate());
			appointment.set('endDate', endDT.toDate());
			response.success();
		} else {
			response.error('Cannot create appointment: Time is not during the coach\'s work hours.');
		}
	}, function (error) {
		response.error(error);
	});
});

/*
Response looks like this:
{
	result: { //Displays granular time availability between the dates requested
		'2015-10-27': [15, 16, 18, 21, 23],
		'2015-10-28': [16]
	}
}
*/
Parse.Cloud.define('getCoachAvailability', function (request, response) {
	var fromDT = request.params.from ? moment.utc(request.params.from) : moment.utc();
	var toDT = request.params.to ? moment.utc(request.params.to) : null;
	var coachAppointments;
	var userAppointments;

	//Get info about this user.
	var queryUser = new Parse.Query(User);
	queryUser.include('coach');
	queryUser.get(request.user.id).then(function (results) {
		request.user = results;

		//Get all the user's coach's appointments.
		var coachAppointmentsQuery = new Parse.Query(Appointment);
		coachAppointmentsQuery.select('startDate', 'endDate');
		coachAppointmentsQuery.equalTo('coach', request.user.get('coach'));
		coachAppointmentsQuery.greaterThan('endDate', fromDT.toDate());
		coachAppointmentsQuery.limit(1000);
		coachAppointmentsQuery.ascending('startDate')
		if (toDT) {
			coachAppointmentsQuery.lessThan('startDate', toDT.toDate());
		}
		return coachAppointmentsQuery.find();
	})
	.then(function (results) {
		coachAppointments = results;

		var userAppointmentsQuery = new Parse.Query(Appointment);
		userAppointmentsQuery.equalTo('client', request.user);
		return userAppointmentsQuery.find();
	})
	.then(function (results) {
		userAppointments = results;
		
		//Format the coach's availability
		response.success(getCoachAvailability(
			fromDT,
			toDT,
			request.user.get('coach').get('workHours'),
			coachAppointments,
			userAppointments));
	}, function (error) {
		response.error('A problem occurred while getting the coach\'s availability.');
	});
});

/*
Given the required parameters, responds with the dates/times that the coach is available.
See the endpoint documentation for 'getCoachAvailability' for the precise response format.

@param (workWeekHours) An array represent.ing the general "business hours" that the coach works,
each number representing a unique hour of that week.
@param (coachApopintments) These are the appointments that the coach has, directly from the DB.
*/
function getCoachAvailability(fromDT, toDT, workWeekHours, coachAppointments, userAppointments, limit) {
	if (!toDT) {
		toDT = fromDT.clone().add(1, 'months');

		if (!limit) {
			limit = 50;
		}
	}

	function isOutsideWorkHours(dt, workWeekHours) {
		var proposedWeekHour = dt.days() * 24 + dt.hours();
		return workWeekHours.indexOf(proposedWeekHour) === -1;
	}

	function isDuringCoachAppointment(dt, coachAppointments) {
		for (var i = coachAppointments.length - 1; i >= 0; i--) {
			var appt = coachAppointments[i];
			var apptStartDT = moment.utc(appt.get('startDate'));
			var apptEndDT = moment.utc(appt.get('endDate'));

			if (apptStartDT.isBefore(dt)) {
				coachAppointments.splice(i, 1);
			}

			if ((dt.isSame(apptStartDT) || dt.isAfter(apptStartDT)) && dt.isBefore(apptEndDT)) {
				return true;
			}
		}
		return false;
	}

	function doesUserAlreadyHaveAppointment(dt, userAppointments) {
		for (var i = 0; i < userAppointments.length; i++) {
			var appt = userAppointments[i];
			var apptStartDT = moment.utc(appt.get('startDate'));
			if (dt.month() === apptStartDT.month()) {
				return true;
			}
		}
		return false;
	}

	var lowerLimit = 18;
	var availability  = {};
	var numAvailabilities = 0;
	for (var proposedDT = fromDT.clone().startOf('hour'); (proposedDT.isBefore(toDT) && numAvailabilities < limit) || numAvailabilities < lowerLimit; proposedDT.add(1, 'h')) {
		//First, in order for a time to be available, it must not be outside of work hours
		if (isOutsideWorkHours(proposedDT, workWeekHours)) {
			continue;
		}

		//Second, it must not be during another appointment.
		if (isDuringCoachAppointment(proposedDT, coachAppointments)) {
			continue;
		}

		if (doesUserAlreadyHaveAppointment(proposedDT, userAppointments)) {
			continue;
		}

		var date = proposedDT.format('YYYY-MM-DD');
		if (availability.hasOwnProperty(date) === false) {
			availability[date] = [];
		}

		availability[date].push(proposedDT.hours());
		numAvailabilities++;
	}

	return availability;
}

/* 
Makes the calendar look more realistically filled out.
Automatically schedules appointments, with higher frequency for dates closer to now.
*/
Parse.Cloud.define('fillSchedule', function(request, response) {
	Parse.Cloud.run('getCoachAvailability').then(function (result) {
		var apptsByDate = result;
		var apptsToBook = [];
		for (var dateStr in apptsByDate) {
			if (!apptsByDate.hasOwnProperty(dateStr)) {
				continue;
			}
			var apptsOfDay = apptsByDate[dateStr];
			apptsOfDay.forEach(function (hr) {
				var apptDT = moment(dateStr, 'YYYY-MM-DD').hours(hr);
				if (shouldBookSomething(apptDT)) {
					console.log('booking something at ' + apptDT.calendar());
					var apptEndDT = apptDT.clone().endOf('hour');
					var appt = new Appointment();
					appt.set('startDate', apptDT.toDate());
					appt.set('client', {'__type': 'Pointer', className: '_User', objectId: 'RgfVS4n3jZ'});
					appt.set('coach', {'__type': 'Pointer', className: 'coach', objectId: 'HWGQluAERq'});
					appt.set('endDate', apptEndDT.toDate());

					apptsToBook.push(appt);
				}
			});
		}

		return Parse.Object.saveAll(apptsToBook);
	})
	.then(function (result) {
		response.success();
	}, function (error) {
		response.error(error);
	});

	/*
	Given a time in hours from now, returns a probability of booking at that time (0-1).
	Probability (y) goes up in parabolic form as time goes forward. (x)
	*/
	function bookingProbability(x) {
		var a = 0.00000003;
		var b = 0.0000001;
		var c = 0.1;

		//Parabolic probability (ax^2 + bx + c)
		//0 < x < 4400 hours (6 months)
		//0 < y < 1 probability
		return Math.pow(a*x, 2) + b*x + c;
	}

	/* Returns (boolean) whether or not to create an appointment at the given time.
	Based on decreasing probability function from now. */
	function shouldBookSomething(dt) {
		var msFromNow = dt.diff(moment());
		var durationFromNow = moment.duration(msFromNow);
		var hrsFromNow = durationFromNow.asHours();
		var bookingProb = bookingProbability(hrsFromNow);
		var b = Math.random() > bookingProb;
		return b;
	}
})
