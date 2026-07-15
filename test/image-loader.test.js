"use strict";

const assert = require("node:assert/strict");
const ImageLoader = require("../lib/image-loader");

describe("ImageLoader", () => {
  const loader = new ImageLoader({ config: {} });
  it("blocks common private IPv4 addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.1.1",
    ]) {
      assert.equal(loader.isPrivate(address), true, address);
    }
  });
  it("accepts a public IPv4 address", () =>
    assert.equal(loader.isPrivate("8.8.8.8"), false));
});
