'use strict';

function getMessage(a, b) {
  if (typeof a === 'boolean') {
    if (a) {
      return 'Я попал в ' + b;
    } else {
      return 'Я написал код неправильно и это сообщение будет красным.';
    }
  } else if (typeof a === 'number') {
    return 'Я прыгнул на ' + a * 100 + ' сантиметров'
  } else if (typeof b === 'undefined') {
    var sum = 0;
    for (var i = 0, l = a.length; i < l; i++) {
      sum += a[i];
    }

    return 'Я прошёл ' + sum + ' шагов';
  } else {
    var sumOfArrays = 0;
    for (var i = 0, l = a.length; i < l; i++) {
      sumOfArrays += a[i] * b[i];
    }

    return 'Я прошёл ' + sumOfArrays + ' метров';
  }
}
