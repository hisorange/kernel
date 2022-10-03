# Async Application Kernel

[![Version](https://img.shields.io/npm/v/@hisorange/kernel?label=Version)](https://www.npmjs.com/package/@hisorange/kernel)
[![Build](https://github.com/hisorange/kernel/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hisorange/kernel/actions/workflows/ci.yml)
[![NPM](https://img.shields.io/npm/dt/@hisorange/kernel?label=NPM)](https://www.npmjs.com/package/@hisorange/kernel)
[![GitHub Last Update](https://img.shields.io/github/last-commit/hisorange/kernel?label=Last%20Updated)](https://github.com/hisorange/kernel/commits/main)
[![License](https://img.shields.io/github/license/hisorange/kernel?label=License)](https://github.com/hisorange/kernel/blob/main/LICENSE)

Just my personal take on an async application kernel. It has injection management, simple module system, and a few other things.

## Getting Started

```sh
yarn add @hisorange/kernel
```

## Usage

```ts
const kernel = new Kernel();
kernel.register([MyModule, SecondModule]);

await kernel.boostrap();
await kernel.start();

process.on(
  'SIGINT',
  kernel.stop().then(() => process.exit(0)),
);
```
