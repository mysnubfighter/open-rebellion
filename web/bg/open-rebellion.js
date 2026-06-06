let wasm_bindgen = (function(exports) {
    let script_src;
    if (typeof document !== 'undefined' && document.currentScript !== null) {
        script_src = new URL(document.currentScript.src, location.href).toString();
    }
    const import1 = require("env");
    const import2 = require("env");
    const import3 = require("env");
    const import4 = require("env");
    const import5 = require("env");
    const import6 = require("env");
    const import7 = require("env");
    const import8 = require("env");
    const import9 = require("env");
    const import10 = require("env");
    const import11 = require("env");
    const import12 = require("env");
    const import13 = require("env");
    const import14 = require("env");
    const import15 = require("env");
    const import16 = require("env");
    const import17 = require("env");
    const import18 = require("env");
    const import19 = require("env");
    const import20 = require("env");
    const import21 = require("env");
    const import22 = require("env");
    const import23 = require("env");
    const import24 = require("env");
    const import25 = require("env");
    const import26 = require("env");
    const import27 = require("env");
    const import28 = require("env");
    const import29 = require("env");
    const import30 = require("env");
    const import31 = require("env");
    const import32 = require("env");
    const import33 = require("env");
    const import34 = require("env");
    const import35 = require("env");
    const import36 = require("env");
    const import37 = require("env");
    const import38 = require("env");
    const import39 = require("env");
    const import40 = require("env");
    const import41 = require("env");
    const import42 = require("env");
    const import43 = require("env");
    const import44 = require("env");
    const import45 = require("env");
    const import46 = require("env");
    const import47 = require("env");
    const import48 = require("env");
    const import49 = require("env");
    const import50 = require("env");
    const import51 = require("env");
    const import52 = require("env");
    const import53 = require("env");
    const import54 = require("env");
    const import55 = require("env");
    const import56 = require("env");
    const import57 = require("env");
    const import58 = require("env");
    const import59 = require("env");
    const import60 = require("env");
    const import61 = require("env");
    const import62 = require("env");
    const import63 = require("env");
    const import64 = require("env");
    const import65 = require("env");
    const import66 = require("env");
    const import67 = require("env");
    const import68 = require("env");
    const import69 = require("env");
    const import70 = require("env");
    const import71 = require("env");
    const import72 = require("env");
    const import73 = require("env");
    const import74 = require("env");
    const import75 = require("env");
    const import76 = require("env");
    const import77 = require("env");
    const import78 = require("env");
    const import79 = require("env");
    const import80 = require("env");
    const import81 = require("env");
    const import82 = require("env");
    const import83 = require("env");
    const import84 = require("env");
    const import85 = require("env");
    const import86 = require("env");
    const import87 = require("env");
    const import88 = require("env");
    const import89 = require("env");
    const import90 = require("env");
    const import91 = require("env");
    const import92 = require("env");
    const import93 = require("env");
    const import94 = require("env");
    const import95 = require("env");
    const import96 = require("env");
    const import97 = require("env");
    const import98 = require("env");
    const import99 = require("env");
    const import100 = require("env");
    const import101 = require("env");
    const import102 = require("env");
    const import103 = require("env");
    const import104 = require("env");
    const import105 = require("env");
    const import106 = require("env");
    const import107 = require("env");
    const import108 = require("env");
    const import109 = require("env");

    function __wbg_get_imports() {
        const import0 = {
            __proto__: null,
            __wbg___wbindgen_is_undefined_52709e72fb9f179c: function(arg0) {
                const ret = getObject(arg0) === undefined;
                return ret;
            },
            __wbg___wbindgen_throw_6ddd609b62940d55: function(arg0, arg1) {
                throw new Error(getStringFromWasm0(arg0, arg1));
            },
            __wbg_getItem_a7cc1d4f154f2e6f: function() { return handleError(function (arg0, arg1, arg2, arg3) {
                const ret = getObject(arg1).getItem(getStringFromWasm0(arg2, arg3));
                var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                var len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            }, arguments); },
            __wbg_instanceof_Window_23e677d2c6843922: function(arg0) {
                let result;
                try {
                    result = getObject(arg0) instanceof Window;
                } catch (_) {
                    result = false;
                }
                const ret = result;
                return ret;
            },
            __wbg_localStorage_51c38b3b222e1ed2: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).localStorage;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            }, arguments); },
            __wbg_static_accessor_GLOBAL_8adb955bd33fac2f: function() {
                const ret = typeof global === 'undefined' ? null : global;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_static_accessor_GLOBAL_THIS_ad356e0db91c7913: function() {
                const ret = typeof globalThis === 'undefined' ? null : globalThis;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_static_accessor_SELF_f207c857566db248: function() {
                const ret = typeof self === 'undefined' ? null : self;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_static_accessor_WINDOW_bb9f1ba69d61b386: function() {
                const ret = typeof window === 'undefined' ? null : window;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbindgen_object_clone_ref: function(arg0) {
                const ret = getObject(arg0);
                return addHeapObject(ret);
            },
            __wbindgen_object_drop_ref: function(arg0) {
                takeObject(arg0);
            },
        };
        return {
            __proto__: null,
            "./open-rebellion_bg.js": import0,
            "env": import1,
            "env": import2,
            "env": import3,
            "env": import4,
            "env": import5,
            "env": import6,
            "env": import7,
            "env": import8,
            "env": import9,
            "env": import10,
            "env": import11,
            "env": import12,
            "env": import13,
            "env": import14,
            "env": import15,
            "env": import16,
            "env": import17,
            "env": import18,
            "env": import19,
            "env": import20,
            "env": import21,
            "env": import22,
            "env": import23,
            "env": import24,
            "env": import25,
            "env": import26,
            "env": import27,
            "env": import28,
            "env": import29,
            "env": import30,
            "env": import31,
            "env": import32,
            "env": import33,
            "env": import34,
            "env": import35,
            "env": import36,
            "env": import37,
            "env": import38,
            "env": import39,
            "env": import40,
            "env": import41,
            "env": import42,
            "env": import43,
            "env": import44,
            "env": import45,
            "env": import46,
            "env": import47,
            "env": import48,
            "env": import49,
            "env": import50,
            "env": import51,
            "env": import52,
            "env": import53,
            "env": import54,
            "env": import55,
            "env": import56,
            "env": import57,
            "env": import58,
            "env": import59,
            "env": import60,
            "env": import61,
            "env": import62,
            "env": import63,
            "env": import64,
            "env": import65,
            "env": import66,
            "env": import67,
            "env": import68,
            "env": import69,
            "env": import70,
            "env": import71,
            "env": import72,
            "env": import73,
            "env": import74,
            "env": import75,
            "env": import76,
            "env": import77,
            "env": import78,
            "env": import79,
            "env": import80,
            "env": import81,
            "env": import82,
            "env": import83,
            "env": import84,
            "env": import85,
            "env": import86,
            "env": import87,
            "env": import88,
            "env": import89,
            "env": import90,
            "env": import91,
            "env": import92,
            "env": import93,
            "env": import94,
            "env": import95,
            "env": import96,
            "env": import97,
            "env": import98,
            "env": import99,
            "env": import100,
            "env": import101,
            "env": import102,
            "env": import103,
            "env": import104,
            "env": import105,
            "env": import106,
            "env": import107,
            "env": import108,
            "env": import109,
        };
    }

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        heap[idx] = obj;
        return idx;
    }

    function dropObject(idx) {
        if (idx < 1028) return;
        heap[idx] = heap_next;
        heap_next = idx;
    }

    let cachedDataViewMemory0 = null;
    function getDataViewMemory0() {
        if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
            cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
        }
        return cachedDataViewMemory0;
    }

    function getStringFromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return decodeText(ptr, len);
    }

    let cachedUint8ArrayMemory0 = null;
    function getUint8ArrayMemory0() {
        if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
            cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8ArrayMemory0;
    }

    function getObject(idx) { return heap[idx]; }

    function handleError(f, args) {
        try {
            return f.apply(this, args);
        } catch (e) {
            wasm.__wbindgen_export3(addHeapObject(e));
        }
    }

    let heap = new Array(1024).fill(undefined);
    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function isLikeNone(x) {
        return x === undefined || x === null;
    }

    function passStringToWasm0(arg, malloc, realloc) {
        if (realloc === undefined) {
            const buf = cachedTextEncoder.encode(arg);
            const ptr = malloc(buf.length, 1) >>> 0;
            getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len, 1) >>> 0;

        const mem = getUint8ArrayMemory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }
        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
            const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
            const ret = cachedTextEncoder.encodeInto(arg, view);

            offset += ret.written;
            ptr = realloc(ptr, len, offset, 1) >>> 0;
        }

        WASM_VECTOR_LEN = offset;
        return ptr;
    }

    function takeObject(idx) {
        const ret = getObject(idx);
        dropObject(idx);
        return ret;
    }

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    function decodeText(ptr, len) {
        return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
    }

    const cachedTextEncoder = new TextEncoder();

    if (!('encodeInto' in cachedTextEncoder)) {
        cachedTextEncoder.encodeInto = function (arg, view) {
            const buf = cachedTextEncoder.encode(arg);
            view.set(buf);
            return {
                read: arg.length,
                written: buf.length
            };
        };
    }

    let WASM_VECTOR_LEN = 0;

    let wasmModule, wasm;
    function __wbg_finalize_init(instance, module) {
        wasm = instance.exports;
        wasmModule = module;
        cachedDataViewMemory0 = null;
        cachedUint8ArrayMemory0 = null;
        wasm.__wbindgen_start();
        return wasm;
    }

    async function __wbg_load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);
                } catch (e) {
                    const validResponse = module.ok && expectedResponseType(module.type);

                    if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else { throw e; }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);
        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };
            } else {
                return instance;
            }
        }

        function expectedResponseType(type) {
            switch (type) {
                case 'basic': case 'cors': case 'default': return true;
            }
            return false;
        }
    }

    function initSync(module) {
        if (wasm !== undefined) return wasm;


        if (module !== undefined) {
            if (Object.getPrototypeOf(module) === Object.prototype) {
                ({module} = module)
            } else {
                console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
            }
        }

        const imports = __wbg_get_imports();
        if (!(module instanceof WebAssembly.Module)) {
            module = new WebAssembly.Module(module);
        }
        const instance = new WebAssembly.Instance(module, imports);
        return __wbg_finalize_init(instance, module);
    }

    async function __wbg_init(module_or_path) {
        if (wasm !== undefined) return wasm;


        if (module_or_path !== undefined) {
            if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
                ({module_or_path} = module_or_path)
            } else {
                console.warn('using deprecated parameters for the initialization function; pass a single object instead')
            }
        }

        if (module_or_path === undefined && script_src !== undefined) {
            module_or_path = script_src.replace(/\.js$/, "_bg.wasm");
        }
        const imports = __wbg_get_imports();

        if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
            module_or_path = fetch(module_or_path);
        }

        const { instance, module } = await __wbg_load(await module_or_path, imports);

        return __wbg_finalize_init(instance, module);
    }

    // Open Rebellion patch — expose __wbg_get_imports and a setter for
    // the `wasm` closure variable so gl.js's loader can install the wasm
    // exports after it instantiates the original (non-bg) wasm.  The shim
    // functions inside import0 close over `wasm` and call into it for
    // memory access and table management.
    function __wbg_set_wasm(exports) {
        wasm = exports;
    }
    return Object.assign(__wbg_init, { initSync, __wbg_get_imports, __wbg_set_wasm, exports }, exports);
})({ __proto__: null });
