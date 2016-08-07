(function () {
  var textField = document.getElementById('anim-text-field-2');
  var submitButton = document.getElementById('anim-submit-button');
  var targetText = textField.getAttribute('data-text');
  var targetTextLength = targetText.length;
  var typeInterval;
  var typeSpeed = 3000 / targetTextLength;
  var typeFunction = function () {
    var currentText = textField.innerHTML;
    var currentTextLength = currentText.length;  
    
    if (currentTextLength < targetTextLength) {
      textField.innerHTML = (targetText.substr(0, currentTextLength + 1));
    } else {
      clearInterval(typeInterval);
      setTimeout(function () {
        textField.innerHTML = '';

        startTypeInterval();
      }, 1000);
    }  
  };

  // Press Submit button
  setInterval(function () {
    submitButton.className += ' anim-button--pressed';
    
    setTimeout(function () {
      submitButton.className = 'anim-button';
    }, 400);
  }, 4000);

  function startTypeInterval() {
    typeInterval = setInterval(typeFunction, typeSpeed);
  }

  startTypeInterval();
})();