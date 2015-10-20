'use strict';

describe('Service: myAppointmentsHelper', function () {

  // load the service's module
  beforeEach(module('schedApp'));

  // instantiate service
  var myAppointmentsHelper;
  beforeEach(inject(function (_myAppointmentsHelper_) {
    myAppointmentsHelper = _myAppointmentsHelper_;
  }));

  it('should do something', function () {
    expect(!!myAppointmentsHelper).toBe(true);
  });

});
