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
  const LANDING_PAGE_ID = 'div-gpt-ad-1631009675699-0';
  define_slot('/22551095440/landing-pages', [
      'fluid',
      [980, 90],
      [970, 90],
      [960, 90],
      [950, 90],
      [728, 90],
      [970, 66],
      [468, 60],
      [300, 75],
      [320, 50],
      [300, 50],
  ], LANDING_PAGE_ID);
  $(() => {
      try {
          // Only advertise to people who haven't played a game yet
          if (!localStorage.player_interactions) {
              // /22551095440/landing-pages
              $('.base').append(`
        <div id='${LANDING_PAGE_ID}' style='width: 100vw; margin-left: -10px'>
          <script>
            googletag.cmd.push(function() { googletag.display('${LANDING_PAGE_ID}'); });
          </script>
        </div>
      `);
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
