# [WIP] Natours API

This project and this README are under development.

This repository implements [this Udemy Course](https://udemy.com/course/nodejs-express-mongodb-bootcamp/learn/) by Jonas Schmedtmann. Original project uses JavaScript, but this repo uses TypeScript. Other tools used:

1. Express
2. MongoDB & Mongoose

## How to Start

1. Ask repo owner for the secrets
2. Copy the secrets in `.env` file
3. Install dependencies

```bash
$ npm install
```

> ⚠️ Be sure that you're using node v20.10, `nvm use`

4. Provision MongoDB via docker:

Go to directory `natours-db` then run:

```bash
$ docker build -t mongo_seeder .
$ docker-compose up -d
```

## Running the app

```bash
# development
$ npm run start:dev
```

## Roadmap

1. Pin 3rd party libraries to a specific version
2. Unit, integration, e2e testing
3. Implement Snyk, Promotheus, & Grafana
