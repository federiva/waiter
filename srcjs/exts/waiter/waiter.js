import 'shiny';
import 'jquery';
import { getDimensions } from '../dimensions';
import { hideRecalculate } from '../recalculate';

import './css/css-spinners.css';
import './css/custom.css';
import './css/devloop.css';
import './css/loaders.css';
import './css/spinbolt.css';
import './css/spinkit.css';
import './css/spinners.css';
import './css/waiter.css';

// elements to hide on recomputed
var waiterToHideOnRender = new Map();
var waiterToFadeout = new Map();
var waiterToHideOnError = new Map();
var waiterToHideOnSilentError = new Map();

const setWaiterShownInput = (id) => {
  let input = "waiter_shown";
  if(id !== null)
    input = id + "_" + input;
  
  Shiny.setInputValue(input, true, {priority: 'event'});
};

const setWaiterHiddenInput = (id) => {
  let input = "waiter_hidden";
  if(id !== null)
    input = id + "_" + input;
  
  Shiny.setInputValue(input, true, {priority: 'event'});
}

let defaultWaiter = {
  id: null, 
  html: '<div class="container--box"><div class="boxxy"><div class="spinner spinner--1"></div></div></div>', 
  color: '#333e48', 
  hideOnRender: false, 
  hideOnError: false, 
  hideOnSilentError: false, 
  image: null,
  fadeOut: false,
  onShown: setWaiterShownInput
};

// show waiter overlay
export const showWaiter = (params = defaultWaiter) => {

  // declare
  var dom,
      selector = 'body',
      exists = false;

  // get parent
  if(params.id !== null)
    selector = '#' + params.id;
  
  dom = document.querySelector(selector);
  if(dom == undefined){
    console.log("Cannot find", params.id);
    return ;
  }
  
  // allow missing for testing
  params.hideOnRender = params.hideOnRender || false;

  // set in maps
  waiterToHideOnRender.set(params.id, params.hideOnError);
  waiterToFadeout.set(selector, params.fadeOut);
  waiterToHideOnError.set(params.id, params.hideOnError);
  waiterToHideOnSilentError.set(params.id, params.hideOnSilentError);

  let el = getDimensions(dom); // get dimensions

  // no id = fll screen
  if(params.id === null){
    el.height = window.innerHeight;
    el.width = $("body").width();
  }
  
  // force static if position relative
  // otherwise overlay is completely off
  var pos = window.getComputedStyle(dom, null).position;
  if(pos == 'relative')
    dom.className += ' staticParent';

  // check if overlay exists
  dom.childNodes.forEach(function(el){
    if(el.className === 'waiter-overlay')
      exists = true;
  });

  if(exists){
    console.log("waiter on", params.id, "already exists");
    return;
  }
  
  hideRecalculate(params.id);

  // create overlay
  let overlay = document.createElement("DIV");
  // create overlay content
  let overlayContent = document.createElement("DIV");
  // insert html
  overlayContent.innerHTML = params.html;
  overlayContent.classList.add("waiter-overlay-content");

  // dynamic position
  if(params.id == null)
    overlay.style.position = "fixed";
  else
    overlay.style.position = "absolute";
  
  // dynamic dimensions
  overlay.style.height = el.height + 'px';
  overlay.style.width = el.width + 'px';
  overlay.style.top = el.top + 'px';
  overlay.style.left = el.left + 'px';
  overlay.style.backgroundColor = params.color;
  overlay.classList.add("waiter-overlay");

  if(params.image != null && params.image != ''){
    overlay.style.backgroundImage = "url('" + params.image + "')";
  }

  // either full-screen or partial
  if(params.id !== null) {
    overlay.classList.add("waiter-local");
  } else {
    overlay.classList.add('waiter-fullscreen');
  }

  // append overlay content in overlay
  overlay.appendChild(overlayContent);

  // append overlay to dom
  dom.appendChild(overlay);

  // set input
  try {
    params.onShown(params.id);
  }
  catch(err) {
    console.log("likely using waiterShowOnLoad - shiny not connected yet:", err.message);
  }
  
}

export const hideWaiter = (id, onHidden = null) => {

  var selector = 'body';
  if(id !== null)
    selector = '#' + id;

  let overlay = $(selector).find(".waiter-overlay");
  
  if(overlay.length == 0)
    return;
  
  let timeout = 250;
  if(waiterToFadeout.get(selector)){
    let value = waiterToFadeout.get(selector);

    if(typeof value == 'boolean')
      value = 500;

    $(overlay).fadeOut(value);

    timeout = timeout + value;
  }
  
  // this is to avoid the waiter screen from flashing
  setTimeout(function(){
    overlay.remove();
  }, timeout);

  if(onHidden != null)
    onHidden(id);

}

export const updateWaiter = (id, html) => {
  var selector = 'body';
  if(id !== null)
    selector = '#' + id;

  $(selector)
    .find('.waiter-overlay-content')
    .each((index, el) => {
      $(el).html(html);
    });
}

// currently unused but may be useful for others using JS API
export const showRecalculate = (id) => {
  $(id + "-waiter-recalculating").remove();
}

// remove when output receives value
$(document).on('shiny:value', function(event) {
  if(waiterToHideOnRender.get(event.name)){
    hideWaiter(event.name, setWaiterHiddenInput);
  }
});

// remove when output errors
$(document).on('shiny:error', function(event) {
  if(event.error.type == null && waiterToHideOnError.get(event.name)){
    hideWaiter(event.name, setWaiterHiddenInput);
    return
  } 
  
  if (event.error.type != null && waiterToHideOnSilentError.get(event.name)){
    hideWaiter(event.name, setWaiterHiddenInput);
  }
});

// On resize we need to resize the waiter screens too
window.addEventListener("resize", function(){
  $('.waiter-local')
    .each((index, el) => {
      let dim = getDimensions($(el).parent()[0]);
      $(el).css({
        width: dim.width + 'px',
        height: dim.height + 'px'
      })
    })

  $('.waiter-fullscreen')
    .css({
      width: window.innerWidth + 'px',
      height: window.innerHeight + 'px'
    });

  });

Shiny.addCustomMessageHandler('waiter-show', function(opts) {
  showWaiter({
    id: opts.id, 
    html: opts.html, 
    color: opts.color, 
    hideOnRender: opts.hide_on_render,
    hideOnError: opts.hide_on_error, 
    hideOnSilentError: opts.hide_on_silent_error,
    image: opts.image,
    fadeOut: opts.fade_out
  });
  Shiny.setInputValue("waiter_shown", true, {priority: 'event'});
});

Shiny.addCustomMessageHandler('waiter-update', function(opts) {
  updateWaiter(opts.id, opts.html);
});

Shiny.addCustomMessageHandler('waiter-hide', function(opts) {
  hideWaiter(opts.id, setWaiterHiddenInput);
});