// 存储副作用函数的桶
const bucket = new WeakMap();
const ITERATE_KEY = Symbol();
const MAP_KEY_ITERATE_KEY = Symbol();

let shouldTrack = true;

// 被修改的数组方法
const arrayInstrumentations = {};

// 对数组常用方法做处理
["includes", "indexOf", "lastIndexOf"].forEach((method) => {
  // 原始方法
  const originMethod = Array.prototype[method];
  // 被修改的数组方法
  arrayInstrumentations[method] = function (...args) {
    // this 是代理对象，先在代理对象中查找，将结果存储到 res 中
    let res = originMethod.apply(this, args);

    if (res === false) {
      // res 为 false 说明没找到，在通过 this.raw 拿到原始数组，再去原始数组中查找，并更新 res 值
      res = originMethod.apply(this.raw, args);
    }
    // 返回最终的结果
    return res;
  };
});

// 修改push操作
["push"].forEach((method) => {
  const originMethod = Array.prototype[method];
  arrayInstrumentations[method] = function (...args) {
    // 在push之前停止收集依赖
    shouldTrack = false;
    let res = originMethod.apply(this, args);
    // push成功之后，开启收集依赖
    shouldTrack = true;
    return res;
  };
});

const def = (obj, key, value) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    value,
  });
};

function track(target, key) {
  if (!activeEffect || !shouldTrack) return;
  let depsMap = bucket.get(target);
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}

function trigger(target, key, type, newVal) {
  console.log("trigger", key);
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);

  const effectsToRun = new Set();
  effects &&
    effects.forEach((effectFn) => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn);
      }
    });

  if (
    type === "ADD" ||
    type === "DELETE" ||
    (type === "SET" &&
      Object.prototype.toString.call(target) === "[object Map]")
  ) {
    const iterateEffects = depsMap.get(ITERATE_KEY);
    iterateEffects &&
      iterateEffects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn);
        }
      });
  }

  // 处理Map的ADD和DELETE
  // 但是如果是Add，上面就会执行，这里就重复了，还好用的是Set存储，不怕重复
  if (
    (type === "ADD" || type === "DELETE") &&
    Object.prototype.toString.call(target) === "[object Map]"
  ) {
    const iterateEffects = depsMap.get(MAP_KEY_ITERATE_KEY);
    iterateEffects &&
      iterateEffects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn);
        }
      });
  }

  if (type === "ADD" && Array.isArray(target)) {
    const lengthEffects = depsMap.get("length");
    lengthEffects &&
      lengthEffects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn);
        }
      });
  }

  if (Array.isArray(target) && key === "length") {
    depsMap.forEach((effects, key) => {
      if (key >= newVal) {
        effects.forEach((effectFn) => {
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn);
          }
        });
      }
    });
  }

  effectsToRun.forEach((effectFn) => {
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn);
    } else {
      effectFn();
    }
  });
}

const trackStack = [];
function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}
function enableTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}
function resetTracking() {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}

// 用一个全局变量存储当前激活的 effectFn
let activeEffect;
// effect 栈
const effectStack = [];

function effect(fn, options = {}) {
  // debugger;
  const effectFn = () => {
    // debugger;
    if (!effectFn.active) {
      return options.scheduler ? undefined : fn();
    }
    if (!effectStack.includes(effectFn)) {
      cleanup(effectFn);
      try {
        // 保存shouldTrack到栈中，并shouldTrack置为true，可以收集依赖
        enableTracking();
        // 在调用副作用函数之前将当前副作用函数压栈
        effectStack.push(effectFn);
        // 当调用 effect 注册副作用函数时，将副作用函数复制给 activeEffect
        activeEffect = effectFn;
        return fn();
      } finally {
        // 在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并还原 activeEffect 为之前的值
        effectStack.pop();
        // 恢复shouldTrack
        resetTracking();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
    // cleanup(effectFn);
    // 当调用 effect 注册副作用函数时，将副作用函数复制给 activeEffect
    // activeEffect = effectFn;
    // 在调用副作用函数之前将当前副作用函数压栈
    // effectStack.push(effectFn);
    // const res = fn();
    // 在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并还原 activeEffect 为之前的值
    // effectStack.pop();
    // activeEffect = effectStack[effectStack.length - 1];

    // return res;
  };
  // effectFn失活标识 false表示失活 true表示活跃
  effectFn.active = true;
  // 将 options 挂在到 effectFn 上
  effectFn.options = options;
  // activeEffect.deps 用来存储所有与该副作用函数相关的依赖集合
  effectFn.deps = [];

  effectFn.fn = fn;
  // 执行副作用函数
  if (!options.lazy) {
    effectFn();
  }

  return effectFn;
}

function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0;
}

const reactiveMap = new Map();
function reactive(obj) {
  def(obj, "__v_isReactive", true);
  const proxy = createReactive(obj);

  const existionProxy = reactiveMap.get(obj);
  if (existionProxy) return existionProxy;

  reactiveMap.set(obj, proxy);

  return proxy;
}

const mutableInstrumentations = {
  add(key) {
    const target = this.raw;
    const hadKey = target.has(key);
    const res = target.add(key);
    if (!hadKey) {
      trigger(target, key, "ADD");
    }
    return res;
  },
  delete(key) {
    const target = this.raw;
    const hadKey = target.has(key);
    const res = target.delete(key);
    if (hadKey) {
      trigger(target, key, "DELETE");
    }
    return res;
  },
  get(key) {
    const target = this.raw;
    const had = target.has(key);

    track(target, key);

    if (had) {
      const res = target.get(key);
      return typeof res === "object" ? reactive(res) : res;
    }
  },
  set(key, value) {
    const target = this.raw;
    const had = target.has(key);

    const oldValue = target.get(key);
    const rawValue = value.raw || value;
    target.set(key, rawValue);

    if (!had) {
      trigger(target, key, "ADD");
    } else if (
      oldValue !== value ||
      (oldValue === oldValue && value === value)
    ) {
      trigger(target, key, "SET");
    }
  },
  forEach(callback) {
    const wrap = (val) => (typeof val === "object" ? reactive(val) : val);
    const target = this.raw;
    track(target, ITERATE_KEY);
    target.forEach((v, k) => {
      callback(wrap(v), wrap(k), this);
    });
  },

  // 添加了迭代器
  [Symbol.iterator]: iterationMethod,
  // entries
  entries: () => {
    // 添加method
    let method = "entries";
    return iterationMethod(method);
  },
  // keys
  keys: keysIterationMethod,
  // values
  values: valuesIterationMethod,
};

function iterationMethod(method) {
  // 获取原始数据对象 target
  const target = this.raw;
  // 获取到原始迭代器方法
  const itr = target[Symbol.iterator]();
  const rawTarget = toRaw(target);
  const targetIsMap = isMap(rawTarget);
  const isPair =
    method === "entries" || (method === Symbol.iterator && targetIsMap);

  const wrap = (val) => (typeof val === "object" ? reactive(val) : val);

  track(target, ITERATE_KEY);

  // 将其返回
  return {
    next() {
      const { value, done } = itr.next();
      return done
        ? { value, done }
        : {
            value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
            done,
          };
      // return {
      //   value: value ? [wrap(value[0]), wrap(value[1])] : value,
      //   done,
      // };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}

function valuesIterationMethod() {
  // 获取原始数据对象 target
  const target = this.raw;
  // 获取到原始迭代器方法
  const itr = target.values();

  const wrap = (val) => (typeof val === "object" ? reactive(val) : val);

  track(target, ITERATE_KEY);

  // 将其返回
  return {
    next() {
      const { value, done } = itr.next();
      return {
        value: wrap(value),
        done,
      };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}

function keysIterationMethod() {
  // 获取原始数据对象 target
  const target = this.raw;
  // 获取到原始迭代器方法
  const itr = target.keys();

  const wrap = (val) => (typeof val === "object" ? reactive(val) : val);

  track(target, MAP_KEY_ITERATE_KEY);

  // 将其返回
  return {
    next() {
      const { value, done } = itr.next();
      return {
        value: wrap(value),
        done,
      };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}

function createReactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    // 拦截读取操作
    get(target, key, receiver) {
      //   console.log("get: ", key);
      if (key === "raw") {
        return target;
      }
      if (key === "size") {
        track(target, ITERATE_KEY);
        return Reflect.get(target, key, target);
      }
      if (mutableInstrumentations[key]) {
        return mutableInstrumentations[key];
      }

      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }

      // 非只读的时候才需要建立响应联系
      if (!isReadonly && typeof key !== "symbol") {
        track(target, key);
      }

      const res = Reflect.get(target, key, receiver);

      if (isShallow) {
        return res;
      }

      if (typeof res === "object" && res !== null) {
        // 深只读/响应
        return isReadonly ? readonly(res) : reactive(res);
      }

      return res;
    },
    // 拦截设置操作
    set(target, key, newVal, receiver) {
      console.log("set: ", key);
      if (isReadonly) {
        console.warn(`属性 ${key} 是只读的`);
        return true;
      }
      const oldVal = target[key];
      // 如果属性不存在，则说明是在添加新的属性，否则是设置已存在的属性
      const type = Array.isArray(target)
        ? Number(key) < target.length
          ? "SET"
          : "ADD"
        : Object.prototype.hasOwnProperty.call(target, key)
        ? "SET"
        : "ADD";
      // 设置属性值
      const res = Reflect.set(target, key, newVal, receiver);
      if (target === receiver.raw) {
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
          trigger(target, key, type, newVal);
        }
      }

      return res;
    },
    has(target, key) {
      track(target, key);
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      //   console.log("ownkeys: ");
      track(target, Array.isArray(target) ? "length" : ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
    deleteProperty(target, key) {
      if (isReadonly) {
        console.warn(`属性 ${key} 是只读的`);
        return true;
      }
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const res = Reflect.deleteProperty(target, key);

      if (res && hadKey) {
        trigger(target, key, "DELETE");
      }

      return res;
    },
    // get(target, key, receiver) {
    //   if (key === "raw") return target;
    //   if (key === "size") {
    //     track(target, ITERATE_KEY);
    //     return Reflect.get(target, key, target);
    //   }

    //   return mutableInstrumentations[key];
    // },
  });
}

function shallowReactive(obj) {
  def(obj, "__v_isReactive", true);
  return createReactive(obj, true);
}

function readonly(obj) {
  def(obj, "__v_isReadonly", true);
  return createReactive(obj, false, true);
}

function shallowReadonly(obj) {
  def(obj, "__v_isReadonly", true);
  return createReactive(obj, true, true);
}

// ref函数
function ref(val) {
  debugger;
  const wrapper = {
    value: val,
  };

  def(wrapper, "__v_isRef", true);

  return reactive(wrapper);
}

function isRef(val) {
  return val.__v_isRef === true;
}

function toRefs(obj) {
  const ret = {};
  for (const key in obj) {
    ret[key] = toRef(obj, key);
  }
  return ret;
}

function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key];
    },
    set value(val) {
      obj[key] = val;
    },
  };

  def(wrapper, "__v_isRef", true);

  return wrapper;
}

/* 代理refs */
function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      return value.__v_isRef ? value.value : value;
    },
    set(target, key, newValue, receiver) {
      const value = target[key];
      if (value.__v_isRef) {
        value.value = newValue;
        return true;
      }
      return Reflect.set(target, key, newValue, receiver);
    },
  });
}

/**
 * 用get得到value属性的值
 * @param {*} getter
 * @returns
 */
function computed(getter) {
  debugger;
  let value;
  let dirty = true;

  // getter里面触发set就会执行scheduler
  // 只有computed回调里面收集的依赖被set才会触发scheduler才会把dirty置为true
  // 然后在render获取值时执行get才会获取新值
  const effectFn /* 副作用函数 */ = effect(getter, {
    lazy: true, // lazy标识
    computed: true, // conputed标识
    /* getter里面收集依赖的副作用函数 */
    scheduler() {
      debugger;
      if (!dirty) {
        dirty = true;
        // 执行副作用函数
        trigger(obj, "value");
      }
    },
  });

  const obj = {
    get value() {
      debugger;
      // 第一次触发set，dirty为true会执行effectFn取值
      if (dirty) {
        value = effectFn();
        // 第一次执行会把dirty置为false

        // 再次取值触发get时dirty才会为false
        dirty = false;
      }
      // 收集依赖
      track(obj, "value");
      return value;
    },
  };

  return obj;
}

// function traverse(value, seen = new Set() /*  */) {
//   if (typeof value !== "object" || value === null || seen.has(value)) return;
//   seen.add(value);
//   for (const k in value) {
//     traverse(value[k], seen);
//   }

//   return value;
// }

// function watch(source, cb, options = {}) {
//   let getter;
//   if (typeof source === "function") {
//     getter = source;
//   } else {
//     getter = () => traverse(source);
//   }

//   let oldValue, newValue;

//   let cleanup;
//   function onInvalidate(fn) {
//     cleanup = fn;
//   }

//   const job = () => {
//     newValue = effectFn();
//     if (cleanup) {
//       cleanup();
//     }
//     cb(oldValue, newValue, onInvalidate);
//     oldValue = newValue;
//   };

//   const effectFn = effect(
//     // 执行 getter
//     () => getter(),
//     {
//       lazy: true,
//       scheduler: () => {
//         if (options.flush === "post") {
//           const p = Promise.resolve();
//           p.then(job);
//         } else {
//           job();
//         }
//       },
//     }
//   );

//   if (options.immediate) {
//     job();
//   } else {
//     oldValue = effectFn();
//   }
// }
