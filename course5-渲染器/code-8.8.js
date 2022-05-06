
function shouldSetAsProps(el, key, value) {
    if (key === 'form' && el.tagName === 'INPUT') return false
    return key in el
  }
  
  function createRenderer(options) {
  
    const {
      createElement,
      insert,
      setElementText,
      patchProps
    } = options
  
    function mountElement(vnode, container) {
      const el = vnode.el = createElement(vnode.type)
      if (typeof vnode.children === 'string') {
        setElementText(el, vnode.children)
      } else if (Array.isArray(vnode.children)) {
        vnode.children.forEach(child => {
          patch(null, child, el)
        })
      }
  
      if (vnode.props) {
        for (const key in vnode.props) {
          patchProps(el, key, null, vnode.props[key])
        }
      }
  
      insert(el, container)
    }
  
    /* 补丁元素 */
    function patchElement(n1, n2) {
      const el = n2.el = n1.el
      const oldProps = n1.props
      const newProps = n2.props
      
      for (const key in newProps) {
        // 新的props不等于旧的props，才会处理
        if (newProps[key] !== oldProps[key]) {
          patchProps(el, key, oldProps[key], newProps[key])
        }
      }
      for (const key in oldProps) {
        // 旧的props不在新props上时，才会处理
        if (!(key in newProps)) {
          patchProps(el, key, oldProps[key], null)
        }
      }
    }
  
    /* 卸载 */
    function unmount(vnode) {
      const parent = vnode.el.parentNode
      if (parent) {
        parent.removeChild(vnode.el)
      }
    }
  
    /* 补丁 */
    function patch(n1 /* 旧node */, n2 /* 新node */, container) {
      // 如果有旧node && 旧node.type不等于新node.type
      if (n1 /* 旧node */ && n1.type !== n2.type /* 旧node.type不等于新node.type */) {
        // 新旧node类型不同 直接卸载旧node
        unmount(n1)
        // 将旧node置null
        n1 = null
        container._vnode = null
      }
  
      // 获得新node的类型
      const { type } = n2
  
      // 如果新node类型是string，表示node是元素
      // 否则是组件
      if (typeof type === 'string') {
        if (!n1 /* 没有旧node */) {
          // 挂载元素
          mountElement(n2, container)
        } else {
          // 添加patchElement
          patchElement(n1, n2)
        }
      } else if (typeof type === 'object') {
        // 组件
      }
    }
  
    function render(vnode, container) {
      if (vnode) {
        // 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数进行打补丁
        patch(container._vnode, vnode, container)
      } else {
        if (container._vnode) {
          // 旧 vnode 存在，且新 vnode 不存在，说明是卸载(unmount)操作
          unmount(container._vnode)
        }
      }
      // 把 vnode 存储到 container._vnode 下，即后续渲染中的旧 vnode
      container._vnode = vnode
    }
    
    return {
      render
    }
  }
  
  const renderer = createRenderer({
    createElement(tag) {
      return document.createElement(tag)
    },
    setElementText(el, text) {
      el.textContent = text
    },
    insert(el, parent, anchor = null) {
      parent.insertBefore(el, anchor)
    },
    patchProps(el, key, prevValue, nextValue) {
      if (/^on/.test(key) /* 处理事件 */) {
        const invokers = el._vei || (el._vei = {})
        let invoker = invokers[key]
        const name = key.slice(2).toLowerCase()
        if (nextValue) {
          if (!invoker) {
            invoker = el._vei[key] = (e) => {
              console.log(e.timeStamp)
              console.log(invoker.attached)
              console.log('---------------------------')
              // 这里需要再看看，不知道为什么这么写
              if (e.timeStamp < invoker.attached) return
              if (Array.isArray(invoker.value)) {
                invoker.value.forEach(fn => fn(e))
              } else {
                invoker.value(e)
              }
            }
            invoker.value = nextValue
            // 当前时间
            invoker.attached = performance.now()
            el.addEventListener(name, invoker)
          } else {
            invoker.value = nextValue
          }
        } else if (invoker) {
          el.removeEventListener(name, invoker)
        }
      } else if (key === 'class') {
        el.className = nextValue || ''
      } else if (shouldSetAsProps(el, key, nextValue)) {
        const type = typeof el[key]
        if (type === 'boolean' && nextValue === '') {
          el[key] = true
        } else {
          el[key] = nextValue
        }
      } else {
        el.setAttribute(key, nextValue)
      }
    }
  })
  
  const { effect, ref } = VueReactivity
  
  const bol = ref(false)
  
  effect(() => {
    const vnode = {
      type: 'div',
      props: bol.value ? {
        onClick: () => {
          alert('父元素 clicked')
        }
      } : {},
      children: [
        {
          type: 'p',
          props: {
            onClick: () => {
              bol.value = true
            }
          },
          children: 'text'
        }
      ]
    }
    console.log('-------effecf--------------')
    renderer.render(vnode, document.querySelector('#app'))
  })
  