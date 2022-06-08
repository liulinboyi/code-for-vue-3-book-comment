const ListWrapperChildren = {
  props: {
    Lists: Array,
  },
  render() {
    return h(Fragment, null, [
      ...this.Lists.value.map((item, index) =>
        h(List, {
          title: item.title,
          index: index,
          item,
        })
      ),
      h("div", {}, this.$slots.default({ Lists: this.Lists })),
    ]);
  },
};

const List = {
  props: {
    title: String,
    index: Number,
    item: Object,
  },
  render(context) {
    // debugger;
    return h("li", { class: "list" }, [
      h(
        "h1",
        {
          onClick() {
            context.item.checked = !context.item.checked;
          },
        },
        context.title
      ),
      h(
        "input",
        {
          onClick(event) {
            debugger;
            console.log(event, context.title, context.index);
            if (event.target.checked) {
              context.item.checked = true;
            } else {
              context.item.checked = false;
            }
            console.log(context.item);
          },
          type: "checkbox",
          checked: context.item.checked,
        },
        context.title
      ),
    ]);
  },
};

const ListWrapper = {
  props: {
    Lists: Array,
  },
  setup(props) {
    return {
      Lists: props.Lists,
    };
  },
  render(context) {
    return h(
      "ul",
      {
        class: "ul-wrapper",
      },
      [
        h(
          ListWrapperChildren,
          {
            Lists: this.Lists,
          },
          {
            default: (props) => {
              debugger;
              return h("span", "default slote");
            },
          }
        ),
      ]
    );
  },
};

const Wrapper = {
  setup(props) {
    // debugger;
    let Lists = ref([
      { id: 1, title: "eat", checked: false },
      { id: 2, title: "sleep", checked: false },
      { id: 3, title: "drink", checked: false },
    ]);
    let test = reactive({ haha: [1, 2, 3] });
    watch(Lists.value, (val, oldVal) => {
      debugger;
      console.log("Lists is changed");
      console.log(val, oldVal);
    });

    let foo = computed(() => {
      debugger;
      // 如果直接使用Lists.value，都不会触发effectFn，数据会更新
      // 使用Lists.value上的具体属性则会触发effectFn
      return Lists.value.length;
    });

    let test_a = computed(() => {
      debugger;
      return test.haha;
    });

    function add() {
      let length = Lists.value.length;
      Lists.value.push({
        id: length + 1,
        title: `push-${length}`,
        checked: false,
      });
      // push 只会收集length和各个索引的依赖，不会收集本身数据的依赖
      // test.value.haha.push(0);

      // 这样就可以收集本身数据的依赖了
      debugger;
      test.haha = [...test.haha, 0];
    }

    return {
      Lists,
      foo,
      test,
      test_a,
      add,
    };
  },
  render(context) {
    return h("div", { class: "wrapper" }, [
      h(ListWrapper, { Lists: context.$setup.Lists }),
      h(
        "button",
        {
          onClick() {
            debugger;
            context.$setup.add();
          },
        },
        "ADD"
      ),
      h("div", {}, JSON.stringify(this.foo.value)),
      h("div", {}, JSON.stringify(this.test_a.value)),
    ]);
  },
};
const App = h(Wrapper);

// renderer.render(App, document.querySelector("#app"));
const app = createApp(App);
app.mount(document.querySelector("#app"));
