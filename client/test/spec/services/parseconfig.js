'use strict';

describe('Service: parseconfig', function () {

  // load the service's module
  beforeEach(module('schedApp'));

  // instantiate service
  var parseconfig;
  beforeEach(inject(function (_parseconfig_) {
    parseconfig = _parseconfig_;
  }));

  it('should do something', function () {
    expect(!!parseconfig).toBe(true);
  });

});
