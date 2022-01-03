window.root_path = $('head').data('root-path')

window.netgames_host = window.location.host

window.addEventListener 'error', (event) ->
  $.ajax({
    url: window.root_path + 'error-report'
    method: 'POST'
    contentType: 'application/json'
    data: JSON.stringify {
      lineno: event.lineno
      colno: event.colno
      filename: event.filename
      stack: event.error?.stack.toString()
      room_id: window.netgames?.room_id
    }
  })

$ ->
  # Make href-notranslate links work

  $(document).on 'click', 'a', (event) ->
    attributes = event.currentTarget.attributes
    if attributes['href-notranslate']?
      event.preventDefault()
      event.stopPropagation()
      window.open(attributes['href-notranslate'].value, attributes['target'].value)

  # Remove viewport override on wide and landscape screens

  set_viewport_width = () ->
    meta_viewport = $('meta[name=viewport]')
    if window.outerWidth > window.outerHeight or window.outerWidth > 480*2
      meta_viewport.attr('content', 'width=device-width, user-scalable=no')
    else
      meta_viewport.attr('content', 'width=480, user-scalable=no')

  window.addEventListener 'resize', set_viewport_width
  set_viewport_width()

  # Swipe from left for menu

  menu_dragging = false
  drag_id = null

  $navbar_toggle = $('.navbar-toggle')

  $navbar_toggle.on 'click touchend', (event) ->
    event.stopPropagation()
    $(this).addClass('focus')
    menu_dragging = false
    return true

  $(document).on 'click touchstart touchend', (event) ->
    if $(event.target).closest('.slidebar').length
      return true

    if menu_dragging
      menu_dragging = false
    else
      $navbar_toggle.removeClass('focus')

    return true

  $(document).on 'touchstart', ({originalEvent}) ->
    touch = originalEvent.touches[0]
    if not $navbar_toggle.hasClass('focus') and not menu_dragging and touch.pageX < 100
      menu_dragging = true
      drag_id = touch.identifier
    return true

  $(document).on 'touchmove', ({originalEvent}) ->
    return if not menu_dragging
    touch = _.find(originalEvent.touches, identifier: drag_id)
    if touch? and touch.pageX > 100
      $navbar_toggle.addClass('focus')
    return true

  # Language menu

  $language_button = $('#language-button')
  $language_menu = $('#language-menu')
  $language_button.on 'click', ->
    $(this).toggleClass('focus')
    $language_menu.addClass('show')

  $(document).on 'click', (event) ->
    if not $(event.target).closest('#language-menu, #language-button').length
      $language_button.removeClass('focus')

  $('#language-menu a').on 'click', (event) ->
    $this = $(this)
    netgames_url = window.location.protocol + '//' + window.netgames_host + window.location.pathname
    if $this.hasClass('auto')
      window.location = "https://translate.google.com/website?sl=en&u=#{netgames_url}"
    else
      language_id = $this.data('language-id')
      if language_id == 'en'
        window.location = netgames_url
      else
        window.location = "https://translate.google.com/website?sl=en&tl=#{language_id}&u=#{netgames_url}"
    event.preventDefault()

  # Service Worker

  if navigator.serviceWorker?
    navigator.serviceWorker.register(window.root_path + 'service-worker.js').then (registration) ->
      console.log 'ServiceWorker registration successful with scope:', registration.scope
    .catch (err) ->
      console.log 'ServiceWorker registration failed:', err

  $('.top-banner').click (event) ->
    $a = $(this).find('a')
    window.open $a.attr('href-notranslate') or $a.attr('href')
    event.stopPropagation()
    event.preventDefault()
