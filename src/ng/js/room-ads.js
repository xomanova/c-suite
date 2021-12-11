(function () {
  'use strict';

  const BASE_HEIGHT = 100;
  const MIN_HEIGHT = 90;
  const filter_dimensions = (sizes) => sizes.filter((size) => typeof size === 'string' ||
      size[0] === 'fluid' ||
      (size[0] <= document.documentElement.clientWidth &&
          size[1] <= Math.max(MIN_HEIGHT, document.documentElement.clientHeight / 2 - BASE_HEIGHT)));
  const define_slot = (ad_unit_path, sizes, div_id) => {
      window.googletag = window.googletag || { cmd: [] };
      googletag.cmd.push(function () {
          var _a;
          (_a = googletag.defineSlot(ad_unit_path, filter_dimensions(sizes), div_id)) === null || _a === void 0 ? void 0 : _a.addService(googletag.pubads());
          googletag.pubads().enableSingleRequest();
          googletag.enableServices();
      });
  };

  /// <reference lib="DOM" />
  const ROOM_FOOTER_ID = 'div-gpt-ad-1631711211589-0';
  define_slot('/22551095440/room-footer', [
      'fluid',
      [768, 1024],
      [1024, 768],
      [300, 1050],
      [970, 250],
      [580, 400],
      [750, 300],
      [300, 600],
      [930, 180],
      [320, 480],
      [480, 320],
      [750, 200],
      [980, 120],
      [336, 280],
      [980, 90],
      [970, 90],
      [960, 90],
      [950, 90],
      [300, 250],
      [750, 100],
      [728, 90],
      [970, 66],
      [320, 100],
      [300, 100],
      [468, 60],
      [300, 75],
      [320, 50],
      [300, 50],
  ], ROOM_FOOTER_ID);
  $(() => {
      try {
          // Only advertise to people who haven't played a game yet
          if (!localStorage.player_interactions) {
              $('#content').append(`
        <div id='${ROOM_FOOTER_ID}' class='ad-room-footer'>
          <script>
            googletag.cmd.push(function() { googletag.display('${ROOM_FOOTER_ID}'); });
          </script>
        </div>
      `);
              setInterval(() => typeof googletag.pubads === 'function' && googletag.pubads().refresh(), 60000);
          }
          else {
              console.log('Ads disabled.');
          }
      }
      catch (error) {
          // Some users have localStorage disabled
          // @ts-ignore
          if (!(error instanceof (window.SecurityError || window.DOMException))) {
              throw error;
          }
      }
  });

}());
