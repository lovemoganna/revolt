
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Nested.svelte generated by Svelte v3.24.1 */

    const file = "src/Nested.svelte";

    function create_fragment(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "This is another paragraph.";
    			add_location(p, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nested> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Nested", $$slots, []);
    	return [];
    }

    class Nested extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nested",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var build_umd = createCommonjsModule(function (module, exports) {
    (function webpackUniversalModuleDefinition(root, factory) {
    	module.exports = factory();
    })(commonjsGlobal, function() {
    return /******/ (function(modules) { // webpackBootstrap
    /******/ 	// The module cache
    /******/ 	var installedModules = {};
    /******/
    /******/ 	// The require function
    /******/ 	function __webpack_require__(moduleId) {
    /******/
    /******/ 		// Check if module is in cache
    /******/ 		if(installedModules[moduleId]) {
    /******/ 			return installedModules[moduleId].exports;
    /******/ 		}
    /******/ 		// Create a new module (and put it into the cache)
    /******/ 		var module = installedModules[moduleId] = {
    /******/ 			i: moduleId,
    /******/ 			l: false,
    /******/ 			exports: {}
    /******/ 		};
    /******/
    /******/ 		// Execute the module function
    /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    /******/
    /******/ 		// Flag the module as loaded
    /******/ 		module.l = true;
    /******/
    /******/ 		// Return the exports of the module
    /******/ 		return module.exports;
    /******/ 	}
    /******/
    /******/
    /******/ 	// expose the modules object (__webpack_modules__)
    /******/ 	__webpack_require__.m = modules;
    /******/
    /******/ 	// expose the module cache
    /******/ 	__webpack_require__.c = installedModules;
    /******/
    /******/ 	// define getter function for harmony exports
    /******/ 	__webpack_require__.d = function(exports, name, getter) {
    /******/ 		if(!__webpack_require__.o(exports, name)) {
    /******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
    /******/ 		}
    /******/ 	};
    /******/
    /******/ 	// define __esModule on exports
    /******/ 	__webpack_require__.r = function(exports) {
    /******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
    /******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    /******/ 		}
    /******/ 		Object.defineProperty(exports, '__esModule', { value: true });
    /******/ 	};
    /******/
    /******/ 	// create a fake namespace object
    /******/ 	// mode & 1: value is a module id, require it
    /******/ 	// mode & 2: merge all properties of value into the ns
    /******/ 	// mode & 4: return value when already ns object
    /******/ 	// mode & 8|1: behave like require
    /******/ 	__webpack_require__.t = function(value, mode) {
    /******/ 		if(mode & 1) value = __webpack_require__(value);
    /******/ 		if(mode & 8) return value;
    /******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
    /******/ 		var ns = Object.create(null);
    /******/ 		__webpack_require__.r(ns);
    /******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
    /******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
    /******/ 		return ns;
    /******/ 	};
    /******/
    /******/ 	// getDefaultExport function for compatibility with non-harmony modules
    /******/ 	__webpack_require__.n = function(module) {
    /******/ 		var getter = module && module.__esModule ?
    /******/ 			function getDefault() { return module['default']; } :
    /******/ 			function getModuleExports() { return module; };
    /******/ 		__webpack_require__.d(getter, 'a', getter);
    /******/ 		return getter;
    /******/ 	};
    /******/
    /******/ 	// Object.prototype.hasOwnProperty.call
    /******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
    /******/
    /******/ 	// __webpack_public_path__
    /******/ 	__webpack_require__.p = "";
    /******/
    /******/
    /******/ 	// Load entry module and return exports
    /******/ 	return __webpack_require__(__webpack_require__.s = 0);
    /******/ })
    /************************************************************************/
    /******/ ({

    /***/ "./node_modules/webpack/buildin/global.js":
    /*!***********************************!*\
      !*** (webpack)/buildin/global.js ***!
      \***********************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    var g;

    // This works in non-strict mode
    g = (function() {
    	return this;
    })();

    try {
    	// This works if eval is allowed (see CSP)
    	g = g || Function("return this")() || (1, eval)("this");
    } catch (e) {
    	// This works if the window reference is available
    	if (typeof window === "object") g = window;
    }

    // g can still be undefined, but nothing to do about it...
    // We return undefined, instead of nothing here, so it's
    // easier to handle this case. if(!global) { ...}

    module.exports = g;


    /***/ }),

    /***/ "./packages/@apphub:logrocket-console/src/index.js":
    /*!*********************************************************!*\
      !*** ./packages/@apphub:logrocket-console/src/index.js ***!
      \*********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _registerConsole = __webpack_require__(/*! ./registerConsole */ "./packages/@apphub:logrocket-console/src/registerConsole.js");

    var _registerConsole2 = _interopRequireDefault(_registerConsole);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    exports.default = _registerConsole2.default;

    /***/ }),

    /***/ "./packages/@apphub:logrocket-console/src/registerConsole.js":
    /*!*******************************************************************!*\
      !*** ./packages/@apphub:logrocket-console/src/registerConsole.js ***!
      \*******************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    exports.default = registerConsole;

    var _enhanceFunc = __webpack_require__(/*! @apphub/logrocket-utils/src/enhanceFunc */ "./packages/@apphub:logrocket-utils/src/enhanceFunc.js");

    var _enhanceFunc2 = _interopRequireDefault(_enhanceFunc);

    var _logrocketExceptions = __webpack_require__(/*! @apphub/logrocket-exceptions */ "./packages/@apphub:logrocket-exceptions/src/index.js");

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function registerConsole(logger) {
      var unsubFunctions = [];
      var methods = ['log', 'warn', 'info', 'error', 'debug'];

      methods.forEach(function (method) {
        unsubFunctions.push((0, _enhanceFunc2.default)(console, method, function () {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          logger.addEvent('lr.core.LogEvent', function () {
            var consoleOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            var isEnabled = consoleOptions.isEnabled;

            if ((typeof isEnabled === 'undefined' ? 'undefined' : _typeof(isEnabled)) === 'object' && isEnabled[method] === false || isEnabled === false) {
              return null;
            }

            if (method === 'error' && consoleOptions.shouldAggregateConsoleErrors) {
              _logrocketExceptions.Capture.captureMessage(logger, args[0], {}, true);
            }

            return {
              logLevel: method.toUpperCase(),
              args: args
            };
          });
        }));
      });

      return function () {
        unsubFunctions.forEach(function (unsubFunction) {
          return unsubFunction();
        });
      };
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-exceptions/src/Capture.js":
    /*!**************************************************************!*\
      !*** ./packages/@apphub:logrocket-exceptions/src/Capture.js ***!
      \**************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /* eslint-disable no-param-reassign */


    exports.captureMessage = captureMessage;
    exports.captureException = captureException;

    var _TraceKit = __webpack_require__(/*! @apphub/logrocket-utils/src/TraceKit */ "./packages/@apphub:logrocket-utils/src/TraceKit.js");

    var _TraceKit2 = _interopRequireDefault(_TraceKit);

    var _stackTraceFromError = __webpack_require__(/*! ./stackTraceFromError */ "./packages/@apphub:logrocket-exceptions/src/stackTraceFromError.js");

    var _stackTraceFromError2 = _interopRequireDefault(_stackTraceFromError);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isScalar(value) {
      return (/boolean|number|string/.test(typeof value === 'undefined' ? 'undefined' : _typeof(value))
      );
    }

    function scrub(data, options) {
      if (options) {
        var optionalScalars = [
        // Valid values for 'level' are 'fatal', 'error', 'warning', 'info',
        // and 'debug'. Defaults to 'error'.
        'level', 'logger'];
        for (var _iterator = optionalScalars, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
          var _ref;

          if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
          } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
          }

          var field = _ref;

          var value = options[field];

          if (isScalar(value)) {
            data[field] = value.toString();
          }
        }

        var optionalMaps = ['tags', 'extra'];
        for (var _iterator2 = optionalMaps, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
          var _ref2;

          if (_isArray2) {
            if (_i2 >= _iterator2.length) break;
            _ref2 = _iterator2[_i2++];
          } else {
            _i2 = _iterator2.next();
            if (_i2.done) break;
            _ref2 = _i2.value;
          }

          var _field = _ref2;

          var dirty = options[_field] || {};
          var scrubbed = {};

          for (var _iterator3 = Object.keys(dirty), _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
            var _ref3;

            if (_isArray3) {
              if (_i3 >= _iterator3.length) break;
              _ref3 = _iterator3[_i3++];
            } else {
              _i3 = _iterator3.next();
              if (_i3.done) break;
              _ref3 = _i3.value;
            }

            var key = _ref3;

            var _value = dirty[key];

            if (isScalar(_value)) {
              scrubbed[key.toString()] = _value.toString();
            }
          }

          data[_field] = scrubbed;
        }
      }
    }

    function captureMessage(logger, message) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var isConsole = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      var data = {
        exceptionType: isConsole ? 'CONSOLE' : 'MESSAGE',
        message: message,
        browserHref: window.location.href
      };

      scrub(data, options);

      logger.addEvent('lr.core.Exception', function () {
        return data;
      });
    }

    function captureException(logger, exception) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var preppedTrace = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

      var trace = preppedTrace || _TraceKit2.default.computeStackTrace(exception);

      var data = {
        exceptionType: 'WINDOW',
        errorType: trace.name,
        message: trace.message,
        browserHref: window.location.href
      };

      scrub(data, options);

      var addEventOptions = {
        _stackTrace: (0, _stackTraceFromError2.default)(trace)
      };

      logger.addEvent('lr.core.Exception', function () {
        return data;
      }, addEventOptions);
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-exceptions/src/index.js":
    /*!************************************************************!*\
      !*** ./packages/@apphub:logrocket-exceptions/src/index.js ***!
      \************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.Capture = exports.registerExceptions = undefined;

    var _registerExceptions = __webpack_require__(/*! ./registerExceptions */ "./packages/@apphub:logrocket-exceptions/src/registerExceptions.js");

    var _registerExceptions2 = _interopRequireDefault(_registerExceptions);

    var _Capture = __webpack_require__(/*! ./Capture */ "./packages/@apphub:logrocket-exceptions/src/Capture.js");

    var Capture = _interopRequireWildcard(_Capture);

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    exports.registerExceptions = _registerExceptions2.default;
    exports.Capture = Capture;

    /***/ }),

    /***/ "./packages/@apphub:logrocket-exceptions/src/raven/raven.js":
    /*!******************************************************************!*\
      !*** ./packages/@apphub:logrocket-exceptions/src/raven/raven.js ***!
      \******************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {
    /* WEBPACK VAR INJECTION */(function(global) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* eslint-disable */

    /*
    Some contents of this file were originaly from raven-js, BSD-2 Clause

    Copyright (c) 2018 Sentry (https://sentry.io) and individual contributors.
    All rights reserved.

    Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    */

    var _TraceKit = __webpack_require__(/*! @apphub/logrocket-utils/src/TraceKit */ "./packages/@apphub:logrocket-utils/src/TraceKit.js");

    var _TraceKit2 = _interopRequireDefault(_TraceKit);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var objectPrototype = Object.prototype;

    function isUndefined(what) {
      return what === void 0;
    }

    function isFunction(what) {
      return typeof what === 'function';
    }

    /**
     * hasKey, a better form of hasOwnProperty
     * Example: hasKey(MainHostObject, property) === true/false
     *
     * @param {Object} host object to check property
     * @param {string} key to check
     */
    function hasKey(object, key) {
      return objectPrototype.hasOwnProperty.call(object, key);
    }

    /**
     * Polyfill a method
     * @param obj object e.g. `document`
     * @param name method name present on object e.g. `addEventListener`
     * @param replacement replacement function
     * @param track {optional} record instrumentation to an array
     */
    function fill(obj, name, replacement, track) {
      var orig = obj[name];
      obj[name] = replacement(orig);
      if (track) {
        track.push([obj, name, orig]);
      }
    }

    var _window = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
    var _document = _window.document;

    var Handler = function () {
      function Handler(_ref) {
        var captureException = _ref.captureException;

        _classCallCheck(this, Handler);

        this._errorHandler = this._errorHandler.bind(this);

        this._ignoreOnError = 0;
        this._wrappedBuiltIns = [];
        this.captureException = captureException;
        _TraceKit2.default.report.subscribe(this._errorHandler);
        this._instrumentTryCatch();
      }

      _createClass(Handler, [{
        key: 'uninstall',
        value: function uninstall() {
          _TraceKit2.default.report.unsubscribe(this._errorHandler);

          // restore any wrapped builtins
          var builtin;
          while (this._wrappedBuiltIns.length) {
            builtin = this._wrappedBuiltIns.shift();

            var obj = builtin[0],
                name = builtin[1],
                orig = builtin[2];

            obj[name] = orig;
          }
        }
      }, {
        key: '_errorHandler',
        value: function _errorHandler(report) {
          if (!this._ignoreOnError) {
            this.captureException(report);
          }
        }
      }, {
        key: '_ignoreNextOnError',
        value: function _ignoreNextOnError() {
          var _this = this;

          this._ignoreOnError += 1;
          setTimeout(function () {
            // onerror should trigger before setTimeout
            _this._ignoreOnError -= 1;
          });
        }

        /*
         * Wrap code within a context so Handler can capture errors
         * reliably across domains that is executed immediately.
         *
         * @param {object} options A specific set of options for this context [optional]
         * @param {function} func The callback to be immediately executed within the context
         * @param {array} args An array of arguments to be called with the callback [optional]
         */

      }, {
        key: 'context',
        value: function context(options, func, args) {
          if (isFunction(options)) {
            args = func || [];
            func = options;
            options = undefined;
          }

          return this.wrap(options, func).apply(this, args);
        }
      }, {
        key: 'wrap',


        /*
         * Wrap code within a context and returns back a new function to be executed
         *
         * @param {object} options A specific set of options for this context [optional]
         * @param {function} func The function to be wrapped in a new context
         * @param {function} func A function to call before the try/catch wrapper [optional, private]
         * @return {function} The newly wrapped functions with a context
         */
        value: function wrap(options, func, _before) {
          var self = this;
          // 1 argument has been passed, and it's not a function
          // so just return it
          if (isUndefined(func) && !isFunction(options)) {
            return options;
          }

          // options is optional
          if (isFunction(options)) {
            func = options;
            options = undefined;
          }

          // At this point, we've passed along 2 arguments, and the second one
          // is not a function either, so we'll just return the second argument.
          if (!isFunction(func)) {
            return func;
          }

          // We don't wanna wrap it twice!
          try {
            if (func.__lr__) {
              return func;
            }

            // If this has already been wrapped in the past, return that
            if (func.__lr_wrapper__) {
              return func.__lr_wrapper__;
            }
          } catch (e) {
            // Just accessing custom props in some Selenium environments
            // can cause a "Permission denied" exception (see lr-js#495).
            // Bail on wrapping and return the function as-is (defers to window.onerror).
            return func;
          }

          function wrapped() {
            var args = [],
                i = arguments.length,
                deep = !options || options && options.deep !== false;

            if (_before && isFunction(_before)) {
              _before.apply(this, arguments);
            }

            // Recursively wrap all of a function's arguments that are
            // functions themselves.
            while (i--) {
              args[i] = deep ? self.wrap(options, arguments[i]) : arguments[i];
            }try {
              // Attempt to invoke user-land function. This is part of the LogRocket SDK.
              // If you're seeing this frame in a stack trace, it means that LogRocket caught
              // an unhandled error thrown by your application code, reported it, then bubbled
              // it up. This is expected behavior and is not a bug with LogRocket.
              return func.apply(this, args);
            } catch (e) {
              self._ignoreNextOnError();
              self.captureException(_TraceKit2.default.computeStackTrace(e), options);
              throw e;
            }
          }

          // copy over properties of the old function
          for (var property in func) {
            if (hasKey(func, property)) {
              wrapped[property] = func[property];
            }
          }
          wrapped.prototype = func.prototype;

          func.__lr_wrapper__ = wrapped;
          // Signal that this function has been wrapped already
          // for both debugging and to prevent it to being wrapped twice
          wrapped.__lr__ = true;
          wrapped.__inner__ = func;

          return wrapped;
        }
      }, {
        key: '_instrumentTryCatch',


        /**
         * Install any queued plugins
         */
        value: function _instrumentTryCatch() {
          var self = this;

          var wrappedBuiltIns = self._wrappedBuiltIns;

          function wrapTimeFn(orig) {
            return function (fn, t) {
              // preserve arity
              // Make a copy of the arguments to prevent deoptimization
              // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments
              var args = new Array(arguments.length);
              for (var i = 0; i < args.length; ++i) {
                args[i] = arguments[i];
              }
              var originalCallback = args[0];
              if (isFunction(originalCallback)) {
                args[0] = self.wrap(originalCallback);
              }

              // IE < 9 doesn't support .call/.apply on setInterval/setTimeout, but it
              // also supports only two arguments and doesn't care what this is, so we
              // can just call the original function directly.
              if (orig.apply) {
                return orig.apply(this, args);
              } else {
                return orig(args[0], args[1]);
              }
            };
          }

          function wrapEventTarget(global) {
            var proto = _window[global] && _window[global].prototype;
            if (proto && proto.hasOwnProperty && proto.hasOwnProperty('addEventListener')) {
              fill(proto, 'addEventListener', function (orig) {
                return function (evtName, fn, capture, secure) {
                  // preserve arity
                  try {
                    if (fn && fn.handleEvent) {
                      fn.handleEvent = self.wrap(fn.handleEvent);
                    }
                  } catch (err) {}
                  // can sometimes get 'Permission denied to access property "handle Event'


                  // More breadcrumb DOM capture ... done here and not in `_instrumentBreadcrumbs`
                  // so that we don't have more than one wrapper function
                  var before;

                  return orig.call(this, evtName, self.wrap(fn, undefined, before), capture, secure);
                };
              }, wrappedBuiltIns);
              fill(proto, 'removeEventListener', function (orig) {
                return function (evt, fn, capture, secure) {
                  try {
                    fn = fn && (fn.__lr_wrapper__ ? fn.__lr_wrapper__ : fn);
                  } catch (e) {
                    // ignore, accessing __lr_wrapper__ will throw in some Selenium environments
                  }
                  return orig.call(this, evt, fn, capture, secure);
                };
              }, wrappedBuiltIns);
            }
          }

          fill(_window, 'setTimeout', wrapTimeFn, wrappedBuiltIns);
          fill(_window, 'setInterval', wrapTimeFn, wrappedBuiltIns);
          if (_window.requestAnimationFrame) {
            fill(_window, 'requestAnimationFrame', function (orig) {
              return function (cb) {
                return orig(self.wrap(cb));
              };
            }, wrappedBuiltIns);
          }

          // event targets borrowed from bugsnag-js:
          // https://github.com/bugsnag/bugsnag-js/blob/master/src/bugsnag.js#L666
          var eventTargets = ['EventTarget', 'Window', 'Node', 'ApplicationCache', 'AudioTrackList', 'ChannelMergerNode', 'CryptoOperation', 'EventSource', 'FileReader', 'HTMLUnknownElement', 'IDBDatabase', 'IDBRequest', 'IDBTransaction', 'KeyOperation', 'MediaController', 'MessagePort', 'ModalWindow', 'Notification', 'SVGElementInstance', 'Screen', 'TextTrack', 'TextTrackCue', 'TextTrackList', 'WebSocket', 'WebSocketWorker', 'Worker', 'XMLHttpRequest', 'XMLHttpRequestEventTarget', 'XMLHttpRequestUpload'];
          for (var i = 0; i < eventTargets.length; i++) {
            wrapEventTarget(eventTargets[i]);
          }

          var $ = _window.jQuery || _window.$;
          if ($ && $.fn && $.fn.ready) {
            fill($.fn, 'ready', function (orig) {
              return function (fn) {
                return orig.call(this, self.wrap(fn));
              };
            }, wrappedBuiltIns);
          }
        }
      }]);

      return Handler;
    }();

    exports.default = Handler;
    /* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")));

    /***/ }),

    /***/ "./packages/@apphub:logrocket-exceptions/src/registerExceptions.js":
    /*!*************************************************************************!*\
      !*** ./packages/@apphub:logrocket-exceptions/src/registerExceptions.js ***!
      \*************************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = registerCore;

    var _raven = __webpack_require__(/*! ./raven/raven */ "./packages/@apphub:logrocket-exceptions/src/raven/raven.js");

    var _raven2 = _interopRequireDefault(_raven);

    var _Capture = __webpack_require__(/*! ./Capture */ "./packages/@apphub:logrocket-exceptions/src/Capture.js");

    var Capture = _interopRequireWildcard(_Capture);

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function registerCore(logger) {
      var raven = new _raven2.default({
        captureException: function captureException(errorReport) {
          Capture.captureException(logger, null, null, errorReport);
        }
      });

      var rejectionHandler = function rejectionHandler(evt) {
        // http://2ality.com/2016/04/unhandled-rejections.html
        logger.addEvent('lr.core.Exception', function () {
          return {
            exceptionType: 'UNHANDLED_REJECTION',
            message: evt.reason || 'Unhandled Promise rejection'
          };
        });
      };

      window.addEventListener('unhandledrejection', rejectionHandler);

      return function () {
        window.removeEventListener('unhandledrejection', rejectionHandler);
        raven.uninstall();
      };
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-exceptions/src/stackTraceFromError.js":
    /*!**************************************************************************!*\
      !*** ./packages/@apphub:logrocket-exceptions/src/stackTraceFromError.js ***!
      \**************************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = stackTraceFromError;
    function stackTraceFromError(errorReport) {
      function makeNotNull(val) {
        return val === null ? undefined : val;
      }

      return errorReport.stack ? errorReport.stack.map(function (frame) {
        return {
          lineNumber: makeNotNull(frame.line),
          columnNumber: makeNotNull(frame.column),
          fileName: makeNotNull(frame.url),
          functionName: makeNotNull(frame.func)
        };
      }) : undefined;
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-network/src/fetchIntercept.js":
    /*!******************************************************************!*\
      !*** ./packages/@apphub:logrocket-network/src/fetchIntercept.js ***!
      \******************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _registerXHR = __webpack_require__(/*! ./registerXHR */ "./packages/@apphub:logrocket-network/src/registerXHR.js");

    function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    var interceptors = [];

    function makeInterceptor(fetch, fetchId) {
      for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }

      var reversedInterceptors = interceptors.reduce(function (array, interceptor) {
        return [interceptor].concat(array);
      }, []);
      var promise = Promise.resolve(args);

      // Register request interceptors
      reversedInterceptors.forEach(function (_ref) {
        var request = _ref.request,
            requestError = _ref.requestError;

        if (request || requestError) {
          promise = promise.then(function (args) {
            return request.apply(undefined, [fetchId].concat(_toConsumableArray(args)));
          }, function (args) {
            return requestError.apply(undefined, [fetchId].concat(_toConsumableArray(args)));
          });
        }
      });

      promise = promise.then(function (args) {
        (0, _registerXHR.setActive)(false);

        var res = void 0;
        var err = void 0;
        try {
          res = fetch.apply(undefined, _toConsumableArray(args));
        } catch (_err) {
          err = _err;
        }

        (0, _registerXHR.setActive)(true);

        if (err) {
          throw err;
        }
        return res;
      });

      reversedInterceptors.forEach(function (_ref2) {
        var response = _ref2.response,
            responseError = _ref2.responseError;

        if (response || responseError) {
          promise = promise.then(function (res) {
            return response(fetchId, res);
          }, function (err) {
            return responseError && responseError(fetchId, err);
          });
        }
      });

      return promise;
    }

    function attach(env) {
      if (!env.fetch || !env.Promise) {
        // Make sure fetch is available in the given environment. If it's not, then
        // default to using XHR intercept.
        return;
      }

      var isPolyfill = env.fetch.polyfill;

      // eslint-disable-next-line no-param-reassign
      env.fetch = function (fetch) {
        var fetchId = 0;

        return function () {
          for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          return makeInterceptor.apply(undefined, [fetch, fetchId++].concat(args));
        };
      }(env.fetch);

      // Forward the polyfill properly from fetch (set by github/whatwg-fetch).
      if (isPolyfill) {
        // eslint-disable-next-line no-param-reassign
        env.fetch.polyfill = isPolyfill;
      }
    }

    // TODO: React Native
    //   attach(global);

    var didAttach = false;

    exports.default = {
      register: function register(interceptor) {
        if (!didAttach) {
          didAttach = true;
          attach(window);
        }

        interceptors.push(interceptor);
        return function () {
          var index = interceptors.indexOf(interceptor);

          if (index >= 0) {
            interceptors.splice(index, 1);
          }
        };
      },
      clear: function clear() {
        interceptors = [];
      }
    };

    /***/ }),

    /***/ "./packages/@apphub:logrocket-network/src/index.js":
    /*!*********************************************************!*\
      !*** ./packages/@apphub:logrocket-network/src/index.js ***!
      \*********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    exports.default = registerNetwork;

    var _registerFetch = __webpack_require__(/*! ./registerFetch */ "./packages/@apphub:logrocket-network/src/registerFetch.js");

    var _registerFetch2 = _interopRequireDefault(_registerFetch);

    var _registerXHR = __webpack_require__(/*! ./registerXHR */ "./packages/@apphub:logrocket-network/src/registerXHR.js");

    var _registerXHR2 = _interopRequireDefault(_registerXHR);

    var _mapValues = __webpack_require__(/*! @apphub/logrocket-utils/src/mapValues */ "./packages/@apphub:logrocket-utils/src/mapValues.js");

    var _mapValues2 = _interopRequireDefault(_mapValues);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function registerNetwork(logger) {
      var ignoredNetwork = {};

      // truncate if > 4MB in size
      var truncate = function truncate(data) {
        var limit = 1024 * 1000 * 4;
        var str = data;

        if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object' && data != null) {
          var proto = Object.getPrototypeOf(data);

          if (proto === Object.prototype || proto === null) {
            // plain object - jsonify for the size check
            str = JSON.stringify(data);
          }
        }

        if (str && str.length && str.length > limit && typeof str === 'string') {
          var beginning = str.substring(0, 1000);
          return beginning + ' ... LogRocket truncating to first 1000 characters.\n      Keep data under 4MB to prevent truncation. https://docs.logrocket.com/reference#network';
        }

        return data;
      };

      var addRequest = function addRequest(reqId, request) {
        var method = request.method;
        logger.addEvent('lr.network.RequestEvent', function () {
          var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
              _ref$isEnabled = _ref.isEnabled,
              isEnabled = _ref$isEnabled === undefined ? true : _ref$isEnabled,
              _ref$requestSanitizer = _ref.requestSanitizer,
              requestSanitizer = _ref$requestSanitizer === undefined ? function (f) {
            return f;
          } : _ref$requestSanitizer;

          if (!isEnabled) {
            return null;
          }
          var sanitized = null;
          try {
            // only try catch user defined functions
            sanitized = requestSanitizer(request);
          } catch (err) {
            console.error(err);
          }
          if (sanitized) {
            // Writing and then reading from an a tag turns a relative
            // url into an absolute one.
            var a = document.createElement('a');
            a.href = sanitized.url;

            return {
              reqId: reqId, // default
              url: a.href, // sanitized
              headers: (0, _mapValues2.default)(sanitized.headers, function (headerValue) {
                // sanitized
                return '' + headerValue;
              }),
              body: truncate(sanitized.body), // sanitized
              method: method, // default
              referrer: sanitized.referrer || undefined, // sanitized
              mode: sanitized.mode || undefined, // sanitized
              credentials: sanitized.credentials || undefined // sanitized
            };
          }
          ignoredNetwork[reqId] = true;
          return null;
        });
      };

      var addResponse = function addResponse(reqId, response) {
        var method = response.method,
            status = response.status;

        logger.addEvent('lr.network.ResponseEvent', function () {
          var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
              _ref2$isEnabled = _ref2.isEnabled,
              isEnabled = _ref2$isEnabled === undefined ? true : _ref2$isEnabled,
              _ref2$responseSanitiz = _ref2.responseSanitizer,
              responseSanitizer = _ref2$responseSanitiz === undefined ? function (f) {
            return f;
          } : _ref2$responseSanitiz;

          if (!isEnabled) {
            return null;
          } else if (ignoredNetwork[reqId]) {
            delete ignoredNetwork[reqId];
            return null;
          }
          var sanitized = null;

          try {
            // only try catch user defined functions
            sanitized = responseSanitizer(response);
          } catch (err) {
            console.error(err);
            // fall through to redacted log
          }
          if (sanitized) {
            return {
              reqId: reqId, // default
              status: sanitized.status, // sanitized
              headers: (0, _mapValues2.default)(sanitized.headers, function (headerValue) {
                // sanitized
                return '' + headerValue;
              }),
              body: truncate(sanitized.body), // sanitized
              method: method // default
            };
          }
          return {
            reqId: reqId, // default
            status: status, // default
            headers: {}, // redacted
            body: null, // redacted
            method: method // default
          };
        });
      };

      var isIgnored = function isIgnored(reqId) {
        return ignoredNetwork[reqId] === true;
      };

      var unsubFetch = (0, _registerFetch2.default)({ addRequest: addRequest, addResponse: addResponse, isIgnored: isIgnored });
      var unsubXHR = (0, _registerXHR2.default)({
        addRequest: addRequest,
        addResponse: addResponse,
        isIgnored: isIgnored,
        shouldCloneResponse: logger._shouldCloneResponse
      });

      return function () {
        unsubFetch();
        unsubXHR();
      };
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-network/src/registerFetch.js":
    /*!*****************************************************************!*\
      !*** ./packages/@apphub:logrocket-network/src/registerFetch.js ***!
      \*****************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

    exports.default = registerFetch;

    var _mapValues = __webpack_require__(/*! @apphub/logrocket-utils/src/mapValues */ "./packages/@apphub:logrocket-utils/src/mapValues.js");

    var _mapValues2 = _interopRequireDefault(_mapValues);

    var _fetchIntercept = __webpack_require__(/*! ./fetchIntercept */ "./packages/@apphub:logrocket-network/src/fetchIntercept.js");

    var _fetchIntercept2 = _interopRequireDefault(_fetchIntercept);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function makeObjectFromHeaders(headers) {
      // If using real fetch, we must stringify the Headers object.
      if (headers == null || typeof headers.forEach !== 'function') {
        return headers;
      }

      var result = {};
      headers.forEach(function (value, key) {
        if (result[key]) {
          result[key] = result[key] + ',' + value;
        } else {
          result[key] = '' + value;
        }
      });
      return result;
    }

    // XHR specification is unclear of what types to allow in value so using toString method for now
    var stringifyHeaders = function stringifyHeaders(headers) {
      return (0, _mapValues2.default)(makeObjectFromHeaders(headers), function (value) {
        return '' + value;
      });
    };

    function pluckFetchFields() {
      var arg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return {
        url: arg.url,
        headers: stringifyHeaders(arg.headers),
        method: arg.method && arg.method.toUpperCase(),
        referrer: arg.referrer || undefined,
        mode: arg.mode || undefined,
        credentials: arg.credentials || undefined
      };
    }

    function registerFetch(_ref) {
      var addRequest = _ref.addRequest,
          addResponse = _ref.addResponse,
          isIgnored = _ref.isIgnored;

      var LOGROCKET_FETCH_LABEL = 'fetch-';
      var fetchMethodMap = {};

      var unregister = _fetchIntercept2.default.register({
        request: function request(fetchId) {
          for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          var p = void 0;

          if (typeof Request !== 'undefined' && args[0] instanceof Request) {
            var clonedText = void 0;

            // Request.clone() and Request.text() may throw in Safari (e.g., when
            // request body contains FormData)
            try {
              clonedText = args[0].clone().text();
            } catch (err) {
              clonedText = Promise.resolve('LogRocket fetch error: ' + err.message);
            }

            p = clonedText.then(function (body) {
              return _extends({}, pluckFetchFields(args[0]), {
                body: body
              });
            }, function (err) {
              return _extends({}, pluckFetchFields(args[0]), {
                body: 'LogRocket fetch error: ' + err.message
              });
            });
          } else {
            p = Promise.resolve(_extends({}, pluckFetchFields(args[1]), {
              url: '' + args[0],
              body: (args[1] || {}).body
            }));
          }

          return p.then(function (req) {
            fetchMethodMap[fetchId] = req.method;
            addRequest('' + LOGROCKET_FETCH_LABEL + fetchId, req);
            return args;
          });
        },
        requestError: function requestError(fetchId, error) {
          return Promise.reject(error);
        },
        response: function response(fetchId, _response) {
          var clonedText = void 0;

          if (isIgnored('' + LOGROCKET_FETCH_LABEL + fetchId)) {
            // Don't even try to read ignored requests
            return _response;
          }

          try {
            // TODO: enhance function on original response and future clones for:
            // text(), json(), blob(), formdata(), arraybuffer()
            clonedText = _response.clone().text();
          } catch (err) {
            // safari has a bug where cloning can fail
            clonedText = Promise.resolve('LogRocket fetch error: ' + err.message);
          }

          return clonedText.then(function (data) {
            var responseHash = {
              url: _response.url,
              status: _response.status,
              headers: stringifyHeaders(_response.headers),
              body: data,
              method: fetchMethodMap[fetchId]
            };
            delete fetchMethodMap[fetchId];
            addResponse('' + LOGROCKET_FETCH_LABEL + fetchId, responseHash);
            return _response;
          });
        },
        responseError: function responseError(fetchId, error) {
          var response = {
            url: undefined,
            status: 0,
            headers: {},
            body: '' + error
          };
          addResponse('' + LOGROCKET_FETCH_LABEL + fetchId, response);
          return Promise.reject(error);
        }
      });

      return unregister;
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-network/src/registerXHR.js":
    /*!***************************************************************!*\
      !*** ./packages/@apphub:logrocket-network/src/registerXHR.js ***!
      \***************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.setActive = setActive;
    exports.default = registerXHR;

    var _mapValues = __webpack_require__(/*! @apphub/logrocket-utils/src/mapValues */ "./packages/@apphub:logrocket-utils/src/mapValues.js");

    var _mapValues2 = _interopRequireDefault(_mapValues);

    var _enhanceFunc = __webpack_require__(/*! @apphub/logrocket-utils/src/enhanceFunc */ "./packages/@apphub:logrocket-utils/src/enhanceFunc.js");

    var _enhanceFunc2 = _interopRequireDefault(_enhanceFunc);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var isActive = true;

    function setActive(shouldBeActive) {
      isActive = shouldBeActive;
    }

    var currentXHRId = 0;
    function registerXHR(_ref) {
      var addRequest = _ref.addRequest,
          addResponse = _ref.addResponse,
          isIgnored = _ref.isIgnored,
          _ref$shouldCloneRespo = _ref.shouldCloneResponse,
          shouldCloneResponse = _ref$shouldCloneRespo === undefined ? false : _ref$shouldCloneRespo;

      var _XHR = XMLHttpRequest;
      var xhrMap = new WeakMap();
      var unsubscribedFromXhr = false;
      var LOGROCKET_XHR_LABEL = 'xhr-';

      window._lrXMLHttpRequest = XMLHttpRequest;

      // eslint-disable-next-line no-native-reassign
      XMLHttpRequest = function XMLHttpRequest(mozAnon, mozSystem) {
        var xhrObject = new _XHR(mozAnon, mozSystem);
        if (!isActive) {
          return xhrObject;
        }

        xhrMap.set(xhrObject, {
          xhrId: ++currentXHRId,
          headers: {}
        });

        // ..., 'open', (method, url, async, username, password) => {
        (0, _enhanceFunc2.default)(xhrObject, 'open', function (method, url) {
          if (unsubscribedFromXhr) return;
          var currentXHR = xhrMap.get(xhrObject);
          currentXHR.method = method;
          currentXHR.url = url;
        });

        (0, _enhanceFunc2.default)(xhrObject, 'send', function (data) {
          if (unsubscribedFromXhr) return;
          var currentXHR = xhrMap.get(xhrObject);
          if (!currentXHR) return;

          var request = {
            url: currentXHR.url,
            method: currentXHR.method && currentXHR.method.toUpperCase(),
            headers: (0, _mapValues2.default)(currentXHR.headers || {}, function (headerValues) {
              return headerValues.join(', ');
            }),
            body: data
          };
          addRequest('' + LOGROCKET_XHR_LABEL + currentXHR.xhrId, request);
        });

        (0, _enhanceFunc2.default)(xhrObject, 'setRequestHeader', function (header, value) {
          if (unsubscribedFromXhr) return;
          var currentXHR = xhrMap.get(xhrObject);
          if (!currentXHR) return;

          currentXHR.headers = currentXHR.headers || {};
          currentXHR.headers[header] = currentXHR.headers[header] || [];
          currentXHR.headers[header].push(value);
        });

        var xhrListeners = {
          readystatechange: function readystatechange() {
            if (unsubscribedFromXhr) return;

            if (xhrObject.readyState === 4) {
              var currentXHR = xhrMap.get(xhrObject);
              if (!currentXHR) return;

              // Do not read ignored requests at all.
              if (isIgnored('' + LOGROCKET_XHR_LABEL + currentXHR.xhrId)) return;

              var headerString = xhrObject.getAllResponseHeaders();

              var headers = headerString.split(/[\r\n]+/).reduce(function (previous, current) {
                var next = previous;
                var headerParts = current.split(': ');
                if (headerParts.length > 0) {
                  var key = headerParts.shift(); // first index of the array
                  var value = headerParts.join(': '); // rest of the array repaired
                  if (previous[key]) {
                    next[key] += ', ' + value;
                  } else {
                    next[key] = value;
                  }
                }
                return next;
              }, {});

              var body = void 0;

              // IE 11 sometimes throws when trying to access large responses
              try {
                switch (xhrObject.responseType) {
                  case 'json':
                    body = shouldCloneResponse ? JSON.parse(JSON.stringify(xhrObject.response)) : xhrObject.response;
                    break;
                  case 'arraybuffer':
                  case 'blob':
                    {
                      body = xhrObject.response;
                      break;
                    }
                  case 'document':
                    {
                      body = xhrObject.responseXML;
                      break;
                    }
                  case 'text':
                  case '':
                    {
                      body = xhrObject.responseText;
                      break;
                    }
                  default:
                    {
                      body = '';
                    }
                }
              } catch (err) {
                body = 'LogRocket: Error accessing response.';
              }

              var response = {
                url: currentXHR.url,
                status: xhrObject.status,
                headers: headers,
                body: body,
                method: (currentXHR.method || '').toUpperCase()
              };

              addResponse('' + LOGROCKET_XHR_LABEL + currentXHR.xhrId, response);
            }
          }
          // // Unused Event Listeners
          // loadstart: () => {},
          // progress: () => {},
          // abort: () => {},
          // error: () => {},
          // load: () => {},
          // timeout: () => {},
          // loadend: () => {},
        };

        Object.keys(xhrListeners).forEach(function (key) {
          xhrObject.addEventListener(key, xhrListeners[key]);
        });

        return xhrObject;
      };

      // this allows "instanceof XMLHttpRequest" to work
      XMLHttpRequest.prototype = _XHR.prototype;

      // Persist the static variables.
      ['UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'].forEach(function (variable) {
        XMLHttpRequest[variable] = _XHR[variable];
      });

      return function () {
        unsubscribedFromXhr = true;
        // eslint-disable-next-line no-native-reassign
        XMLHttpRequest = _XHR;
      };
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-redux/src/createEnhancer.js":
    /*!****************************************************************!*\
      !*** ./packages/@apphub:logrocket-redux/src/createEnhancer.js ***!
      \****************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

    exports.default = createEnhancer;

    var _now = __webpack_require__(/*! @apphub/now */ "./packages/@apphub:now/src/index.js");

    var _now2 = _interopRequireDefault(_now);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var storeIdCounter = 0;

    function createEnhancer(logger) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref$stateSanitizer = _ref.stateSanitizer,
          stateSanitizer = _ref$stateSanitizer === undefined ? function (f) {
        return f;
      } : _ref$stateSanitizer,
          _ref$actionSanitizer = _ref.actionSanitizer,
          actionSanitizer = _ref$actionSanitizer === undefined ? function (f) {
        return f;
      } : _ref$actionSanitizer;

      // an enhancer is a function that returns a Store
      return function (createStore) {
        return function (reducer, initialState, enhancer) {
          var store = createStore(reducer, initialState, enhancer);
          var originalDispatch = store.dispatch;
          var storeId = storeIdCounter++;
          logger.addEvent('lr.redux.InitialState', function () {
            var sanitizedState = void 0;
            try {
              // only try catch user defined functions
              sanitizedState = stateSanitizer(store.getState());
            } catch (err) {
              console.error(err.toString());
            }

            return {
              state: sanitizedState,
              storeId: storeId
            };
          });

          var dispatch = function dispatch(action) {
            var start = (0, _now2.default)();

            var err = void 0;
            var res = void 0;
            try {
              res = originalDispatch(action);
            } catch (_err) {
              err = _err;
            } finally {
              var duration = (0, _now2.default)() - start;

              logger.addEvent('lr.redux.ReduxAction', function () {
                var sanitizedState = null;
                var sanitizedAction = null;

                try {
                  // only try catch user defined functions
                  sanitizedState = stateSanitizer(store.getState());
                  sanitizedAction = actionSanitizer(action);
                } catch (err) {
                  console.error(err.toString());
                }

                if (sanitizedState && sanitizedAction) {
                  return {
                    storeId: storeId,
                    action: sanitizedAction,
                    duration: duration,
                    stateDelta: sanitizedState
                  };
                }
                return null;
              });
            }

            if (err) {
              throw err;
            }

            return res;
          };

          return _extends({}, store, {
            dispatch: dispatch
          });
        };
      };
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-redux/src/createMiddleware.js":
    /*!******************************************************************!*\
      !*** ./packages/@apphub:logrocket-redux/src/createMiddleware.js ***!
      \******************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = createMiddleware;

    var _now = __webpack_require__(/*! @apphub/now */ "./packages/@apphub:now/src/index.js");

    var _now2 = _interopRequireDefault(_now);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var storeIdCounter = 0;

    function createMiddleware(logger) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref$stateSanitizer = _ref.stateSanitizer,
          stateSanitizer = _ref$stateSanitizer === undefined ? function (f) {
        return f;
      } : _ref$stateSanitizer,
          _ref$actionSanitizer = _ref.actionSanitizer,
          actionSanitizer = _ref$actionSanitizer === undefined ? function (f) {
        return f;
      } : _ref$actionSanitizer;

      return function (store) {
        var storeId = storeIdCounter++;
        logger.addEvent('lr.redux.InitialState', function () {
          var sanitizedState = void 0;
          try {
            // only try catch user defined functions
            sanitizedState = stateSanitizer(store.getState());
          } catch (err) {
            console.error(err.toString());
          }

          return {
            state: sanitizedState,
            storeId: storeId
          };
        });

        return function (next) {
          return function (action) {
            var start = (0, _now2.default)();

            var err = void 0;
            var res = void 0;
            try {
              res = next(action);
            } catch (_err) {
              err = _err;
            } finally {
              var duration = (0, _now2.default)() - start;

              logger.addEvent('lr.redux.ReduxAction', function () {
                var sanitizedState = null;
                var sanitizedAction = null;

                try {
                  // only try catch user defined functions
                  sanitizedState = stateSanitizer(store.getState());
                  sanitizedAction = actionSanitizer(action);
                } catch (err) {
                  console.error(err.toString());
                }

                if (sanitizedState && sanitizedAction) {
                  return {
                    storeId: storeId,
                    action: sanitizedAction,
                    duration: duration,
                    stateDelta: sanitizedState
                  };
                }
                return null;
              });
            }

            if (err) {
              throw err;
            }

            return res;
          };
        };
      };
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-redux/src/index.js":
    /*!*******************************************************!*\
      !*** ./packages/@apphub:logrocket-redux/src/index.js ***!
      \*******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.createEnhancer = exports.createMiddleware = undefined;

    var _createEnhancer = __webpack_require__(/*! ./createEnhancer */ "./packages/@apphub:logrocket-redux/src/createEnhancer.js");

    var _createEnhancer2 = _interopRequireDefault(_createEnhancer);

    var _createMiddleware = __webpack_require__(/*! ./createMiddleware */ "./packages/@apphub:logrocket-redux/src/createMiddleware.js");

    var _createMiddleware2 = _interopRequireDefault(_createMiddleware);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    exports.createMiddleware = _createMiddleware2.default;
    exports.createEnhancer = _createEnhancer2.default;

    /***/ }),

    /***/ "./packages/@apphub:logrocket-utils/src/TraceKit.js":
    /*!**********************************************************!*\
      !*** ./packages/@apphub:logrocket-utils/src/TraceKit.js ***!
      \**********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {
    /* WEBPACK VAR INJECTION */(function(global) {/* eslint-disable */



    /*
     TraceKit - Cross brower stack traces - github.com/occ/TraceKit

     This was originally forked from github.com/occ/TraceKit, but has since been
     largely re-written and is now maintained as part of raven-js.  Tests for
     this are in test/vendor.

     MIT license
    */

    var TraceKit = {
        collectWindowErrors: true,
        debug: false
    };

    // This is to be defensive in environments where window does not exist (see https://github.com/getsentry/raven-js/pull/785)
    var _window = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    // global reference to slice
    var _slice = [].slice;
    var UNKNOWN_FUNCTION = '?';

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Error_types
    var ERROR_TYPES_RE = /^(?:Uncaught (?:exception: )?)?((?:Eval|Internal|Range|Reference|Syntax|Type|URI)Error): ?(.*)$/;

    function getLocationHref() {
        if (typeof document === 'undefined' || typeof document.location === 'undefined') return '';

        return document.location.href;
    }

    /**
     * TraceKit.report: cross-browser processing of unhandled exceptions
     *
     * Syntax:
     *   TraceKit.report.subscribe(function(stackInfo) { ... })
     *   TraceKit.report.unsubscribe(function(stackInfo) { ... })
     *   TraceKit.report(exception)
     *   try { ...code... } catch(ex) { TraceKit.report(ex); }
     *
     * Supports:
     *   - Firefox: full stack trace with line numbers, plus column number
     *              on top frame; column number is not guaranteed
     *   - Opera:   full stack trace with line and column numbers
     *   - Chrome:  full stack trace with line and column numbers
     *   - Safari:  line and column number for the top frame only; some frames
     *              may be missing, and column number is not guaranteed
     *   - IE:      line and column number for the top frame only; some frames
     *              may be missing, and column number is not guaranteed
     *
     * In theory, TraceKit should work on all of the following versions:
     *   - IE5.5+ (only 8.0 tested)
     *   - Firefox 0.9+ (only 3.5+ tested)
     *   - Opera 7+ (only 10.50 tested; versions 9 and earlier may require
     *     Exceptions Have Stacktrace to be enabled in opera:config)
     *   - Safari 3+ (only 4+ tested)
     *   - Chrome 1+ (only 5+ tested)
     *   - Konqueror 3.5+ (untested)
     *
     * Requires TraceKit.computeStackTrace.
     *
     * Tries to catch all unhandled exceptions and report them to the
     * subscribed handlers. Please note that TraceKit.report will rethrow the
     * exception. This is REQUIRED in order to get a useful stack trace in IE.
     * If the exception does not reach the top of the browser, you will only
     * get a stack trace from the point where TraceKit.report was called.
     *
     * Handlers receive a stackInfo object as described in the
     * TraceKit.computeStackTrace docs.
     */
    TraceKit.report = function reportModuleWrapper() {
        var handlers = [],
            lastArgs = null,
            lastException = null,
            lastExceptionStack = null;

        /**
         * Add a crash handler.
         * @param {Function} handler
         */
        function subscribe(handler) {
            installGlobalHandler();
            handlers.push(handler);
        }

        /**
         * Remove a crash handler.
         * @param {Function} handler
         */
        function unsubscribe(handler) {
            for (var i = handlers.length - 1; i >= 0; --i) {
                if (handlers[i] === handler) {
                    handlers.splice(i, 1);
                }
            }
        }

        /**
         * Remove all crash handlers.
         */
        function unsubscribeAll() {
            uninstallGlobalHandler();
            handlers = [];
        }

        /**
         * Dispatch stack information to all handlers.
         * @param {Object.<string, *>} stack
         */
        function notifyHandlers(stack, isWindowError) {
            var exception = null;
            if (isWindowError && !TraceKit.collectWindowErrors) {
                return;
            }
            for (var i in handlers) {
                if (handlers.hasOwnProperty(i)) {
                    try {
                        handlers[i].apply(null, [stack].concat(_slice.call(arguments, 2)));
                    } catch (inner) {
                        exception = inner;
                    }
                }
            }

            if (exception) {
                throw exception;
            }
        }

        var _oldOnerrorHandler, _onErrorHandlerInstalled;

        /**
         * Ensures all global unhandled exceptions are recorded.
         * Supported by Gecko and IE.
         * @param {string} message Error message.
         * @param {string} url URL of script that generated the exception.
         * @param {(number|string)} lineNo The line number at which the error
         * occurred.
         * @param {?(number|string)} colNo The column number at which the error
         * occurred.
         * @param {?Error} ex The actual Error object.
         */
        function traceKitWindowOnError(message, url, lineNo, colNo, ex) {
            var stack = null;

            if (lastExceptionStack) {
                TraceKit.computeStackTrace.augmentStackTraceWithInitialElement(lastExceptionStack, url, lineNo, message);
                processLastException();
            } else if (ex) {
                // New chrome and blink send along a real error object
                // Let's just report that like a normal error.
                // See: https://mikewest.org/2013/08/debugging-runtime-errors-with-window-onerror
                stack = TraceKit.computeStackTrace(ex);
                notifyHandlers(stack, true);
            } else {
                var location = {
                    'url': url,
                    'line': lineNo,
                    'column': colNo
                };

                var name = undefined;
                var msg = message; // must be new var or will modify original `arguments`
                var groups;
                if ({}.toString.call(message) === '[object String]') {
                    var groups = message.match(ERROR_TYPES_RE);
                    if (groups) {
                        name = groups[1];
                        msg = groups[2];
                    }
                }

                location.func = UNKNOWN_FUNCTION;

                stack = {
                    'name': name,
                    'message': msg,
                    'url': getLocationHref(),
                    'stack': [location]
                };
                notifyHandlers(stack, true);
            }

            if (_oldOnerrorHandler) {
                return _oldOnerrorHandler.apply(this, arguments);
            }

            return false;
        }

        function installGlobalHandler() {
            if (_onErrorHandlerInstalled) {
                return;
            }
            _oldOnerrorHandler = _window.onerror;
            _window.onerror = traceKitWindowOnError;
            _onErrorHandlerInstalled = true;
        }

        function uninstallGlobalHandler() {
            if (!_onErrorHandlerInstalled) {
                return;
            }
            _window.onerror = _oldOnerrorHandler;
            _onErrorHandlerInstalled = false;
            _oldOnerrorHandler = undefined;
        }

        function processLastException() {
            var _lastExceptionStack = lastExceptionStack,
                _lastArgs = lastArgs;
            lastArgs = null;
            lastExceptionStack = null;
            lastException = null;
            notifyHandlers.apply(null, [_lastExceptionStack, false].concat(_lastArgs));
        }

        /**
         * Reports an unhandled Error to TraceKit.
         * @param {Error} ex
         * @param {?boolean} rethrow If false, do not re-throw the exception.
         * Only used for window.onerror to not cause an infinite loop of
         * rethrowing.
         */
        function report(ex, rethrow) {
            var args = _slice.call(arguments, 1);
            if (lastExceptionStack) {
                if (lastException === ex) {
                    return; // already caught by an inner catch block, ignore
                } else {
                    processLastException();
                }
            }

            var stack = TraceKit.computeStackTrace(ex);
            lastExceptionStack = stack;
            lastException = ex;
            lastArgs = args;

            // If the stack trace is incomplete, wait for 2 seconds for
            // slow slow IE to see if onerror occurs or not before reporting
            // this exception; otherwise, we will end up with an incomplete
            // stack trace
            setTimeout(function () {
                if (lastException === ex) {
                    processLastException();
                }
            }, stack.incomplete ? 2000 : 0);

            if (rethrow !== false) {
                throw ex; // re-throw to propagate to the top level (and cause window.onerror)
            }
        }

        report.subscribe = subscribe;
        report.unsubscribe = unsubscribe;
        report.uninstall = unsubscribeAll;
        return report;
    }();

    /**
     * TraceKit.computeStackTrace: cross-browser stack traces in JavaScript
     *
     * Syntax:
     *   s = TraceKit.computeStackTrace(exception) // consider using TraceKit.report instead (see below)
     * Returns:
     *   s.name              - exception name
     *   s.message           - exception message
     *   s.stack[i].url      - JavaScript or HTML file URL
     *   s.stack[i].func     - function name, or empty for anonymous functions (if guessing did not work)
     *   s.stack[i].args     - arguments passed to the function, if known
     *   s.stack[i].line     - line number, if known
     *   s.stack[i].column   - column number, if known
     *
     * Supports:
     *   - Firefox:  full stack trace with line numbers and unreliable column
     *               number on top frame
     *   - Opera 10: full stack trace with line and column numbers
     *   - Opera 9-: full stack trace with line numbers
     *   - Chrome:   full stack trace with line and column numbers
     *   - Safari:   line and column number for the topmost stacktrace element
     *               only
     *   - IE:       no line numbers whatsoever
     *
     * Tries to guess names of anonymous functions by looking for assignments
     * in the source code. In IE and Safari, we have to guess source file names
     * by searching for function bodies inside all page scripts. This will not
     * work for scripts that are loaded cross-domain.
     * Here be dragons: some function names may be guessed incorrectly, and
     * duplicate functions may be mismatched.
     *
     * TraceKit.computeStackTrace should only be used for tracing purposes.
     * Logging of unhandled exceptions should be done with TraceKit.report,
     * which builds on top of TraceKit.computeStackTrace and provides better
     * IE support by utilizing the window.onerror event to retrieve information
     * about the top of the stack.
     *
     * Note: In IE and Safari, no stack trace is recorded on the Error object,
     * so computeStackTrace instead walks its *own* chain of callers.
     * This means that:
     *  * in Safari, some methods may be missing from the stack trace;
     *  * in IE, the topmost function in the stack trace will always be the
     *    caller of computeStackTrace.
     *
     * This is okay for tracing (because you are likely to be calling
     * computeStackTrace from the function you want to be the topmost element
     * of the stack trace anyway), but not okay for logging unhandled
     * exceptions (because your catch block will likely be far away from the
     * inner function that actually caused the exception).
     *
     */
    TraceKit.computeStackTrace = function computeStackTraceWrapper() {

        // Contents of Exception in various browsers.
        //
        // SAFARI:
        // ex.message = Can't find variable: qq
        // ex.line = 59
        // ex.sourceId = 580238192
        // ex.sourceURL = http://...
        // ex.expressionBeginOffset = 96
        // ex.expressionCaretOffset = 98
        // ex.expressionEndOffset = 98
        // ex.name = ReferenceError
        //
        // FIREFOX:
        // ex.message = qq is not defined
        // ex.fileName = http://...
        // ex.lineNumber = 59
        // ex.columnNumber = 69
        // ex.stack = ...stack trace... (see the example below)
        // ex.name = ReferenceError
        //
        // CHROME:
        // ex.message = qq is not defined
        // ex.name = ReferenceError
        // ex.type = not_defined
        // ex.arguments = ['aa']
        // ex.stack = ...stack trace...
        //
        // INTERNET EXPLORER:
        // ex.message = ...
        // ex.name = ReferenceError
        //
        // OPERA:
        // ex.message = ...message... (see the example below)
        // ex.name = ReferenceError
        // ex.opera#sourceloc = 11  (pretty much useless, duplicates the info in ex.message)
        // ex.stacktrace = n/a; see 'opera:config#UserPrefs|Exceptions Have Stacktrace'

        /**
         * Computes stack trace information from the stack property.
         * Chrome and Gecko use this property.
         * @param {Error} ex
         * @return {?Object.<string, *>} Stack trace information.
         */
        function computeStackTraceFromStackProp(ex) {
            if (typeof ex.stack === 'undefined' || !ex.stack) return;

            var chrome = /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|<anonymous>).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i,
                gecko = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|resource|\[native).*?)(?::(\d+))?(?::(\d+))?\s*$/i,
                winjs = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i,
                lines = ex.stack.split('\n'),
                stack = [],
                parts,
                element,
                reference = /^(.*) is undefined$/.exec(ex.message);

            for (var i = 0, j = lines.length; i < j; ++i) {
                if (parts = chrome.exec(lines[i])) {
                    var isNative = parts[2] && parts[2].indexOf('native') !== -1;
                    element = {
                        'url': !isNative ? parts[2] : null,
                        'func': parts[1] || UNKNOWN_FUNCTION,
                        'args': isNative ? [parts[2]] : [],
                        'line': parts[3] ? +parts[3] : null,
                        'column': parts[4] ? +parts[4] : null
                    };
                } else if (parts = winjs.exec(lines[i])) {
                    element = {
                        'url': parts[2],
                        'func': parts[1] || UNKNOWN_FUNCTION,
                        'args': [],
                        'line': +parts[3],
                        'column': parts[4] ? +parts[4] : null
                    };
                } else if (parts = gecko.exec(lines[i])) {
                    element = {
                        'url': parts[3],
                        'func': parts[1] || UNKNOWN_FUNCTION,
                        'args': parts[2] ? parts[2].split(',') : [],
                        'line': parts[4] ? +parts[4] : null,
                        'column': parts[5] ? +parts[5] : null
                    };
                } else {
                    continue;
                }

                if (!element.func && element.line) {
                    element.func = UNKNOWN_FUNCTION;
                }

                stack.push(element);
            }

            if (!stack.length) {
                return null;
            }

            if (!stack[0].column && typeof ex.columnNumber !== 'undefined') {
                // FireFox uses this awesome columnNumber property for its top frame
                // Also note, Firefox's column number is 0-based and everything else expects 1-based,
                // so adding 1
                stack[0].column = ex.columnNumber + 1;
            }

            return {
                'name': ex.name,
                'message': ex.message,
                'url': getLocationHref(),
                'stack': stack
            };
        }

        /**
         * Adds information about the first frame to incomplete stack traces.
         * Safari and IE require this to get complete data on the first frame.
         * @param {Object.<string, *>} stackInfo Stack trace information from
         * one of the compute* methods.
         * @param {string} url The URL of the script that caused an error.
         * @param {(number|string)} lineNo The line number of the script that
         * caused an error.
         * @param {string=} message The error generated by the browser, which
         * hopefully contains the name of the object that caused the error.
         * @return {boolean} Whether or not the stack information was
         * augmented.
         */
        function augmentStackTraceWithInitialElement(stackInfo, url, lineNo, message) {
            var initial = {
                'url': url,
                'line': lineNo
            };

            if (initial.url && initial.line) {
                stackInfo.incomplete = false;

                if (!initial.func) {
                    initial.func = UNKNOWN_FUNCTION;
                }

                if (stackInfo.stack.length > 0) {
                    if (stackInfo.stack[0].url === initial.url) {
                        if (stackInfo.stack[0].line === initial.line) {
                            return false; // already in stack trace
                        } else if (!stackInfo.stack[0].line && stackInfo.stack[0].func === initial.func) {
                            stackInfo.stack[0].line = initial.line;
                            return false;
                        }
                    }
                }

                stackInfo.stack.unshift(initial);
                stackInfo.partial = true;
                return true;
            } else {
                stackInfo.incomplete = true;
            }

            return false;
        }

        /**
         * Computes stack trace information by walking the arguments.caller
         * chain at the time the exception occurred. This will cause earlier
         * frames to be missed but is the only way to get any stack trace in
         * Safari and IE. The top frame is restored by
         * {@link augmentStackTraceWithInitialElement}.
         * @param {Error} ex
         * @return {?Object.<string, *>} Stack trace information.
         */
        function computeStackTraceByWalkingCallerChain(ex, depth) {
            var functionName = /function\s+([_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*)?\s*\(/i,
                stack = [],
                funcs = {},
                recursion = false,
                parts,
                item;

            for (var curr = computeStackTraceByWalkingCallerChain.caller; curr && !recursion; curr = curr.caller) {
                if (curr === computeStackTrace || curr === TraceKit.report) {
                    // console.log('skipping internal function');
                    continue;
                }

                item = {
                    'url': null,
                    'func': UNKNOWN_FUNCTION,
                    'line': null,
                    'column': null
                };

                if (curr.name) {
                    item.func = curr.name;
                } else if (parts = functionName.exec(curr.toString())) {
                    item.func = parts[1];
                }

                if (typeof item.func === 'undefined') {
                    try {
                        item.func = parts.input.substring(0, parts.input.indexOf('{'));
                    } catch (e) {}
                }

                if (funcs['' + curr]) {
                    recursion = true;
                } else {
                    funcs['' + curr] = true;
                }

                stack.push(item);
            }

            if (depth) {
                // console.log('depth is ' + depth);
                // console.log('stack is ' + stack.length);
                stack.splice(0, depth);
            }

            var result = {
                'name': ex.name,
                'message': ex.message,
                'url': getLocationHref(),
                'stack': stack
            };
            augmentStackTraceWithInitialElement(result, ex.sourceURL || ex.fileName, ex.line || ex.lineNumber, ex.message || ex.description);
            return result;
        }

        /**
         * Computes a stack trace for an exception.
         * @param {Error} ex
         * @param {(string|number)=} depth
         */
        function computeStackTrace(ex, depth) {
            var stack = null;
            depth = depth == null ? 0 : +depth;

            try {
                stack = computeStackTraceFromStackProp(ex);
                if (stack) {
                    return stack;
                }
            } catch (e) {
                if (TraceKit.debug) {
                    throw e;
                }
            }

            try {
                stack = computeStackTraceByWalkingCallerChain(ex, depth + 1);
                if (stack) {
                    return stack;
                }
            } catch (e) {
                if (TraceKit.debug) {
                    throw e;
                }
            }

            return {
                'name': ex.name,
                'message': ex.message,
                'url': getLocationHref()
            };
        }

        computeStackTrace.augmentStackTraceWithInitialElement = augmentStackTraceWithInitialElement;
        computeStackTrace.computeStackTraceFromStackProp = computeStackTraceFromStackProp;

        return computeStackTrace;
    }();

    module.exports = TraceKit;
    /* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")));

    /***/ }),

    /***/ "./packages/@apphub:logrocket-utils/src/enhanceFunc.js":
    /*!*************************************************************!*\
      !*** ./packages/@apphub:logrocket-utils/src/enhanceFunc.js ***!
      \*************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = enhanceFunc;
    /* eslint no-param-reassign: ["error", { "props": false }] */

    function enhanceFunc(obj, method, handler) {
      var original = obj[method];

      function shim() {
        var res = void 0;

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        if (original) {
          res = original.apply(this, args);
        }

        handler.apply(this, args);
        return res;
      }

      obj[method] = shim;

      return function () {
        obj[method] = original;
      };
    }

    /***/ }),

    /***/ "./packages/@apphub:logrocket-utils/src/mapValues.js":
    /*!***********************************************************!*\
      !*** ./packages/@apphub:logrocket-utils/src/mapValues.js ***!
      \***********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = mapValues;
    function mapValues(obj, f) {
      if (obj == null) {
        return {};
      }

      var res = {};
      Object.keys(obj).forEach(function (key) {
        res[key] = f(obj[key]);
      });
      return res;
    }

    /***/ }),

    /***/ "./packages/@apphub:now/src/index.js":
    /*!*******************************************!*\
      !*** ./packages/@apphub:now/src/index.js ***!
      \*******************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    Object.defineProperty(exports,"__esModule",{value:true});var dateNow=Date.now.bind(Date);var loadTime=dateNow();exports.default=typeof performance!=='undefined'&&performance.now?performance.now.bind(performance):function(){return dateNow()-loadTime;};module.exports=exports['default'];

    /***/ }),

    /***/ "./packages/logrocket/src/LogRocket.js":
    /*!*********************************************!*\
      !*** ./packages/logrocket/src/LogRocket.js ***!
      \*********************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.MAX_QUEUE_SIZE = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

    var _logrocketNetwork = __webpack_require__(/*! @apphub/logrocket-network */ "./packages/@apphub:logrocket-network/src/index.js");

    var _logrocketNetwork2 = _interopRequireDefault(_logrocketNetwork);

    var _logrocketExceptions = __webpack_require__(/*! @apphub/logrocket-exceptions */ "./packages/@apphub:logrocket-exceptions/src/index.js");

    var _logrocketConsole = __webpack_require__(/*! @apphub/logrocket-console */ "./packages/@apphub:logrocket-console/src/index.js");

    var _logrocketConsole2 = _interopRequireDefault(_logrocketConsole);

    var _logrocketRedux = __webpack_require__(/*! @apphub/logrocket-redux */ "./packages/@apphub:logrocket-redux/src/index.js");

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

    var MAX_QUEUE_SIZE = exports.MAX_QUEUE_SIZE = 1000;

    var considerIngestServerOption = function considerIngestServerOption() {
      var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var ingestServer = _ref.ingestServer,
          options = _objectWithoutProperties(_ref, ['ingestServer']);

      if (ingestServer) {
        return _extends({
          serverURL: ingestServer + '/i',
          statsURL: ingestServer + '/s'
        }, options);
      }

      return options;
    };

    var LogRocket = function () {
      function LogRocket() {
        var _this = this;

        _classCallCheck(this, LogRocket);

        this._buffer = [];

        // TODO: tests for these exposed methods.
        ['log', 'info', 'warn', 'error', 'debug'].forEach(function (method) {
          _this[method] = function () {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            _this.addEvent('lr.core.LogEvent', function () {
              var consoleOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

              if (method === 'error' && consoleOptions.shouldAggregateConsoleErrors) {
                _logrocketExceptions.Capture.captureMessage(_this, args[0], {}, true);
              }

              return {
                logLevel: method.toUpperCase(),
                args: args
              };
            }, { shouldCaptureStackTrace: true });
          };
        });
        this._isInitialized = false;
        this._installed = [];
      }

      _createClass(LogRocket, [{
        key: 'addEvent',
        value: function addEvent(type, getMessage) {
          var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

          var time = Date.now();
          this._run(function (logger) {
            logger.addEvent(type, getMessage, _extends({}, opts, {
              timeOverride: time
            }));
          });
        }
      }, {
        key: 'onLogger',
        value: function onLogger(logger) {
          this._logger = logger;

          while (this._buffer.length > 0) {
            var f = this._buffer.shift();
            f(this._logger);
          }
        }
      }, {
        key: '_run',
        value: function _run(f) {
          if (this._isDisabled) {
            return;
          }

          if (this._logger) {
            f(this._logger);
          } else {
            if (this._buffer.length >= MAX_QUEUE_SIZE) {
              this._isDisabled = true;
              console.warn('LogRocket: script did not load. Check that you have a valid network connection.');
              this.uninstall();
              return;
            }

            this._buffer.push(f.bind(this));
          }
        }
      }, {
        key: 'init',
        value: function init(appID, opts) {
          if (!this._isInitialized) {
            this._installed.push((0, _logrocketExceptions.registerExceptions)(this));
            this._installed.push((0, _logrocketNetwork2.default)(this));
            this._installed.push((0, _logrocketConsole2.default)(this));

            this._isInitialized = true;

            this._run(function (logger) {
              logger.init(appID, considerIngestServerOption(opts));
            });
          }
        }
      }, {
        key: 'start',
        value: function start() {
          this._run(function (logger) {
            logger.start();
          });
        }
      }, {
        key: 'uninstall',
        value: function uninstall() {
          this._installed.forEach(function (f) {
            return f();
          });
          this._buffer = [];

          this._run(function (logger) {
            logger.uninstall();
          });
        }
      }, {
        key: 'identify',
        value: function identify(id, opts) {
          this._run(function (logger) {
            logger.identify(id, opts);
          });
        }
      }, {
        key: 'startNewSession',
        value: function startNewSession() {
          this._run(function (logger) {
            logger.startNewSession();
          });
        }
      }, {
        key: 'track',
        value: function track(customEventName) {
          this._run(function (logger) {
            logger.track(customEventName);
          });
        }
      }, {
        key: 'getSessionURL',
        value: function getSessionURL(cb) {
          if (typeof cb !== 'function') {
            throw new Error('LogRocket: must pass callback to getSessionURL()');
          }

          this._run(function (logger) {
            if (logger.getSessionURL) {
              logger.getSessionURL(cb);
            } else {
              cb(logger.recordingURL);
            }
          });
        }
      }, {
        key: 'getVersion',
        value: function getVersion(cb) {
          this._run(function (logger) {
            cb(logger.version);
          });
        }
      }, {
        key: 'captureMessage',
        value: function captureMessage(message) {
          var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

          _logrocketExceptions.Capture.captureMessage(this, message, options);
        }
      }, {
        key: 'captureException',
        value: function captureException(exception) {
          var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

          _logrocketExceptions.Capture.captureException(this, exception, options);
        }
      }, {
        key: 'reduxEnhancer',
        value: function reduxEnhancer() {
          var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          return (0, _logrocketRedux.createEnhancer)(this, options);
        }
      }, {
        key: 'reduxMiddleware',
        value: function reduxMiddleware() {
          var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          return (0, _logrocketRedux.createMiddleware)(this, options);
        }
      }, {
        key: 'version',
        get: function get() {
          return this._logger && this._logger.version;
        }
      }, {
        key: 'sessionURL',
        get: function get() {
          return this._logger && this._logger.recordingURL;
        }
      }, {
        key: 'recordingURL',
        get: function get() {
          return this._logger && this._logger.recordingURL;
        }
      }, {
        key: 'recordingID',
        get: function get() {
          return this._logger && this._logger.recordingID;
        }
      }, {
        key: 'threadID',
        get: function get() {
          return this._logger && this._logger.threadID;
        }
      }, {
        key: 'tabID',
        get: function get() {
          return this._logger && this._logger.tabID;
        }
      }]);

      return LogRocket;
    }();

    exports.default = LogRocket;

    /***/ }),

    /***/ "./packages/logrocket/src/makeLogRocket.js":
    /*!*************************************************!*\
      !*** ./packages/logrocket/src/makeLogRocket.js ***!
      \*************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = makeLogRocket;

    var _LogRocket = __webpack_require__(/*! ./LogRocket */ "./packages/logrocket/src/LogRocket.js");

    var _LogRocket2 = _interopRequireDefault(_LogRocket);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var REACT_NATIVE_NOTICE = 'LogRocket does not yet support React Native.';
    var makeNoopPolyfill = function makeNoopPolyfill() {
      return {
        init: function init() {},
        uninstall: function uninstall() {},
        log: function log() {},
        info: function info() {},
        warn: function warn() {},
        error: function error() {},
        debug: function debug() {},
        addEvent: function addEvent() {},
        identify: function identify() {},
        start: function start() {},


        get threadID() {
          return null;
        },
        get recordingID() {
          return null;
        },
        get recordingURL() {
          return null;
        },

        reduxEnhancer: function reduxEnhancer() {
          return function (store) {
            return function () {
              return store.apply(undefined, arguments);
            };
          };
        },
        reduxMiddleware: function reduxMiddleware() {
          return function () {
            return function (next) {
              return function (action) {
                return next(action);
              };
            };
          };
        },
        track: function track() {},
        getSessionURL: function getSessionURL() {},
        getVersion: function getVersion() {},
        startNewSession: function startNewSession() {},
        onLogger: function onLogger() {},
        setClock: function setClock() {},
        captureMessage: function captureMessage() {},
        captureException: function captureException() {}
      };
    };

    function makeLogRocket() {
      var getLogger = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        throw new Error(REACT_NATIVE_NOTICE);
      }

      if (typeof window !== 'undefined') {
        if (window._disableLogRocket) {
          return makeNoopPolyfill();
        }

        if (window.MutationObserver && window.WeakMap) {
          // Save window globals that we rely on.
          window._lrMutationObserver = window.MutationObserver;

          var instance = new _LogRocket2.default();
          getLogger(instance);
          return instance;
        }
      }

      return makeNoopPolyfill();
    }
    module.exports = exports['default'];

    /***/ }),

    /***/ "./packages/logrocket/src/module-npm.js":
    /*!**********************************************!*\
      !*** ./packages/logrocket/src/module-npm.js ***!
      \**********************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _setup = __webpack_require__(/*! ./setup */ "./packages/logrocket/src/setup.js");

    var _setup2 = _interopRequireDefault(_setup);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var instance = (0, _setup2.default)();

    exports.default = instance;
    module.exports = exports['default'];

    /***/ }),

    /***/ "./packages/logrocket/src/setup.js":
    /*!*****************************************!*\
      !*** ./packages/logrocket/src/setup.js ***!
      \*****************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = setup;

    var _makeLogRocket = __webpack_require__(/*! ./makeLogRocket */ "./packages/logrocket/src/makeLogRocket.js");

    var _makeLogRocket2 = _interopRequireDefault(_makeLogRocket);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

    var CDN_SERVER_MAP = {
      'cdn.logrocket.io': 'https://r.logrocket.io',
      'cdn.lr-ingest.io': 'https://r.lr-ingest.io',
      'cdn-staging.logrocket.io': 'https://staging-i.logrocket.io',
      'cdn-staging.lr-ingest.io': 'https://staging-i.lr-ingest.io'
    };

    function setup() {
      var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var enterpriseServer = _ref.enterpriseServer,
          _ref$sdkVersion = _ref.sdkVersion,
          sdkVersion = _ref$sdkVersion === undefined ? "1.0.11" : _ref$sdkVersion,
          opts = _objectWithoutProperties(_ref, ['enterpriseServer', 'sdkVersion']);

      var scriptOrigin =  'https://cdn.logrocket.io';
      var scriptIngest = void 0;

      if (sdkVersion === 'script') {
        try {
          var scriptTag = document.currentScript;
          var matches = scriptTag.src.match(/^(https?:\/\/([^\\]+))\/.+$/);
          var scriptHostname = matches && matches[2];

          if (scriptHostname && CDN_SERVER_MAP[scriptHostname]) {
            scriptOrigin = matches && matches[1];
            scriptIngest = CDN_SERVER_MAP[scriptHostname];
          }
        } catch (_) {
          /* no-op */
        }
      } else {
        // NPM
        scriptOrigin =  'https://cdn.lr-ingest.io';
        scriptIngest =  'https://r.lr-ingest.io';
      }

      var sdkServer = opts.sdkServer || enterpriseServer;
      var ingestServer = opts.ingestServer || enterpriseServer || scriptIngest;

      var instance = (0, _makeLogRocket2.default)(function () {
        var script = document.createElement('script');

        if (ingestServer) {
          if (typeof window.__SDKCONFIG__ === 'undefined') {
            window.__SDKCONFIG__ = {};
          }

          window.__SDKCONFIG__.serverURL = ingestServer + '/i';
          window.__SDKCONFIG__.statsURL = ingestServer + '/s';
        }

        if (sdkServer) {
          script.src = sdkServer + '/logger.min.js';
        } else if (window.__SDKCONFIG__ && window.__SDKCONFIG__.loggerURL) {
          script.src = window.__SDKCONFIG__.loggerURL;
        } else if (window._lrAsyncScript) {
          script.src = window._lrAsyncScript;
        } else {
          script.src = scriptOrigin + '/logger-1.min.js';
        }

        script.async = true;
        document.head.appendChild(script);
        script.onload = function () {
          // Brave browser: Advertises its user-agent as Chrome ##.##... then
          // loads logger.min.js, but blocks the execution of the script
          // causing _LRlogger to be undefined.  Let's make sure its there first.
          if (typeof window._LRLogger === 'function') {
            instance.onLogger(new window._LRLogger({
              sdkVersion: sdkVersion
            }));
          } else {
            console.warn('LogRocket: script execution has been blocked by a product or service.');
            instance.uninstall();
          }
        };
        script.onerror = function () {
          console.warn('LogRocket: script could not load. Check that you have a valid network connection.');
          instance.uninstall();
        };
      });

      return instance;
    }
    module.exports = exports['default'];

    /***/ }),

    /***/ 0:
    /*!****************************************************!*\
      !*** multi ./packages/logrocket/src/module-npm.js ***!
      \****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    module.exports = __webpack_require__(/*! /root/project/packages/logrocket/src/module-npm.js */"./packages/logrocket/src/module-npm.js");


    /***/ })

    /******/ });
    });
    });

    /* src/Introduction/1-basic.svelte generated by Svelte v3.24.1 */

    const file$1 = "src/Introduction/1-basic.svelte";

    function create_fragment$1(ctx) {
    	let h1;
    	let t0;
    	let t1_value = /*name*/ ctx[0].toUpperCase() + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("hello ");
    			t1 = text(t1_value);
    			t2 = text("!");
    			add_location(h1, file$1, 6, 0, 168);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && t1_value !== (t1_value = /*name*/ ctx[0].toUpperCase() + "")) set_data_dev(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<_1_basic> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("_1_basic", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ name });

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class _1_basic extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "_1_basic",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<_1_basic> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<_1_basic>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<_1_basic>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Introduction/2-dynamic-attributes.svelte generated by Svelte v3.24.1 */

    const file$2 = "src/Introduction/2-dynamic-attributes.svelte";

    function create_fragment$2(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "alt", /*alt*/ ctx[1]);
    			if (img.src !== (img_src_value = /*src*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			add_location(img, file$2, 3, 0, 41);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*alt*/ 2) {
    				attr_dev(img, "alt", /*alt*/ ctx[1]);
    			}

    			if (dirty & /*src*/ 1 && img.src !== (img_src_value = /*src*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { src } = $$props, { alt } = $$props;
    	const writable_props = ["src", "alt"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<_2_dynamic_attributes> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("_2_dynamic_attributes", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    		if ("alt" in $$props) $$invalidate(1, alt = $$props.alt);
    	};

    	$$self.$capture_state = () => ({ src, alt });

    	$$self.$inject_state = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    		if ("alt" in $$props) $$invalidate(1, alt = $$props.alt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [src, alt];
    }

    class _2_dynamic_attributes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { src: 0, alt: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "_2_dynamic_attributes",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*src*/ ctx[0] === undefined && !("src" in props)) {
    			console.warn("<_2_dynamic_attributes> was created without expected prop 'src'");
    		}

    		if (/*alt*/ ctx[1] === undefined && !("alt" in props)) {
    			console.warn("<_2_dynamic_attributes> was created without expected prop 'alt'");
    		}
    	}

    	get src() {
    		throw new Error("<_2_dynamic_attributes>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<_2_dynamic_attributes>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alt() {
    		throw new Error("<_2_dynamic_attributes>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alt(value) {
    		throw new Error("<_2_dynamic_attributes>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Introduction/3-pstyling.svelte generated by Svelte v3.24.1 */

    const file$3 = "src/Introduction/3-pstyling.svelte";

    function create_fragment$3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "This is a pagagraph in 3-pstyling component!";
    			attr_dev(p, "class", "svelte-d4ki41");
    			add_location(p, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<_3_pstyling> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("_3_pstyling", $$slots, []);
    	return [];
    }

    class _3_pstyling extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "_3_pstyling",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/Introduction/4-html-tags.svelte generated by Svelte v3.24.1 */

    const file$4 = "src/Introduction/4-html-tags.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			add_location(p, file$4, 4, 4, 67);
    			attr_dev(div, "class", "styling");
    			add_location(div, file$4, 3, 0, 41);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			p.innerHTML = /*string*/ ctx[0];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*string*/ 1) p.innerHTML = /*string*/ ctx[0];		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { string } = $$props;
    	const writable_props = ["string"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<_4_html_tags> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("_4_html_tags", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("string" in $$props) $$invalidate(0, string = $$props.string);
    	};

    	$$self.$capture_state = () => ({ string });

    	$$self.$inject_state = $$props => {
    		if ("string" in $$props) $$invalidate(0, string = $$props.string);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [string];
    }

    class _4_html_tags extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { string: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "_4_html_tags",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*string*/ ctx[0] === undefined && !("string" in props)) {
    			console.warn("<_4_html_tags> was created without expected prop 'string'");
    		}
    	}

    	get string() {
    		throw new Error("<_4_html_tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set string(value) {
    		throw new Error("<_4_html_tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/reactivity/1-assignments.svelte generated by Svelte v3.24.1 */

    const file$5 = "src/reactivity/1-assignments.svelte";

    function create_fragment$5(ctx) {
    	let button;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = `${button_content}`;
    			add_location(button, file$5, 7, 0, 123);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const button_content = "";

    function handleClick() {
    	count += 1;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<_1_assignments> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("_1_assignments", $$slots, []);
    	$$self.$capture_state = () => ({ button_content, handleClick });
    	return [];
    }

    class _1_assignments extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "_1_assignments",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.1 */
    const file$6 = "src/App.svelte";

    // (35:4) <Button count={0} on:click={handleClick}>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*button_content*/ ctx[2]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*button_content*/ 4) set_data_dev(t, /*button_content*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(35:4) <Button count={0} on:click={handleClick}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let main;
    	let basic;
    	let t0;
    	let dynamicattributes;
    	let t1;
    	let pstyling;
    	let t2;
    	let htmltag;
    	let t3;
    	let div0;
    	let p0;
    	let t5;
    	let nested;
    	let t6;
    	let button;
    	let t7;
    	let div1;
    	let p1;
    	let t9;
    	let p2;
    	let current;
    	basic = new _1_basic({ props: { name: "小明" }, $$inline: true });

    	dynamicattributes = new _2_dynamic_attributes({
    			props: {
    				alt: "Shopping Girl",
    				src: /*src*/ ctx[0]
    			},
    			$$inline: true
    		});

    	pstyling = new _3_pstyling({ $$inline: true });

    	htmltag = new _4_html_tags({
    			props: { string: /*string*/ ctx[1] },
    			$$inline: true
    		});

    	nested = new Nested({ $$inline: true });

    	button = new _1_assignments({
    			props: {
    				count: 0,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", handleClick);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(basic.$$.fragment);
    			t0 = space();
    			create_component(dynamicattributes.$$.fragment);
    			t1 = space();
    			create_component(pstyling.$$.fragment);
    			t2 = space();
    			create_component(htmltag.$$.fragment);
    			t3 = space();
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Import Nested components";
    			t5 = space();
    			create_component(nested.$$.fragment);
    			t6 = space();
    			create_component(button.$$.fragment);
    			t7 = space();
    			div1 = element("div");
    			p1 = element("p");
    			p1.textContent = "Svelte的核心是功能强大的反应系统，用于使DOM与您的应用程序状态\n            保持同步";
    			t9 = space();
    			p2 = element("p");
    			p2.textContent = "下面是一个响应事件DEMO";
    			add_location(p0, file$6, 30, 8, 793);
    			attr_dev(div0, "class", "styling nested components");
    			add_location(div0, file$6, 29, 4, 745);
    			add_location(p1, file$6, 37, 8, 992);
    			add_location(p2, file$6, 39, 8, 1060);
    			attr_dev(div1, "class", "styling reactivity assignments");
    			add_location(div1, file$6, 36, 4, 939);
    			add_location(main, file$6, 18, 0, 558);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(basic, main, null);
    			append_dev(main, t0);
    			mount_component(dynamicattributes, main, null);
    			append_dev(main, t1);
    			mount_component(pstyling, main, null);
    			append_dev(main, t2);
    			mount_component(htmltag, main, null);
    			append_dev(main, t3);
    			append_dev(main, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t5);
    			mount_component(nested, div0, null);
    			append_dev(main, t6);
    			mount_component(button, main, null);
    			append_dev(main, t7);
    			append_dev(main, div1);
    			append_dev(div1, p1);
    			append_dev(div1, t9);
    			append_dev(div1, p2);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const dynamicattributes_changes = {};
    			if (dirty & /*src*/ 1) dynamicattributes_changes.src = /*src*/ ctx[0];
    			dynamicattributes.$set(dynamicattributes_changes);
    			const htmltag_changes = {};
    			if (dirty & /*string*/ 2) htmltag_changes.string = /*string*/ ctx[1];
    			htmltag.$set(htmltag_changes);
    			const button_changes = {};

    			if (dirty & /*$$scope, button_content*/ 36) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(basic.$$.fragment, local);
    			transition_in(dynamicattributes.$$.fragment, local);
    			transition_in(pstyling.$$.fragment, local);
    			transition_in(htmltag.$$.fragment, local);
    			transition_in(nested.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(basic.$$.fragment, local);
    			transition_out(dynamicattributes.$$.fragment, local);
    			transition_out(pstyling.$$.fragment, local);
    			transition_out(htmltag.$$.fragment, local);
    			transition_out(nested.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(basic);
    			destroy_component(dynamicattributes);
    			destroy_component(pstyling);
    			destroy_component(htmltag);
    			destroy_component(nested);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { src } = $$props,
    		{ string } = $$props,
    		{ count } = $$props,
    		{ button_content } = $$props;

    	build_umd.init("1aufxy/sveltejs");
    	const writable_props = ["src", "string", "count", "button_content"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    		if ("string" in $$props) $$invalidate(1, string = $$props.string);
    		if ("count" in $$props) $$invalidate(3, count = $$props.count);
    		if ("button_content" in $$props) $$invalidate(2, button_content = $$props.button_content);
    	};

    	$$self.$capture_state = () => ({
    		src,
    		string,
    		count,
    		button_content,
    		Nested,
    		LogRocket: build_umd,
    		Basic: _1_basic,
    		DynamicAttributes: _2_dynamic_attributes,
    		PStyling: _3_pstyling,
    		HtmlTag: _4_html_tags,
    		Button: _1_assignments,
    		handleClick,
    		doubled
    	});

    	$$self.$inject_state = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    		if ("string" in $$props) $$invalidate(1, string = $$props.string);
    		if ("count" in $$props) $$invalidate(3, count = $$props.count);
    		if ("button_content" in $$props) $$invalidate(2, button_content = $$props.button_content);
    		if ("doubled" in $$props) doubled = $$props.doubled;
    	};

    	let doubled;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*count*/ 8) {
    			 doubled = count * 2;
    		}
    	};

    	return [src, string, button_content, count];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			src: 0,
    			string: 1,
    			count: 3,
    			button_content: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*src*/ ctx[0] === undefined && !("src" in props)) {
    			console.warn("<App> was created without expected prop 'src'");
    		}

    		if (/*string*/ ctx[1] === undefined && !("string" in props)) {
    			console.warn("<App> was created without expected prop 'string'");
    		}

    		if (/*count*/ ctx[3] === undefined && !("count" in props)) {
    			console.warn("<App> was created without expected prop 'count'");
    		}

    		if (/*button_content*/ ctx[2] === undefined && !("button_content" in props)) {
    			console.warn("<App> was created without expected prop 'button_content'");
    		}
    	}

    	get src() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get string() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set string(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get count() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set count(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get button_content() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set button_content(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            src: "https://weiboimgs.sina.tw/upload/api_bj/us/11-1591643028.jpeg",
            string: `This string contains some <strong style='color:red'> HTML!!! </strong> in 4-html-tag components`,
            count: 0,
            logrocket: "https://cdn.lr-ingest.io/LogRocket.min.js",
            button_content: 'hello world'

        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
