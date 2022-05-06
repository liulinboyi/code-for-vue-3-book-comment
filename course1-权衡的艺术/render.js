export async function Render(obj, root) {
    // 创建DOM标签
    const el = document.createElement(obj.tag)
    if (typeof obj.children === 'string' /* 如果children类型是string */ ) {
        const text = document.createTextNode(obj.children)
        el.appendChild(text)
    } else if (Array.isArray(obj.children)) /* 如果children的类型是Array */ {
        // array，递归调用 Render，使用 el 作为 root 参数
        for (let child of obj.children) {
            Render(child, el)
        }
    }


    // 将元素添加到 root
    root.appendChild(el)
}

export const obj = {
    tag: "div",
    children: [{
            tag: "span",
            children: "hello world",
        },
        {
            tag: "div",
            children: [{
                    tag: "span",
                    children: "this ",
                },
                {
                    tag: "span",
                    children: "is ",
                },
                {
                    tag: "span",
                    children: "render",
                },
            ],
        },
    ],
};