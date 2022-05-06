// watch(
//   () => Lists.value.length,
//   (val, oldVal) => {
//     debugger;
//     console.log("Lists is changed");
//     console.log(val, oldVal);
//   }
// );

let List = {
  props: {
    title: String,
    index: Number,
    item: Object,
  },
  render(context) {
    debugger;
    return {
      type: "li",
      props: {
        class: "list",
      },
      children: [
        {
          type: "h1",
          props: {
            onClick() {
              context.item.checked = !context.item.checked;
            },
          },
          children: context.title,
        },
        {
          type: "input",
          props: {
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
          children: context.title,
        },
      ],
    };
  },
};

let ListWrapper = {
  props: {
    Lists: Array,
  },
  setup(props) {
    return {
      Lists: props.Lists,
    };
  },
  render(context) {
    return {
      type: "ul",
      props: {
        class: "ul-wrapper",
      },
      children: [
        {
          type: Fragment,
          children: context.Lists.value.map((item, index) => ({
            type: List,
            props: {
              title: item.title,
              index: index,
              item,
            },
            key: item.id,
          })),
        },
      ],
    };
  },
};

const App = {
  type: {
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
      return {
        type: "div",
        props: {
          class: "wrapper",
        },
        children: [
          {
            type: ListWrapper,
            props: {
              Lists: context.$setup.Lists,
            },
          },
          {
            type: "button",
            props: {
              onClick() {
                debugger;
                context.$setup.add();
              },
            },
            children: "ADD",
          },
        ],
      };
    },
  },
};

renderer.render(App, document.querySelector("#app"));
