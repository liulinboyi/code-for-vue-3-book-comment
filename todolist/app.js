const ListWrapperChildren = function (context) {
  return h(
    Fragment,
    null,
    context.Lists.value.map((item, index) => ({
      type: List,
      props: {
        title: item.title,
        index: index,
        item,
      },
      key: item.id,
    }))
  );
};

const List = {
  props: {
    title: String,
    index: Number,
    item: Object,
  },
  render(context) {
    debugger;
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
      [ListWrapperChildren(context)]
    );

    // return {
    //   type: "ul",
    //   props: {
    //     class: "ul-wrapper",
    //   },
    //   children: [
    //     {
    //       type: Fragment,
    //       children: context.Lists.value.map((item, index) => ({
    //         type: List,
    //         props: {
    //           title: item.title,
    //           index: index,
    //           item,
    //         },
    //         key: item.id,
    //       })),
    //     },
    //   ],
    // };
  },
};

const Wrapper = {
  setup(props) {
    debugger;
    let Lists = ref([
      { id: 1, title: "eat", checked: false },
      { id: 2, title: "sleep", checked: false },
      { id: 3, title: "drink", checked: false },
    ]);
    watch(Lists.value, (val, oldVal) => {
      debugger;
      console.log("Lists is changed");
      console.log(val, oldVal);
    });

    function add() {
      let length = Lists.value.length;
      Lists.value.push({
        id: length + 1,
        title: `push-${length}`,
        checked: false,
      });
    }

    return {
      Lists,
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
    ]);
  },
};
const App = h(Wrapper);

renderer.render(App, document.querySelector("#app"));
