var computeMaxCallStackSize = (function() {
  return function() {
    var size = 0;

    function cs() {
      try {
        size++;
        return cs();
      } catch(e) {
        return size + 1;
      }
    }

    return cs();
  };
}());
console.log(computeMaxCallStackSize())