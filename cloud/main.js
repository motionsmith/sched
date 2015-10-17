var moment = require('cloud/moment');
var _ = require('underscore');

var Appointment = Parse.Object.extend('appointment');
var User = Parse.Object.extend('_User');
var Coach = Parse.Object.extend('coach');

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
	var startDate = moment.utc(request.params.date);

	//All appointments are on the hour, so zero out min/sec/ms.
	startDate.minutes(0);
	startDate.seconds(0);
	startDate.milliseconds(0);

	var endDate = startDate.clone();
	endDate.add(1, 'h');

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
	fromDate: dateObject,
	toDate: dateObject
};
@param: (fromDate, toDate) - The range to request the availability between
of the coach.
*/
Parse.Cloud.define('getCoachAppointments', function (request, response) {
	var fromDate = request.params.fromDate ? moment.utc(request.params.fromDate) : null;
	var toDate = request.params.toDate ? moment.utc(request.params.toDate) : null;

	//Get info about this user.
	var queryUser = new Parse.Query(User);
	queryUser.include('coach');
	queryUser.get(request.user.id).then(function (results) {
		request.user = results;

		//Get all the user's coach's appointments.
		var coachAppointmentsQuery = new Parse.Query(Appointment);
		coachAppointmentsQuery.select('startDate', 'endDate');
		coachAppointmentsQuery.equalTo('coach', request.user.get('coach'));
		if (fromDate) {
			coachAppointmentsQuery.greaterThan('endDate', fromDate.toDate());
		}
		if (toDate) {
			coachAppointmentsQuery.lessThan('startDate', toDate.toDate());
		}
		return coachAppointmentsQuery.find();
	}).then(function (results) {
		response.success(results);
	}, function (error) {
		response.error('A problem occurred while getting the coach\'s appointments.');
	});
});
