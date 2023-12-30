#!/usr/bin/env node
const argparse = require("argparse");
const axios = require("axios");
const { URL, parse: parseUrl, resolve: resolveUrl } = require("url");
const { JSDOM } = require("jsdom");
const chalk = require("chalk");
const Crawler = require("./crawler");

function main() {
  const parser = new argparse.ArgumentParser();
  parser.addArgument("--config", "-c", {
    type: "string",
    help: "config file",
    required: false,
  });
  const args = parser.parseArgs();
  const crawler = new Crawler();
  if (args.config === undefined) {
    crawler.loadConfigFile("./config.json");
  } else {
    crawler.loadConfigFile(args.config);
  }
  crawler.crawl();
}

console.log(chalk.bold.cyan("\nNoisyJS\n"));

main();
