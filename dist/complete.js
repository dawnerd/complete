/*!
 * complete - Autocomplete Plugin
 * v0.1.0
 * http://github.com/jgallen23/complete
 * copyright Greg Allen 2013
 * MIT License
*/
/*!
 * fidel - a ui view controller
 * v2.2.3
 * https://github.com/jgallen23/fidel
 * copyright Greg Allen 2013
 * MIT License
*/
(function(w, $) {
  var _id = 0;
  var Fidel = function(obj) {
    this.obj = obj;
  };

  Fidel.prototype.__init = function(options) {
    $.extend(this, this.obj);
    this.id = _id++;
    this.obj.defaults = this.obj.defaults || {};
    $.extend(this, this.obj.defaults, options);
    $('body').trigger('FidelPreInit', this);
    this.setElement(this.el || $('<div/>'));
    if (this.init) {
      this.init();
    }
    $('body').trigger('FidelPostInit', this);
  };
  Fidel.prototype.eventSplitter = /^(\w+)\s*(.*)$/;

  Fidel.prototype.setElement = function(el) {
    this.el = el;
    this.getElements();
    this.delegateEvents();
    this.dataElements();
    this.delegateActions();
  };

  Fidel.prototype.find = function(selector) {
    return this.el.find(selector);
  };

  Fidel.prototype.proxy = function(func) {
    return $.proxy(func, this);
  };

  Fidel.prototype.getElements = function() {
    if (!this.elements)
      return;

    for (var selector in this.elements) {
      var elemName = this.elements[selector];
      this[elemName] = this.find(selector);
    }
  };

  Fidel.prototype.dataElements = function() {
    var self = this;
    this.find('[data-element]').each(function(index, item) {
      var el = $(item);
      var name = el.data('element');
      self[name] = el;
    });
  };

  Fidel.prototype.delegateEvents = function() {
    var self = this;
    if (!this.events)
      return;
    for (var key in this.events) {
      var methodName = this.events[key];
      var match = key.match(this.eventSplitter);
      var eventName = match[1], selector = match[2];

      var method = this.proxy(this[methodName]);

      if (selector === '') {
        this.el.on(eventName, method);
      } else {
        if (this[selector] && typeof this[selector] != 'function') {
          this[selector].on(eventName, method);
        } else {
          this.el.on(eventName, selector, method);
        }
      }
    }
  };

  Fidel.prototype.delegateActions = function() {
    var self = this;
    self.el.on('click', '[data-action]', function(e) {
      var el = $(this);
      var action = el.attr('data-action');
      if (self[action]) {
        self[action](e, el);
      }
    });
  };

  Fidel.prototype.on = function(eventName, cb) {
    this.el.on(eventName+'.fidel'+this.id, cb);
  };

  Fidel.prototype.one = function(eventName, cb) {
    this.el.one(eventName+'.fidel'+this.id, cb);
  };

  Fidel.prototype.emit = function(eventName, data, namespaced) {
    var ns = (namespaced) ? '.fidel'+this.id : '';
    this.el.trigger(eventName+ns, data);
  };

  Fidel.prototype.hide = function() {
    if (this.views) {
      for (var key in this.views) {
        this.views[key].hide();
      }
    }
    this.el.hide();
  };
  Fidel.prototype.show = function() {
    if (this.views) {
      for (var key in this.views) {
        this.views[key].show();
      }
    }
    this.el.show();
  };

  Fidel.prototype.destroy = function() {
    this.el.empty();
    this.emit('destroy');
    this.el.unbind('.fidel'+this.id);
  };

  Fidel.declare = function(obj) {
    var FidelModule = function(el, options) {
      this.__init(el, options);
    };
    FidelModule.prototype = new Fidel(obj);
    return FidelModule;
  };

  //for plugins
  Fidel.onPreInit = function(fn) {
    $('body').on('FidelPreInit', function(e, obj) {
      fn.call(obj);
    });
  };
  Fidel.onPostInit = function(fn) {
    $('body').on('FidelPostInit', function(e, obj) {
      fn.call(obj);
    });
  };
  w.Fidel = Fidel;
})(window, window.jQuery || window.Zepto);

(function($) {
  $.declare = function(name, obj) {

    $.fn[name] = function() {
      var args = Array.prototype.slice.call(arguments);
      var options = args.shift();
      var methodValue;
      var els;

      els = this.each(function() {
        var $this = $(this);

        var data = $this.data(name);

        if (!data) {
          var View = Fidel.declare(obj);
          var opts = $.extend({}, options, { el: $this });
          data = new View(opts);
          $this.data(name, data); 
        }
        if (typeof options === 'string') {
          methodValue = data[options].apply(data, args);
        }
      });

      return (typeof methodValue !== 'undefined') ? methodValue : els;
    };

    $.fn[name].defaults = obj.defaults || {};

  };

  $.Fidel = window.Fidel;

})(jQuery);

(function($){

  function escapeString (value) {
    return value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  $.declare('complete',{
    defaults : {
      search : function(suggestion, queryOriginal, queryLowerCase){
        return suggestion.toLowerCase().indexOf(queryLowerCase.toLowerCase()) !== -1;
      },
      listClass : 'fidel-complete',
      suggestionActiveClass : 'fidel-complete-active',
      suggestionClass : 'fidel-complete-suggestion',
      maxHeight : 300,
      minChars : 0,
      zIndex : 99999,
      formatSuggestion : function(suggestion, value){
        var pattern = '(' + escapeString(value) + ')';
        return suggestion.replace(new RegExp(pattern, 'gi'), '<strong>$1<\/strong>');
      },
      query : function(query, callback){
        var queryLower = query.toLowerCase(), self = this;

        var suggestions = $.grep(this.source, function(suggestion){
          return self.search(suggestion, query, queryLower);
        });

        callback.apply(this,[suggestions]);
      }
    },
    events : {
      'keydown' : 'keyPressed',
      'keyup' : 'keyUp',
      'blur' : 'onBlur'
    },
    keyCode : {
      UP : 38,
      DOWN : 40,
      TAB: 9,
      ENTER : 13,
      ESC : 27
    },
    init : function(){
      $(this.el).attr('autocomplete', 'off');
      this.createListHolder();
      this.visible = false;
      this.currentValue = this.el.value;
      this.selectedIndex = -1;
    },
    createListHolder : function(){
      var $el = $(this.el);
      this.listHolder = $('<div>').addClass(this.listClass).hide().insertAfter($el);
      this.list= $('<ul>');
      this.list.appendTo(this.listHolder);

      $(this.listHolder).css({
        "width" : $el.outerWidth(),
        "top" : $el.position().top + $el.outerHeight(),
        "left" : $el.position().left,
        "max-height" : this.maxHeight,
        "z-index" : this.zIndex
      });

      this.bindEventsList();
    },
    bindEventsList : function(){
      var $list = $(this.list),
          self = this;
      $list.on('mouseover', 'li', function(e){
        var target = self._getTarget(e);
        self.activateSuggestion.apply(self, [target.data('index')]);
      });
      $list.on('mouseout', 'li', this.proxy(this.deActivateSuggestion,this));
      $list.on('click', 'li', this.proxy(this.selectSuggestion,this));
    },
    keyPressed : function(event){
      switch(event.keyCode){
        case this.keyCode.UP :
          this._prevSuggestion();
          break;
        case this.keyCode.DOWN :
          this._nextSuggestion();
          break;
        case this.keyCode.ESC :
          this.el.val(this.currentValue);
          this.hide();
          break;
        case this.keyCode.TAB:
        case this.keyCode.ENTER:
          this.selectSuggestion();
          break;
        default:
          return;
      }

      event.stopImmediatePropagation();
      event.preventDefault();
    },
    keyUp : function(event){
      switch(event.keyCode){
        case this.keyCode.UP :
        case this.keyCode.DOWN :
          return;
      }
      this.valueChanged();
    },
    onBlur : function(){
      $(document).on('click.complete', this.proxy(this.onClickWA,this));
    },
    onClickWA : function(event){
      if ($(event.target).closest('.' + this.listClass).length === 0) {
        this.hide();
        $(document).off('click.complete');
      }
    },
    valueChanged : function(){
      if (this.currentValue !== $(this.el).val()){
        this.el.value = $.trim($(this.el).val());
        this.currentValue = this.el.value;
        this.selectedIndex = -1;

        if (this.currentValue.length > this.minChars){
          this.show();
        }
        else {
          this.hide();
        }
      }
    },
    _getSuggestions : function(query){
      var queryLower = query.toLowerCase(), self = this;

      return $.grep(this.source, function(suggestion){
        return self.search(suggestion, query, queryLower);
      });
    },
    _nextSuggestion : function(){
      var index = this.selectedIndex;

      if (!this.visible && this.currentValue){
        this.show();
      }
      else if (index !== (this.suggestions.length - 1)) {
        this._adjustPosition(index + 1);
      }
    },
    _prevSuggestion : function(){
      var index = this.selectedIndex;

      if (index !== -1) {
        this._adjustPosition(index -1);
      }
    },
    _adjustPosition : function(index){
      var selected = this.activateSuggestion(index),
          selTop, upperLimit, lowerLimit, elementHeight,
          listHolder = $(this.listHolder);

      if (selected){
        selTop = selected.offsetTop;
        upperLimit = listHolder.scrollTop();
        elementHeight = $(this.list).children().first().outerHeight();
        lowerLimit = upperLimit + this.maxHeight - elementHeight;

        if (selTop < upperLimit){
          listHolder.scrollTop(selTop);
        }
        else if (selTop > lowerLimit){
          listHolder.scrollTop(selTop - this.maxHeight + elementHeight);
        }

        $(this.el).val(this.suggestions[index]);
      }
    },
    hide : function(){
      this.visible = false;
      $(this.listHolder).hide();
    },
    show : function(){
      var self = this;

      this.query.call(self,this.currentValue,function(suggestions){
        if (suggestions && $.isArray(suggestions) && suggestions.length){
          self.visible = true;
          var value = self.currentValue,
              className = self.suggestionClass,
              html = '';

          self.suggestions = suggestions;

          $.each(suggestions, function(i, suggestion){
            html += '<li class="'+ className +'" data-index="' + i +'">' + self.formatSuggestion(suggestion,value) + '</li>';
          });

          $(self.list).html(html);
          $(self.listHolder).show();
        }
        else {
          $(self.list).empty();
          self.hide();
        }
      });
    },
    activateSuggestion : function(index){
      var classSelected = this.suggestionActiveClass,
          list = $(this.list);

      list.children('.' + classSelected).removeClass(classSelected);
      this.selectedIndex = index;

      if (index !== -1 && list.children().length > index){
        return $(list.children().get(index)).addClass(classSelected);
      }
    },
    deActivateSuggestion : function(e){
      this._getTarget(e).removeClass(this.suggestionActiveClass);
      this.selectedIndex = -1;
    },
    selectSuggestion : function(){
      $(this.el).val(this.suggestions[this.selectedIndex]);
      this.currentValue = this.suggestions[this.selectedIndex];
      this.emit('select',this.currentValue);
      this.hide();
    },
    _getTarget : function(e){
      return $(e.currentTarget || e.toElement);
    }
  });
})(jQuery);