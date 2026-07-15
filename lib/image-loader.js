"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const dns = require("node:dns/promises");
const net = require("node:net");
const mime = require("mime-types");

class ImageLoader {
  constructor(adapter) {
    this.adapter = adapter;
    this.maxBytes = Number(adapter.config.maxImageBytes) || 10 * 1024 * 1024;
  }

  async load(source) {
    if (/^https?:\/\//i.test(source)) return this.loadUrl(source);
    return this.loadFile(source);
  }

  async loadUrl(source) {
    const url = new URL(source);
    await this.assertPublicHost(url.hostname);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(`Image request failed with HTTP ${response.status}`);
    const type = response.headers.get("content-type")?.split(";")[0];
    if (!type?.startsWith("image/"))
      throw new Error("URL does not return an image");
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > this.maxBytes)
      throw new Error("Image exceeds configured size limit");
    return this.toDataUrl(Buffer.from(await response.arrayBuffer()), type);
  }

  async loadFile(source) {
    const allowedRoot = path.resolve(
      this.adapter.config.localImageDirectory ||
        this.adapter.getAbsoluteDefaultDataDir(),
    );
    const resolved = path.resolve(source);
    if (
      resolved !== allowedRoot &&
      !resolved.startsWith(`${allowedRoot}${path.sep}`)
    ) {
      throw new Error("Local image is outside the configured image directory");
    }
    const stat = await fs.stat(resolved);
    if (stat.size > this.maxBytes)
      throw new Error("Image exceeds configured size limit");
    const type = mime.lookup(resolved);
    if (!type || !String(type).startsWith("image/"))
      throw new Error("Local file is not an image");
    return this.toDataUrl(await fs.readFile(resolved), type);
  }

  async assertPublicHost(hostname) {
    const addresses = net.isIP(hostname)
      ? [{ address: hostname }]
      : await dns.lookup(hostname, { all: true });
    if (addresses.some(({ address }) => this.isPrivate(address)))
      throw new Error("Private network image URLs are blocked");
  }

  isPrivate(address) {
    const normalized = address.toLowerCase().replace(/^::ffff:/, "");
    return (
      /^(127\.|10\.|192\.168\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|0\.|::1$|fc|fd|fe80)/i.test(
        normalized,
      ) || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
    );
  }

  toDataUrl(buffer, type) {
    if (buffer.length > this.maxBytes)
      throw new Error("Image exceeds configured size limit");
    return `data:${type};base64,${buffer.toString("base64")}`;
  }
}

module.exports = ImageLoader;
