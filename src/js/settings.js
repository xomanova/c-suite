// Generated by CoffeeScript 1.12.7
(function() {
  $(function() {
    var $form;
    $form = $('#settings');
    if (localStorage.player_name != null) {
      $form.find('input').val(localStorage.player_name);
    }
    $form.submit(function(event) {
      event.preventDefault();
      localStorage.player_name = $form.find('input').val();
      return window.history.back();
    });
    return $form.find('a').click(function() {
      return $form.submit();
    });
  });

}).call(this);

//# sourceMappingURL=settings.js.map
