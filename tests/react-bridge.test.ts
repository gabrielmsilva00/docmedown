import assert from "node:assert/strict";
import { test } from "node:test";
import { createElementBridge } from "../src/runtime/bridges/element-bridge";
import { createReactBridge } from "../src/runtime/bridges/react-bridge";

test("createReactBridge produces custom element with lifecycle and prop handlers", async () => {
  function MockReactComponent(props: any) {
    return { type: "div", props };
  }

  let unmountCalled = false;
  let renderCalledWith: any = null;

  const mockCreateRoot = (_container: any) => ({
    render: (node: any) => {
      renderCalledWith = node;
    },
    unmount: () => {
      unmountCalled = true;
    },
  });

  const mockCreateElement = (type: any, props: any) => ({
    type,
    props,
  });

  // Mock minimal HTMLElement for Node testing
  class FakeHTMLElement {
    attributes: Array<{ name: string; value: string }> = [];
    childNodes: any[] = [];
    listeners: Record<string, Array<(...args: any[]) => void>> = {};

    getAttribute(name: string) {
      const match = this.attributes.find((a) => a.name === name);
      return match ? match.value : null;
    }
    setAttribute(name: string, value: string) {
      this.attributes.push({ name, value });
    }
    appendChild(child: any) {
      this.childNodes.push(child);
      return child;
    }
    addEventListener(name: string, fn: (...args: any[]) => void) {
      if (!this.listeners[name]) this.listeners[name] = [];
      this.listeners[name].push(fn);
    }
    dispatchEvent(event: any) {
      const fns = this.listeners[event.type] || [];
      for (const fn of fns) fn(event);
      return true;
    }
  }

  (globalThis as any).HTMLElement = FakeHTMLElement;
  (globalThis as any).document = {
    createElement: (_tag: string) => new FakeHTMLElement(),
  };

  const ElementClass = createReactBridge(MockReactComponent, {
    createRoot: mockCreateRoot,
    createElement: mockCreateElement,
  });

  assert.equal(typeof ElementClass, "function");

  const element = new ElementClass();
  element.setAttribute("title-label", "DocMeDown Test");
  element.setAttribute("count", "42");
  element.setAttribute("is-active", "true");

  element.connectedCallback();
  await element.mountPromise;

  assert.ok(renderCalledWith, "React createRoot.render should have been called on connect");
  assert.equal(renderCalledWith.props.titleLabel, "DocMeDown Test");
  assert.equal(renderCalledWith.props.count, 42);
  assert.equal(renderCalledWith.props.isActive, true);

  element.disconnectedCallback();
  assert.equal(unmountCalled, true, "React root.unmount should be called on disconnect");
});

test("React bridge reuses its shadow root and replaces host containers on reconnect", async () => {
  const originalHTMLElement = globalThis.HTMLElement;
  const originalDocument = globalThis.document;
  class FakeElement {
    attributes: Array<{ name: string; value: string }> = [];
    children: FakeElement[] = [];
    parent: FakeElement | null = null;
    shadowRoot: FakeElement | null = null;
    className = "";
    attachShadow() {
      assert.equal(this.shadowRoot, null, "a shadow root cannot be attached twice");
      this.shadowRoot = new FakeElement();
      return this.shadowRoot;
    }
    appendChild(child: FakeElement) {
      child.parent = this;
      this.children.push(child);
      return child;
    }
    remove() {
      if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    }
  }
  try {
    (globalThis as any).HTMLElement = FakeElement;
    (globalThis as any).document = { createElement: () => new FakeElement() };
    for (const shadowRoot of [false, true]) {
      let mounts = 0;
      let unmounts = 0;
      const ElementClass = createReactBridge(() => null, {
        shadowRoot,
        createElement: () => null,
        createRoot: () => {
          mounts++;
          return { render: () => {}, unmount: () => unmounts++ };
        },
      });
      const element = new ElementClass() as any;
      for (let cycle = 0; cycle < 3; cycle++) {
        element.connectedCallback();
        await element.mountPromise;
        assert.equal((shadowRoot ? element.shadowRoot : element).children.length, 1);
        element.disconnectedCallback();
      }
      assert.equal(mounts, 3);
      assert.equal(unmounts, 3);
    }
  } finally {
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.document = originalDocument;
  }
});

test("createElementBridge wraps and synchronizes attributes to properties", () => {
  class FakeCustomElement {
    attributes: Array<{ name: string; value: string }> = [];
    userName = "";
    options: any = null;

    connectedCallback() {}
  }

  const WrappedClass = createElementBridge(FakeCustomElement as any);
  const inst = new WrappedClass() as any;
  inst.attributes = [
    { name: "user-name", value: "Gabriel" },
    { name: "options", value: '{"theme":"dark"}' },
  ];

  inst.connectedCallback();
  assert.equal(inst.userName, "Gabriel");
  assert.deepEqual(inst.options, { theme: "dark" });
});
