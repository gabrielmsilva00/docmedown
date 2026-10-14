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
