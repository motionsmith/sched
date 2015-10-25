'use strict';

describe('Service: colorHelper', function () {

  // load the service's module
  beforeEach(module('schedApp'));

  // instantiate service
  var colorHelper;
  beforeEach(inject(function (_colorHelper_) {
    colorHelper = _colorHelper_;
  }));

  it('should do something', function () {
    expect(!!colorHelper).toBe(true);
  });

});
