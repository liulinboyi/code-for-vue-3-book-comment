function patchKeyedChildren(n1, n2, container) {
  const newChildren = n2.children;
  const oldChildren = n1.children;
  // 更新相同的前缀节点
  // 索引 j 指向新旧两组子节点的开头
  let j = 0;
  let oldVNode = oldChildren[j];
  let newVNode = newChildren[j];
  const min = Math.min(oldChildren.length, newChildren.length);
  // while 循环向后遍历，直到遇到拥有不同 key 值的节点为止
  while (j < min && oldVNode.key === newVNode.key) {
    // 调用 patch 函数更新
    patch(oldVNode, newVNode, container);
    j++;
    oldVNode = oldChildren[j];
    newVNode = newChildren[j];
  }

  // 更新相同的后缀节点
  // 索引 oldEnd 指向旧的一组子节点的最后一个节点
  let oldEnd = oldChildren.length - 1;
  // 索引 newEnd 指向新的一组子节点的最后一个节点
  let newEnd = newChildren.length - 1;

  oldVNode = oldChildren[oldEnd];
  newVNode = newChildren[newEnd];

  // while 循环向前遍历，直到遇到拥有不同 key 值的节点为止
  while (oldEnd > 0 && newEnd > 0 && oldVNode.key === newVNode.key) {
    // 调用 patch 函数更新
    patch(oldVNode, newVNode, container);
    oldEnd--;
    newEnd--;
    oldVNode = oldChildren[oldEnd];
    newVNode = newChildren[newEnd];
  }

  // 满足条件，则说明从 j -> newEnd 之间的节点应作为新节点插入
  if (j > oldEnd && j <= newEnd) {
    // 锚点的索引
    const anchorIndex = newEnd + 1;
    // 锚点元素
    const anchor =
      anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null;
    // 采用 while 循环，调用 patch 函数逐个挂载新增的节点
    while (j <= newEnd) {
      patch(null, newChildren[j++], container, anchor);
    }
  } else if (j > newEnd && j <= oldEnd) {
    // j -> oldEnd 之间的节点应该被卸载
    while (j <= oldEnd) {
      unmount(oldChildren[j++]);
    }
  } else {
    // 构造 source 数组
    const count = newEnd - j + 1; // 新的一组子节点中剩余未处理节点的数量
    if (count <= 0) return;
    const source = new Array(count);
    source.fill(-1);

    const oldStart = j;
    const newStart = j;
    let moved = false;
    let pos = 0;
    const keyIndex = {};
    for (let i = newStart; i <= newEnd; i++) {
      keyIndex[newChildren[i].key] = i;
    }
    let patched = 0;
    for (let i = oldStart; i <= oldEnd; i++) {
      oldVNode = oldChildren[i];
      if (patched < count) {
        const k = keyIndex[oldVNode.key];
        if (typeof k !== "undefined") {
          newVNode = newChildren[k];
          patch(oldVNode, newVNode, container);
          patched++;
          source[k - newStart] = i;
          // 判断是否需要移动
          if (k < pos) {
            moved = true;
          } else {
            pos = k;
          }
        } else {
          // 没找到
          unmount(oldVNode);
        }
      } else {
        unmount(oldVNode);
      }
    }

    if (moved) {
      const seq = lis(source);
      // s 指向最长递增子序列的最后一个值
      let s = seq.length - 1;
      let i = count - 1;
      for (i; i >= 0; i--) {
        if (source[i] === -1) {
          // 说明索引为 i 的节点是全新的节点，应该将其挂载
          // 该节点在新 children 中的真实位置索引
          const pos = i + newStart;
          const newVNode = newChildren[pos];
          // 该节点下一个节点的位置索引
          const nextPos = pos + 1;
          // 锚点
          const anchor =
            nextPos < newChildren.length ? newChildren[nextPos].el : null;
          // 挂载
          patch(null, newVNode, container, anchor);
        } else if (i !== seq[j]) {
          // 说明该节点需要移动
          // 该节点在新的一组子节点中的真实位置索引
          const pos = i + newStart;
          const newVNode = newChildren[pos];
          // 该节点下一个节点的位置索引
          const nextPos = pos + 1;
          // 锚点
          const anchor =
            nextPos < newChildren.length ? newChildren[nextPos].el : null;
          // 移动
          insert(newVNode.el, container, anchor);
        } else {
          // 当 i === seq[j] 时，说明该位置的节点不需要移动
          // 并让 s 指向下一个位置
          s--;
        }
      }
    }
  }
}
