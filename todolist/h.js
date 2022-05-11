const isObject = (val) => val !== null && typeof val === "object";
const isArray = Array.isArray;
function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}
const isFunction = (val) => typeof val === "function";
const isString = (val) => typeof val === "string";
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
const isMap = (val) => toTypeString(val) === "[object Map]";

function toRaw(observed) {
  const raw = observed && observed["raw"];
  return raw ? toRaw(raw) : observed;
}

const listDelimiterRE = /;(?![^(]*\))/g;
const propertyDelimiterRE = /:(.+)/;
function parseStringStyle(cssText) {
  const ret = {};
  cssText.split(listDelimiterRE).forEach((item) => {
    if (item) {
      const tmp = item.split(propertyDelimiterRE);
      tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
    }
  });
  return ret;
}

function normalizeStyle(value) {
  if (isArray(value)) {
    const res = {};
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const normalized = isString(item)
        ? parseStringStyle(item)
        : normalizeStyle(item);
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key];
        }
      }
    }
    return res;
  } else if (isString(value)) {
    return value;
  } else if (isObject(value)) {
    return value;
  }
}

function normalizeClass(value) {
  let res = "";
  if (isString(value)) {
    res = value;
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i]);
      if (normalized) {
        res += normalized + " ";
      }
    }
  } else if (isObject(value)) {
    for (const name in value) {
      if (value[name]) {
        res += name + " ";
      }
    }
  }
  return res.trim();
}
function normalizeProps(props) {
  if (!props) return null;
  let { class: klass, style } = props;
  if (klass && !isString(klass)) {
    props.class = normalizeClass(klass);
  }
  if (style) {
    props.style = normalizeStyle(style);
  }
  return props;
}

function mergeProps(...args) {
  const ret = {};
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i];
    for (const key in toMerge) {
      if (key === "class") {
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class]);
        }
      } else if (key === "style") {
        ret.style = normalizeStyle([ret.style, toMerge.style]);
      } else if (isOn(key)) {
        const existing = ret[key];
        const incoming = toMerge[key];
        if (
          incoming &&
          existing !== incoming &&
          !(isArray(existing) && existing.includes(incoming))
        ) {
          ret[key] = existing ? [].concat(existing, incoming) : incoming;
        }
      } else if (key !== "") {
        ret[key] = toMerge[key];
      }
    }
  }
  return ret;
}

const normalizeKey = ({ key }) => (key != null ? key : null);
const normalizeRef = ({ ref, ref_key, ref_for }) => {
  return ref != null
    ? isString(ref) || isRef(ref) || isFunction(ref)
      ? { i: currentRenderingInstance, r: ref, k: ref_key, f: !!ref_for }
      : ref
    : null;
};

function cloneVNode(vnode, extraProps, mergeRef = false) {
  // This is intentionally NOT using spread or extend to avoid the runtime
  // key enumeration cost.
  const { props, ref, patchFlag, children } = vnode;
  const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
  const cloned = {
    __v_isVNode: true,
    __v_skip: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps && normalizeKey(mergedProps),
    ref:
      extraProps && extraProps.ref
        ? // #2078 in the case of <component :is="vnode" ref="extra"/>
          // if the vnode itself already has a ref, cloneVNode will need to merge
          // the refs so the single vnode can be set on multiple refs
          mergeRef && ref
          ? isArray(ref)
            ? ref.concat(normalizeRef(extraProps))
            : [ref, normalizeRef(extraProps)]
          : normalizeRef(extraProps)
        : ref,
    scopeId: vnode.scopeId,
    slotScopeIds: vnode.slotScopeIds,
    children:
      process.env.NODE_ENV !== "production" &&
      patchFlag === -1 /* HOISTED */ &&
      isArray(children)
        ? children.map(deepCloneVNode)
        : children,
    target: vnode.target,
    targetAnchor: vnode.targetAnchor,
    staticCount: vnode.staticCount,
    shapeFlag: vnode.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag:
      extraProps && vnode.type !== Fragment
        ? patchFlag === -1 // hoisted node
          ? 16 /* FULL_PROPS */
          : patchFlag | 16 /* FULL_PROPS */
        : patchFlag,
    dynamicProps: vnode.dynamicProps,
    dynamicChildren: vnode.dynamicChildren,
    appContext: vnode.appContext,
    dirs: vnode.dirs,
    transition: vnode.transition,
    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: vnode.component,
    suspense: vnode.suspense,
    ssContent: vnode.ssContent && cloneVNode(vnode.ssContent),
    ssFallback: vnode.ssFallback && cloneVNode(vnode.ssFallback),
    el: vnode.el,
    anchor: vnode.anchor,
  };
  return cloned;
}

function createBaseVNode(
  type,
  props = null,
  children = null,
  patchFlag = 0,
  dynamicProps = null,
  shapeFlag = type === Fragment ? 0 : 1 /* ELEMENT */,
  isBlockNode = false,
  needFullChildrenNormalization = false
) {
  // debugger;
  const vnode = {
    __v_isVNode: true,
    __v_skip: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
    // scopeId: currentScopeId,
    slotScopeIds: null,
    children,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    appContext: null,
  };
  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children);
    // normalize suspense children
    if (shapeFlag & 128 /* SUSPENSE */) {
      type.normalize(vnode);
    }
  } else if (children) {
    // compiled element vnode - if children is passed, only possible types are
    // string or Array.
    vnode.shapeFlag |= isString(children)
      ? "TEXT_CHILDREN" /* TEXT_CHILDREN */
      : "ARRAY_CHILDREN" /* ARRAY_CHILDREN */;
  }
  return vnode;
}

function normalizeChildren(vnode, children) {
  let type = 0;
  const { shapeFlag } = vnode;
  if (children == null) {
    children = null;
  } else if (isArray(children)) {
    type = "ARRAY_CHILDREN" /* ARRAY_CHILDREN */;
  } else if (typeof children === "object") {
    if (shapeFlag === "ELEMENT") {
      // Normalize slot to plain children for plain element and Teleport
      const slot = children.default;
      if (slot) {
        // _c marker is added by withCtx() indicating this is a compiled slot
        slot._c && (slot._d = false);
        normalizeChildren(vnode, slot());
        slot._c && (slot._d = true);
      }
      return;
    } else {
      // debugger;
      type = "SLOTS_CHILDREN" /* SLOTS_CHILDREN */;
      const slotFlag = children._;
      if (!slotFlag) {
        children._ctx = currentRenderingInstance;
      } else if (
        slotFlag === "FORWARDED" /* FORWARDED */ &&
        currentRenderingInstance
      ) {
        // a child component receives forwarded slots from the parent.
        // its slot type is determined by its parent's slot type.
        if (currentRenderingInstance.slots._ === "STABLE" /* STABLE */) {
          children._ = "STABLE" /* STABLE */;
        } else {
          children._ = "DYNAMIC" /* DYNAMIC */;
          // vnode.patchFlag |= 1024 /* DYNAMIC_SLOTS */;
        }
      }
    }
  } else if (isFunction(children)) {
    children = { default: children, _ctx: currentRenderingInstance };
    type = "SLOTS_CHILDREN" /* SLOTS_CHILDREN */;
  } else {
    children = String(children);
    // force teleport children to array so it can be moved around
    if (shapeFlag & 64 /* TELEPORT */) {
      type = "ARRAY_CHILDREN" /* ARRAY_CHILDREN */;
      children = [createTextVNode(children)];
    } else {
      type = "TEXT_CHILDREN" /* TEXT_CHILDREN */;
    }
  }
  vnode.children = children;
  vnode.childrenType = type;
  // vnode.shapeFlag += "-" + type; // hack
}

function createTextVNode(text = " ", flag = 0) {
  return createVNode(Text, null, text, flag);
}

function isClassComponent(value) {
  return isFunction(value) && "__vccOpts" in value;
}

function createVNode(
  type,
  props = null,
  children = null,
  patchFlag = 0,
  dynamicProps = null,
  isBlockNode = false
) {
  // debugger;
  if (!type) {
    type = Comment;
  }
  if (isVNode(type)) {
    // createVNode receiving an existing vnode. This happens in cases like
    // <component :is="vnode"/>
    // #2078 make sure to merge refs during the clone instead of overwriting it
    const cloned = cloneVNode(type, props, true /* mergeRef: true */);
    if (children) {
      normalizeChildren(cloned, children);
    }
    return cloned;
  }
  // class component normalization.
  if (isClassComponent(type)) {
    type = type.__vccOpts;
  }
  // class & style normalization.
  if (props) {
    // for reactive or proxy objects, we need to clone it to enable mutation.
    props = guardReactiveProps(props);
    let { class: klass, style } = props;
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass);
    }
    if (isObject(style)) {
      // reactive state objects need to be cloned since they are likely to be
      // mutated
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style);
      }
      props.style = normalizeStyle(style);
    }
  }
  // encode the vnode type information into a bitmap
  const shapeFlag = isString(type)
    ? "ELEMENT" /* ELEMENT */
    : isObject(type)
    ? "STATEFUL_COMPONENT" /* STATEFUL_COMPONENT */
    : isFunction(type)
    ? "FUNCTIONAL_COMPONENT" /* FUNCTIONAL_COMPONENT */
    : "NULL";
  if (
    // process.env.NODE_ENV !== "production" &&
    shapeFlag === "STATEFUL_COMPONENT" /* STATEFUL_COMPONENT */ &&
    isProxy(type)
  ) {
    type = toRaw(type);
  }
  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  );
}

const extend = Object.assign;

function guardReactiveProps(props) {
  if (!props) return null;
  return isProxy(props) ? extend({}, props) : props;
}

function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}

function isReactive(value) {
  if (isReadonly(value)) {
    return isReactive(value["raw" /* RAW */]);
  }
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}
function isReadonly(value) {
  return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
}

function h(type, propsOrChildren, children) {
  // debugger;
  const l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // single vnode without props
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      // props without children
      return createVNode(type, propsOrChildren);
    } else {
      // omit props
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2);
    } else if (l === 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}
