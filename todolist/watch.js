/**
 * 把所有值过一遍，并不做处理
 * 在这个过程中执行了get
 * @param {*} value
 * @param {*} seen
 * @returns
 */
function traverse(value, seen = new Set() /*  */) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  for (const k in value) {
    traverse(value[k], seen);
  }

  return value;
}

function watch(source, cb, options = {}) {
  // 对source做处理
  let getter;
  if (typeof source === "function") {
    // 是函数，直接赋值
    getter = source;
  } else {
    // 不是函数，则在getter里面把所有属性过一遍，来收集依赖
    getter = () => traverse(source);
  }

  let oldValue, newValue;

  let cleanup;
  function onInvalidate(fn) {
    cleanup = fn;
  }

  const job = () => {
    newValue = effectFn();
    if (cleanup) {
      cleanup();
    }
    cb(oldValue, newValue, onInvalidate);
    oldValue = newValue;
  };

  const effectFn = effect(
    // 执行 getter
    () => getter(),
    {
      lazy: true, // 不执行effectFn，只把effectFn返回
      scheduler: () => {
        debugger;
        if (options.flush === "post") {
          const p = Promise.resolve();
          p.then(job);
        } else {
          job();
        }
      },
    }
  );

  if (options.immediate) {
    // 如果有immediate参数，则立即执行job
    // 此时直接执行job，newValue会在里面计算，oldValue则是undefiend
    job();
  } else {
    // 否则，执行effectFn计算出getter的结果
    oldValue = effectFn();
  }
}
