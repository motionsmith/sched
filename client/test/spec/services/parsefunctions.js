'use strict';

describe('Service: parsefunctions', function () {

  // load the service's module
  beforeEach(module('schedApp'));

  // instantiate service
  var parsefunctions;
  beforeEach(inject(function (_parsefunctions_) {
    parsefunctions = _parsefunctions_;
  }));

  it('should do something', function () {
    expect(!!parsefunctions).toBe(true);
  });

});
