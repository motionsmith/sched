var moment = require('cloud/moment');
var _ = require('underscore');

var Appointment = Parse.Object.extend('appointment');
var User = Parse.Object.extend('_User');
var Coach = Parse.Object.extend('coach');
var dstEnds = moment('2015-11-01').hour(2);

/*
Cuts off the minutes, seconds, and milliseconds, so the times are on the hour.
*/

/*
Makes an appointment between the user who makes the query and the user's coach.
@param: (date) Gets rounded to the start of the hour.
Date should be converted to UTC on client.
Hour is validated to be both available to the coach and within the coach's operating hours.
*/
Parse.Cloud.beforeSave('appointment', function (request, response) {
	var appointment = request.object;
	var startDT = moment(appointment.get('startDate')).startOf('hour');
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

		//Convert work hours to daylight savings if appointment is during DST.
		if (startDT.isBefore(dstEnds)) {
			coachWorkHours = coachWorkHours.map(function (hr) {
				return hr - 1;
			});
		}

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
	var fromDT = request.params.from ? moment(request.params.from) : moment();
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

@param (workWeekHours) An array representing the general "business hours" that the coach works,
each number representing a unique hour of that week.
@param (coachApopintments) These are the appointments that the coach has, directly from the DB.
*/
function getCoachAvailability(fromDT, workWeekHours, coachAppointments, userAppointments) {
	var lastAppointment = coachAppointments[coachAppointments.length - 1];
	var toDT = moment(lastAppointment.get('endDate')).endOf('hour');

	/* Make a temp version of the coach's work hours for DST */
	var dstWorkWeekHours = workWeekHours.map(function(hr) {
		return hr - 1;
	});

	/* Returns true if the given datetime is outside of work hours. */
	function isOutsideWorkHours(dt, workWeek) {
		var proposedWeekHour = dt.days() * 24 + dt.hours();
		
		return workWeek.indexOf(proposedWeekHour) === -1;
	}

	/* Returns true of the user already has an appointment in the same
	month as the given datetime. */
	function doesUserAlreadyHaveAppointment(dt, userAppointments) {
		for (var i = 0; i < userAppointments.length; i++) {
			var appt = userAppointments[i];
			var apptStartDT = moment(appt.get('startDate'));
			if (dt.month() === apptStartDT.month()) {
				return true;
			}
		}
		return false;
	}

	var lowerLimit = 18;
	var availability  = {};

	//Populate the coach's appointemnts into the availabilities column,
	//before checking availabilities.
	//We will actually use them while populating the availabilities as a
	//way of making sure to not make that time available.
	//
	//Doing it this way is linear time-complexity as opposed to quadratic if you were to check
	//each availability against each coach appointment.
	for (var i = 0; i < coachAppointments.length; i++) {
		var coachAppt = coachAppointments[i];
		var coachApptStart = moment(coachAppt.get('startDate'));
		var dateKey = coachApptStart.format('YYYY-MM-DD');
		if (availability.hasOwnProperty(dateKey) === false) {
			availability[dateKey] = [];
		}
		availability[dateKey].push(coachApptStart.hours());
	}

	var numAvailabilities = 0;
	for (var proposedDT = fromDT.clone().startOf('hour'); (proposedDT.isBefore(toDT) && numAvailabilities < 1000) || numAvailabilities < lowerLimit; proposedDT.add(1, 'h')) {
		var dateKey = proposedDT.format('YYYY-MM-DD');
		var proposedHour = proposedDT.hours();

		//Here, if we see that this availability already has a spot,
		//that means the coach already has an appointment here.
		//We remove it from the list of availabilities.
		if (availability.hasOwnProperty(dateKey)) {
			var indexOfTime = availability[dateKey].indexOf(proposedHour);
			if (indexOfTime !== -1) {
				availability[dateKey].splice(indexOfTime, 1);
				continue;
			}
		}
		
		//First, in order for a time to be available, it must not be outside of work hours
		if (isOutsideWorkHours(proposedDT, proposedDT.isBefore(dstEnds) ? dstWorkWeekHours : workWeekHours)) {
			continue;
		}

		//Second, the user must not already have a conflicting appointment (within that month).
		if (doesUserAlreadyHaveAppointment(proposedDT, userAppointments)) {
			continue;
		}
		
		//Finally, it has passed all the tests, and gets added to the list of availabilities.
		if (availability.hasOwnProperty(dateKey) === false) {
			availability[dateKey] = [];
		}
		availability[dateKey].push(proposedHour);
		numAvailabilities++;
	}

	return availability;
}

/* 
Makes the calendar look more realistically filled out.
Automatically schedules appointments, with higher frequency for dates closer to now.
*/
Parse.Cloud.define('fillSchedule', function(request, response) {

	var queryUser = new Parse.Query(User);
	queryUser.include('coach');
	queryUser.get(request.user.id).then(function (results) {

		var user = results;
		var coach = user.get('coach');
		var workHours = coach.get('workHours');

		var currDT = moment().startOf('hour');
		var endDT = moment().startOf('hour').add(4, 'months');
		var apptsToBook = [];

		/* Loop through every hour between currDT and endDT.
		All valid hours are randomly booked (or not). */
		while (currDT.isBefore(endDT)) {
			var currWeekHour = currDT.days() * 24 + currDT.hours();
			if (workHours.indexOf(currWeekHour) === -1) {
				currDT = currDT.add(1, 'hour');
				continue;
			}

			/* Randomly determine whether or not to book this hour. */
			if (scheduleFillerAppointment(currDT)) {
				var apptEndDT = currDT.clone().endOf('hour');
				var appt = new Appointment();
				appt.set('startDate', currDT.clone().toDate());
				appt.set('client', {'__type': 'Pointer', className: '_User', objectId: 'RgfVS4n3jZ'});
				appt.set('coach', {'__type': 'Pointer', className: 'coach', objectId: 'HWGQluAERq'});
				appt.set('endDate', apptEndDT.toDate());

				apptsToBook.push(appt);
			}
			currDT.add(1, 'hour');
		}

		/* Create all appointments at the same time. Saves DB requests and money. */
		return Parse.Object.saveAll(apptsToBook);
	})
	.then(function() {
		response.success();
	}, function (error) {
		response.error(error);
	});
	
	/*
	Given a time in hours from now, returns a probability of booking at that time (0-1).
	Probability (y) goes up in parabolic form as time goes forward. (x)
	*/
	function bookingProbability(x) {
		var a = 0.0000003;
		var b = 0.0000001;
		var c = 0.1;

		//Parabolic probability (ax^2 + bx + c)
		//0 < x < 4400 hours (6 months)
		//0 < y < 1 probability
		return Math.pow(a*x, 2) + b*x + c;
	}

	/* Returns (boolean) whether or not to create an appointment at the given time.
	Based on decreasing probability function from now. */
	function scheduleFillerAppointment(dt) {
		var msFromNow = dt.diff(moment());
		var durationFromNow = moment.duration(msFromNow);
		var hrsFromNow = durationFromNow.asHours();
		var bookingProb = bookingProbability(hrsFromNow);
		var b = Math.random() > bookingProb;
		return b;
	}
})
