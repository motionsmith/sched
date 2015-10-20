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
Parse.Cloud.define('makeAppointment', function (request, response) {
	var startDate = moment.utc(request.params.date).startOf('hour');

	var endDate = startDate.clone();
	endDate.endOf('hour');

	//Get info about this user.
	var queryUser = new Parse.Query(User);
	queryUser.include('coach');
	queryUser.get(request.user.id).then(function (result) {
		request.user = result;

		//TODO Validate that we didn't schedule on coach's day off.
		//TODO Validate that we didn't schedule outside of coach's business hours.
		//TODO Validate that we didn't schedule during a conflicting appointment.

		new Appointment().save({
			client: request.user,
			coach: request.user.get('coach'),
			startDate: startDate.toDate(),
			endDate: endDate.toDate()
		});
	}).then (function (result) {
		response.success(1);
	}, function (error) {
		response.error('A problem occured while creating an appointment.');
	});
});

/*
Gets a list of appointments that the user's coach has between the given dates.
request = {
	from: dateObject,
	to: dateObject
};
@param: (from, to) - The datetime range to request the availability between
of the coach.
*/
/*Parse.Cloud.define('getCoachAppointments', function (request, response) {
	var fromDT = request.params.from ? moment.utc(request.params.from) : null;
	var toDT = request.params.to ? moment.utc(request.params.to) : null;

	//Get info about this user.
	var queryUser = new Parse.Query(User);
	queryUser.include('coach');
	queryUser.get(request.user.id).then(function (results) {
		request.user = results;

		//Get all the user's coach's appointments.
		var coachAppointmentsQuery = new Parse.Query(Appointment);
		coachAppointmentsQuery.select('startDate', 'endDate');
		coachAppointmentsQuery.equalTo('coach', request.user.get('coach'));
		if (fromDT) {
			coachAppointmentsQuery.greaterThan('endDate', fromDT.toDate());
		}
		if (toDT) {
			coachAppointmentsQuery.lessThan('startDate', toDT.toDate());
		}
		return coachAppointmentsQuery.find();
	}).then(function (results) {
		response.success(results);
	}, function (error) {
		response.error('A problem occurred while getting the coach\'s appointments.');
	});
});*/

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
	console.log("From DT: " + fromDT.format());
	var toDT = request.params.to ? moment.utc(request.params.to) : moment.utc().add(1, 'M');

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
		coachAppointmentsQuery.lessThan('startDate', toDT.toDate());
		return coachAppointmentsQuery.find();
	}).then(function (results) {
		//Format the coach's availability
		response.success(getCoachAvailability(
			fromDT,
			toDT,
			request.user.get('coach').get('workHours'),
			results));
	}, function (error) {
		response.error('A problem occurred while getting the coach\'s availability.');
	});
});

/*
Given the required parameters, responds with the dates/times that the coach is available.
See the endpoint documentation for 'getCoachAvailability' for the precise response format.

@param (workWeekHours) An array represent.ing the general "business hours" that the coach works,
each number representing a unique hour of that week.
@param (appointments) These are the appointments that the coach has, directly from the DB.
*/
function getCoachAvailability(fromDT, toDT, workWeekHours, appointments) {
	function isOutsideWorkHours(dt, workWeekHours) {
		var proposedWeekHour = dt.days() * 24 + dt.hours();
		return workWeekHours.indexOf(proposedWeekHour) === -1;
	}

	function isDuringAppointment(dt, appointments) {
		for (var i = 0; i < appointments.length; i++) {
			var appt = appointments[i];
			var apptStartDT = moment.utc(appt.get('startDate'));
			var apptEndDT = moment.utc(appt.get('endDate'));

			if ((dt.isSame(apptStartDT) || dt.isAfter(apptStartDT)) && dt.isBefore(apptEndDT)) {
				return true;
			}
		}
		return false;
	}

	var availability  = {};
	for (var proposedDT = fromDT.clone().startOf('hour'); proposedDT.isBefore(toDT); proposedDT.add(1, 'h')) {
		//First, in order for a time to be available, it must not be outside of work hours
		if (isOutsideWorkHours(proposedDT, workWeekHours)) {
			continue;
		}

		//Second, it must not be during another appointment.
		if (isDuringAppointment(proposedDT, appointments)) {
			continue;
		}

		var date = proposedDT.format('YYYY-MM-DD');
		if (availability.hasOwnProperty(date) === false) {
			availability[date] = [];
		}
		availability[date].push(proposedDT.hours());
	}

	return availability;
}