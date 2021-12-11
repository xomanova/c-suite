(function () {
  'use strict';

  /// <reference lib="DOM" />
  /// <reference types="jquery" />
  /// <reference types="photoswipe" />
  /// <reference types="photoswipe/dist/photoswipe-ui-default" />
  /// <reference path="../types/phase.d.ts" />
  $(() => {
      const drag_state = {
          dragging: false,
          x: 0,
          scroll: 0,
      };
      const $screenshots = $('.screenshots');
      // Initialize PhotoSwipe
      const pswp = $('.pswp')[0];
      const items = Array.from($screenshots.find('a')).map((el) => {
          const $el = $(el);
          return {
              src: $el.attr('href'),
              w: $el.data('width'),
              h: $el.data('height'),
              msrc: $el.find('img').attr('src'),
              title: $el.data('caption'),
          };
      });
      $screenshots.on('dragstart', function (event) {
          event.preventDefault();
      });
      $screenshots.on('touchstart', function (event) {
          event.stopPropagation();
      });
      $screenshots.on('mousedown', function (event) {
          drag_state.dragging = true;
          drag_state.x = event.pageX;
          drag_state.scroll = this.scrollLeft;
      });
      $screenshots.on('mousemove', function (event) {
          if (!drag_state.dragging)
              return;
          this.scrollLeft = drag_state.scroll + drag_state.x - event.pageX;
      });
      $(document).on('mouseup dragend', function () {
          // Allow the click event to fire first before disabling dragging
          setTimeout(() => {
              drag_state.dragging = false;
          }, 0);
      });
      $screenshots.on('click', 'a', function (event) {
          if (!drag_state.dragging || Math.abs(drag_state.x - event.pageX) <= 10) {
              const gallery = new PhotoSwipe(pswp, PhotoSwipeUI_Default, items, {
                  index: $(this).data('index'),
                  shareEl: false,
                  fullscreenEl: false,
              });
              gallery.init();
          }
          event.preventDefault();
      });
  });

}());
