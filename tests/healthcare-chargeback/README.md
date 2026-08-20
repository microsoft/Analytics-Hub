# healthcare-chargeback tests

Kept outside `docs/` so GitHub Pages does not serve them.

```
npm install jsdom --no-save
node tests/healthcare-chargeback/settlement.test.js   # settlement maths
node tests/healthcare-chargeback/demo.test.js         # demo-mode e2e (jsdom)
```

`settlement.test.js` needs no dependencies. `demo.test.js` needs `jsdom`.

**What they cover**

`settlement.test.js` pins the worked example behind the NSW Health options doc:
a 1.25M pool where one unit funds 750K but uses 500K. Entitlement billing
over-collects $500 against the real invoice, and both the rebate and
redistribute treatments must return that surplus exactly.

`demo.test.js` loads the real `index.html` in jsdom, clicks Demo, and asserts
the settlement panel lands populated and reconciles to zero residual. It also
asserts the demo shows unused entitlement and at least one over-consuming unit,
because a split that nets to zero everywhere demonstrates nothing.
