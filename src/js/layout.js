// Generated by CoffeeScript 1.12.7
(function() {
  window.root_path = $('head').data('root-path');

  window.games_host = window.location.host;

  $(function() {
    var $language_button, $language_menu, $navbar_toggle, drag_id, menu_dragging, set_viewport_width;
    $(document).on('click', 'a', function(event) {
      var attributes;
      attributes = event.currentTarget.attributes;
      if (attributes['href-notranslate'] != null) {
        event.preventDefault();
        event.stopPropagation();
        return window.open(attributes['href-notranslate'].value, attributes['target'].value);
      }
    });
    set_viewport_width = function() {
      var meta_viewport;
      meta_viewport = $('meta[name=viewport]');
      if (window.outerWidth > window.outerHeight || window.outerWidth > 480 * 2) {
        return meta_viewport.attr('content', 'width=device-width, user-scalable=no');
      } else {
        return meta_viewport.attr('content', 'width=480, user-scalable=no');
      }
    };
    window.addEventListener('resize', set_viewport_width);
    set_viewport_width();
    menu_dragging = false;
    drag_id = null;
    $navbar_toggle = $('.navbar-toggle');
    $navbar_toggle.on('click touchend', function(event) {
      event.stopPropagation();
      $(this).addClass('focus');
      menu_dragging = false;
      return true;
    });
    $(document).on('click touchstart touchend', function(event) {
      if ($(event.target).closest('.slidebar').length) {
        return true;
      }
      if (menu_dragging) {
        menu_dragging = false;
      } else {
        $navbar_toggle.removeClass('focus');
      }
      return true;
    });
    $(document).on('touchstart', function(arg) {
      var originalEvent, touch;
      originalEvent = arg.originalEvent;
      touch = originalEvent.touches[0];
      if (!$navbar_toggle.hasClass('focus') && !menu_dragging && touch.pageX < 100) {
        menu_dragging = true;
        drag_id = touch.identifier;
      }
      return true;
    });
    $(document).on('touchmove', function(arg) {
      var originalEvent, touch;
      originalEvent = arg.originalEvent;
      if (!menu_dragging) {
        return;
      }
      touch = _.find(originalEvent.touches, {
        identifier: drag_id
      });
      if ((touch != null) && touch.pageX > 100) {
        $navbar_toggle.addClass('focus');
      }
      return true;
    });
    $language_button = $('#language-button');
    $language_menu = $('#language-menu');
    $language_button.on('click', function() {
      $(this).toggleClass('focus');
      return $language_menu.addClass('show');
    });
    $(document).on('click', function(event) {
      if (!$(event.target).closest('#language-menu, #language-button').length) {
        return $language_button.removeClass('focus');
      }
    });
    $('#language-menu a').on('click', function(event) {
      var $this, language_id, games_url;
      $this = $(this);
      games_url = window.location.protocol + '//' + window.games_host + window.location.pathname;
      if ($this.hasClass('auto')) {
        window.location = "https://translate.google.com/website?sl=en&u=" + games_url;
      } else {
        language_id = $this.data('language-id');
        if (language_id === 'en') {
          window.location = games_url;
        } else {
          window.location = "https://translate.google.com/website?sl=en&tl=" + language_id + "&u=" + games_url;
        }
      }
      return event.preventDefault();
    });
    if (navigator.serviceWorker != null) {
      navigator.serviceWorker.register(window.root_path + 'service-worker.js').then(function(registration) {
        return console.log('ServiceWorker registration successful with scope:', registration.scope);
      })["catch"](function(err) {
        return console.log('ServiceWorker registration failed:', err);
      });
    }
    return $('.top-banner').click(function(event) {
      var $a;
      $a = $(this).find('a');
      window.open($a.attr('href-notranslate') || $a.attr('href'));
      event.stopPropagation();
      return event.preventDefault();
    });
  });

}).call(this);

//# sourceMappingURL=layout.js.map
