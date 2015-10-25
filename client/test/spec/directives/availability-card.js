'use strict';

describe('Directive: availabilityCard', function () {

  // load the directive's module
  beforeEach(module('schedApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<availability-card></availability-card>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the availabilityCard directive');
  }));
});
