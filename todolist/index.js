// const { reactive, ref, effect, shallowReactive, shallowReadonly } =
//   VueReactivity;
// const { watch } = Vue;
function lis(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = ((u + v) / 2) | 0;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
let currentRenderingInstance = null;

function setCurrentRenderingInstance(instance) {
  const prev = currentRenderingInstance;
  currentRenderingInstance = instance;
  // currentScopeId = (instance && instance.type.__scopeId) || null;
  return prev;
}

function shouldSetAsProps(el, key, value) {
  if (key === "form" && el.tagName === "INPUT") return false;
  return key in el;
}
const Fragment = Symbol();

let currentInstance = null;

/* 设置当前instance实例 */
function setCurrentInstance(instance) {
  // 保存当前instance为prev（上次的instance）
  const prev = currentInstance;
  // 设置传入的instance为当前instance
  currentInstance = instance;
  // 返回以前的instance
  return prev;
}

/* onMounted生命周期 */
function onMounted(fn) {
  // 如果存在当前instance实例，
  if (currentInstance) {
    // 将onMounted生命周期函数放到数组中去
    currentInstance.mounted.push(fn);
  }
}

/* 创建render */
function createRenderer(options) {
  const {
    createElement,
    insert,
    setElementText,
    patchProps,
    createText,
    setText,
  } = options;

  /* 挂载元素 */
  function mountElement(vnode, container, anchor) {
    const el = (vnode.el = createElement(vnode.type));
    if (typeof vnode.children === "string") {
      setElementText(el, vnode.children);
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach((child) => {
        patch(null, child, el);
      });
    }

    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key]);
      }
    }

    insert(el, container, anchor);
  }

  /* 补丁Children */
  function patchChildren(n1, n2, container) {
    if (typeof n2.children === "string") {
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c));
      }
      setElementText(container, n2.children);
    } else if (Array.isArray(n2.children)) {
      debugger;
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c));
        n2.children.forEach((c) => patch(null, c, container));
      } else {
        setElementText(container, "");
        n2.children.forEach((c) => patch(null, c, container));
      }
      // patchKeyedChildren(n1, n2, container);
    } else {
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c));
      } else if (typeof n1.children === "string") {
        setElementText(container, "");
      }
    }
  }

  /* 补丁元素 */
  function patchElement(n1, n2) {
    const el = (n2.el = n1.el);
    const oldProps = n1.props;
    const newProps = n2.props;

    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key]);
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null);
      }
    }

    patchChildren(n1, n2, el);
  }

  /* 卸载vnode */
  function unmount(vnode) {
    if (vnode.type === Fragment /* Fragment */) {
      vnode.children.forEach((c) => unmount(c));
      return;
    } else if (typeof vnode.type === "object" /* 组件 */) {
      // 递归卸载
      unmount(vnode.component.subTree);
      return;
    }
    // 父节点
    const parent = vnode.el.parentNode;
    if (parent /* 存在父节点 */) {
      // 父节点删除当前节点
      parent.removeChild(vnode.el);
    }
  }

  function patch(
    n1 /* 旧vnode */,
    n2 /* 新vnode */,
    container,
    anchor /* 祖先 */
  ) {
    // 旧vnode存在 && 旧vnode的类型和新vnode的类型不一致
    if (n1 && n1.type !== n2.type) {
      // 卸载旧vnode
      unmount(n1);
      n1 = null;
    }

    // 将新vnode类型解构出来 type 既可以是标签类型，也可以是组件
    const { type } = n2;

    if (typeof type === "string" /* 标签 */) {
      if (!n1 /* 没有旧vnode节点 */) {
        mountElement(n2, container, anchor);
      } /* 有旧vnode节点 */ else {
        patchElement(n1, n2);
      }
    } else if (type === Text /* 是文本节点 */) {
      if (!n1 /* 没有旧vnode节点 */) {
        const el = (n2.el = createText(n2.children));
        insert(el, container);
      } /* 有旧vnode节点 */ else {
        const el = (n2.el = n1.el);
        if (n2.children !== n1.children) {
          setText(el, n2.children);
        }
      }
    } else if (type === Fragment /* 类型是Fragment */) {
      if (!n1 /* 没有旧vnode节点 */) {
        n2.children.forEach((c) => patch(null, c, container));
      } /* 有旧vnode节点 */ else {
        patchChildren(n1, n2, container);
      }
    } else if (
      typeof type === "object" ||
      typeof type === "function" /* 组件 */
    ) {
      // component
      if (!n1 /* 没有旧vnode节点 */) {
        mountComponent(n2, container, anchor);
      } /* 有旧vnode节点 */ else {
        patchComponent(n1, n2, anchor);
      }
    }
  }

  function mountFunctionalComponent(n2, container, anchor) {}

  /* 补丁组件 */
  function patchComponent(n1, n2, anchor) {
    // 这时，说明vnod类型一致，那就是这个vnode对象没变，只需要更新props即可
    const instance = (n2.component = n1.component);
    const { props } = instance;
    if (hasPropsChanged(n1.props, n2.props)) {
      const [nextProps, nextAttrs] = resolveProps(n2.type.props, n2.props);
      for (const k in nextProps) {
        props[k] = nextProps[k];
      }
      for (const k in props) {
        if (!(k in nextProps)) delete props[k];
      }
    }
  }

  /* props是否改变了 */
  function hasPropsChanged(prevProps, nextProps) {
    const nextKeys = Object.keys(nextProps);
    if (nextKeys.length !== Object.keys(prevProps).length) {
      return true;
    }
    for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i];
      return nextProps[key] !== prevProps[key];
    }
    return false;
  }

  const p = Promise.resolve();
  /* 队列 */
  const queue = new Set();
  /* 是否正在执行队列 */
  let isFlushing = false;

  /* 加入并执行队列 */
  function queueJob(job) {
    debugger;
    // 加入队列
    queue.add(job);
    console.log(queue);
    if (!isFlushing /* 队列没有正在执行 */) {
      isFlushing = true; // 正在执行
      p.then(() => {
        try {
          // 开始执行
          queue.forEach((job) => job());
        } finally {
          // 成功或失败，最终都到置为false
          isFlushing = false;
        }
      });
    }
  }

  /* 解析props */
  function resolveProps(options, propsData) {
    const props = {};
    const attrs = {};
    for (const key in propsData) {
      if ((options && key in options) || key.startsWith("on")) {
        props[key] = propsData[key];
      } else {
        attrs[key] = propsData[key];
      }
    }

    return [props, attrs];
  }

  function renderComponent(render, instance, renderContext) {
    const prev = setCurrentRenderingInstance(instance);
    let result = null;
    result = render.call(renderContext, renderContext);
    setCurrentRenderingInstance(prev);
    return result;
  }

  // 核心是，通过对象描述组件，然后执行此方法挂载组件及其children
  // 渲染Effect在mountComponent里面
  /* 挂载组件 */
  function mountComponent(vnode, container, anchor) {
    const isFunctional = typeof vnode.type === "function";
    let componentOptions = vnode.type;
    if (isFunctional) {
      componentOptions = {
        render: vnode.type,
        props: vnode.type.props,
      };
    }
    // 解构属性
    let {
      render,
      data,
      setup,
      beforeCreate,
      created,
      beforeMount,
      mounted,
      beforeUpdate,
      updated,
      props: propsOption,
    } = componentOptions;

    // 执行beforeCreate声明周期
    beforeCreate && beforeCreate();

    // 使data变为响应式
    const state = data ? reactive(data()) : null;
    // 解析props
    const [props, attrs] = resolveProps(propsOption, vnode.props);

    // vnode.children作为插槽
    // 在使用组件过程中，里面的children就是插槽
    const slots = vnode.children || {};

    const instance = {
      state,
      props: shallowReactive(props),
      isMounted: false,
      subTree: null,
      slots,
      mounted: [],
    };

    /* 事件 */
    function emit(event, ...payload) {
      debugger;
      const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
      const handler = instance.props[eventName];
      if (handler) {
        handler(...payload);
      } else {
        console.error("事件不存在");
      }
    }

    // setup
    let setupState = null;
    if (setup /* 如果setup存在 */) {
      // setup 上下文
      const setupContext = {
        attrs, // 属性
        emit, // 事件
        slots, // 插槽
      };
      // 设置当前instance实例 返回上次的instance
      const prevInstance = setCurrentInstance(instance);
      // 执行setup
      const setupResult = setup(shallowReadonly(instance.props), setupContext);
      // 恢复为上次的instance
      debugger;
      setCurrentInstance(prevInstance);
      if (typeof setupResult === "function" /* setup返回的是函数 */) {
        if (render)
          // 如下
          console.error("setup 函数返回渲染函数，render 选项将被忽略");
        // 设置为render函数
        render = setupResult;
      } else {
        // ？？setupResult还是setupContext
        // 其他情况，将setupContext设置为setupState
        setupState = setupResult;
      }
    }

    vnode.component = instance;

    // 渲染上下文
    const renderContext = new Proxy(instance, {
      get(t, k, r) {
        const { state, props, slots } = t;

        if (k === "$slots") return slots;
        if (k === "$setup") return setupState;
        if (k === "emit") return emit;

        if (state && k in state) {
          return state[k];
        } else if (k in props) {
          return props[k];
        } else if (setupState && k in setupState) {
          return setupState[k];
        } else {
          console.error("不存在");
        }
      },
      set(t, k, v, r) {
        const { state, props } = t;
        if (state && k in state) {
          state[k] = v;
        } else if (k in props) {
          props[k] = v;
        } else if (setupState && k in setupState) {
          setupState[k] = v;
        } else {
          console.error("不存在");
        }
      },
    });

    // created
    created && created.call(renderContext);

    const renderCode = () => {
      debugger;
      // 执行组件的render函数，核心是，用对象描述组件，执行对象中的render方法
      const subTree = renderComponent(render, instance, renderContext);
      if (!instance.isMounted /* 没有挂载 */) {
        // 执行beforeMount生命周期 option上的
        beforeMount && beforeMount.call(renderContext);
        // 补丁
        patch(null, subTree, container, anchor);
        // 将isMounted挂载标识置为true
        instance.isMounted = true;
        // 执行mounted生命周期 option上的
        mounted && mounted.call(renderContext);
        instance.mounted &&
          instance.mounted.forEach((hook) => hook.call(renderContext));
      } /* 已挂载 */ else {
        beforeUpdate && beforeUpdate.call(renderContext);
        patch(instance.subTree, subTree, container, anchor);
        updated && updated.call(renderContext);
      }
      instance.subTree = subTree;
    };

    // 在effect中执行render函数
    // effect 最大的作用就是在这里执行render函数，在这个过程中通过访问reactive对象属性set，
    // 收集依赖，收集已经reactive之后的对象的依赖
    // 以后每次这些对象属性更新后，会触发set，进而触发effectFn，当然如果有scheduler
    // 则使用scheduler执行effectFn
    effect(
      // effectFn
      renderCode,
      {
        scheduler: queueJob, // 使用scheduler执行effectFn
      }
    );
  }

  function render(vnode, container) {
    debugger;
    if (vnode /* 新vnode */) {
      // 核心就在path里面
      // 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数进行打补丁
      patch(container._vnode /* 旧vnode */, vnode /* 新vode */, container);
    } else {
      if (container._vnode) {
        // 旧 vnode 存在，且新 vnode 不存在，说明是卸载(unmount)操作
        unmount(container._vnode);
      }
    }
    // 把 vnode 存储到 container._vnode 下，即后续渲染中的旧 vnode
    container._vnode = vnode;
  }

  return {
    render,
    createApp: createAppApi(render),
  };
}

function createApp(...args) {
  const app = ensureRenderer().createApp(...args);
  const { mount } = app;
  app.mount = (containerOrSelector) => {
    mount(containerOrSelector);
  };
  return app;
}

function createAppApi(render) {
  return function createApp(rootComponent) {
    const app = {
      // 其他Api
      mount(el) {
        render(rootComponent, el);
      },
    };
    return app;
  };
}

function ensureRenderer() {
  const renderer = createRenderer({
    createElement(tag) {
      return document.createElement(tag);
    },
    setElementText(el, text) {
      el.textContent = text;
    },
    insert(el, parent, anchor = null) {
      parent.insertBefore(el, anchor);
    },
    createText(text) {
      return document.createTextNode(text);
    },
    setText(el, text) {
      el.nodeValue = text;
    },
    patchProps(el, key, prevValue, nextValue) {
      if (/^on/.test(key)) {
        const invokers = el._vei || (el._vei = {});
        let invoker = invokers[key];
        const name = key.slice(2).toLowerCase();
        if (nextValue) {
          if (!invoker) {
            invoker = el._vei[key] = (e) => {
              console.log(e.timeStamp);
              console.log(invoker.attached);
              if (e.timeStamp < invoker.attached) return;
              if (Array.isArray(invoker.value)) {
                invoker.value.forEach((fn) => fn(e));
              } else {
                invoker.value(e);
              }
            };
            invoker.value = nextValue;
            invoker.attached = performance.now();
            el.addEventListener(name, invoker);
          } else {
            invoker.value = nextValue;
          }
        } else if (invoker) {
          el.removeEventListener(name, invoker);
        }
      } else if (key === "class") {
        el.className = nextValue || "";
      } else if (shouldSetAsProps(el, key, nextValue)) {
        const type = typeof el[key];
        if (type === "boolean" && nextValue === "") {
          el[key] = true;
        } else {
          el[key] = nextValue;
        }
      } else {
        el.setAttribute(key, nextValue);
      }
    },
  });
  return renderer;
}
