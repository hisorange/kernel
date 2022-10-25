# Async Application Kernel

[![Version](https://img.shields.io/npm/v/@hisorange/kernel?label=Version)](https://www.npmjs.com/package/@hisorange/kernel)
[![Build](https://github.com/hisorange/kernel/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hisorange/kernel/actions/workflows/ci.yml)
[![NPM](https://img.shields.io/npm/dt/@hisorange/kernel?label=NPM)](https://www.npmjs.com/package/@hisorange/kernel)
[![GitHub Last Update](https://img.shields.io/github/last-commit/hisorange/kernel?label=Last%20Updated)](https://github.com/hisorange/kernel/commits/main)
[![License](https://img.shields.io/github/license/hisorange/kernel?label=License)](https://github.com/hisorange/kernel/blob/main/license)

Just my personal take on an async application kernel. It has injection management, simple module system, and a few other things.

Notable features are:

- Dependency injection
- Module with lifecycle hooks and dependency order
- Scheduled tasks with CRON and injections
- Built in event bus and respective decorators

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

## Module

```ts
@Module({
  providers: [],
  imports: [ConfigModule],
  dependsOn: [DatabaseModule],
})
export class MyModule implements IModule {
  public async onBoot() {
    // Executed in dependency order, you can setup your module here.
    // And the dependencies are already booted.
  }

  public async onStart() {
    // Runs after every module is booted.
    // Can do any async tasks here.
  }

  public async onStop() {
    // Called when a stop signal is received.
  }
}
```

## Scheduler

```ts
@Scheduler()
export class MyScheduler {
  constructor(private readonly myService: MyService) {}

  @Job({
    name: 'my-named-job',
    timings: '*/5 * * * * *',
  })
  public async myJob() {
    this.myService.doSomething();
  }
}
```

## Event Handler

```ts
@Observer()
export class MyObserver {
  constructor(private readonly myService: MyService) {}

  @On('sql.query', {
    debounce: 1_000,
  })
  public async onSqlQUery() {
    this.myService.doSomething();
  }
}
```

Once I gotta write a proper readme, but for now, this is it.
