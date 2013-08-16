(function() {
  'use strict';

  // Prevent scrolling.
  $('body').on('touchmove', function (event) {
    event.preventDefault();
  });

  // Make sure canvas have proper width and height;
  $('canvas').each(function () {
    var target = $(this);
    target.attr('width', target.css('width'));
    target.attr('height', target.css('height'));
  });


  // Show timeline popup.
  $('.timeline-popup-show').click(function(event){
    event.preventDefault(); // Disable normal link function so that it doesn't refresh the page.
    $('.timeline-popup-container').show(); // Display the popup.
  });

  // Hide timeline popup.
  $('.timeline-popup-hide').click(function(event) {
    event.preventDefault();
    $('.timeline-popup-container').hide(); // Hide the popup.
  });
})();
