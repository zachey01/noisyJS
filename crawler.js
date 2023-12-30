const axios = require("axios");
const { URL, parse: parseUrl, resolve: resolveUrl } = require("url");
const { JSDOM } = require("jsdom");
const chalk = require("chalk");
const { SocksProxyAgent } = require('socks-proxy-agent');


/**
 * Example Usage:
 * const crawler = new Crawler();
 * crawler.loadConfigFile("config.json");
 * crawler.setOption("timeout", 10);
 * crawler.setOption("max_depth", 3);
 * crawler.setOption("min_sleep", 1000);
 * crawler.setOption("max_sleep", 3000);
 * crawler.crawl();
 *
 * @class Crawler
 */
class Crawler {
  constructor() {
    this._config = {};
    this._links = [];
    this._startTime = null;
  }

  static CrawlerTimedOut = class extends Error {};

  async _request(url) {
    let timeout = 5000
    let agent = null
    // parse config
    const { proxy, timeout:configTimeout } = this._config
    if(proxy) {
      agent = new SocksProxyAgent(proxy)
    }
    if(configTimeout) {
      timeout = configTimeout
    }

    const randomUserAgent =
      this._config.user_agents[
        Math.floor(Math.random() * this._config.user_agents.length)
      ];
    const headers = { "user-agent": randomUserAgent };

    const response = await axios.get(url, { headers, timeout, httpAgent: agent, httpsAgent: agent });

    return response;
  }

  _normalizeLink(link, rootUrl) {
    try {
      const parsedUrl = parseUrl(link);
      const parsedRootUrl = parseUrl(rootUrl);

      if (link.startsWith("//")) {
        return `${parsedRootUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
      }

      if (!parsedUrl.protocol) {
        return resolveUrl(rootUrl, link);
      }

      return link;
    } catch (error) {
      return null;
    }
  }

  _isValidUrl(url) {
    const regex =
      /^(?:http|ftp)s?:\/\/(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?(?:\/?|[\/?]\S+)$/i;
    return regex.test(url);
  }

  _isBlacklisted(url) {
    return this._config.blacklisted_urls.some((blacklistedUrl) =>
      url.includes(blacklistedUrl)
    );
  }

  _shouldAcceptUrl(url) {
    return url && this._isValidUrl(url) && !this._isBlacklisted(url);
  }

  _extractUrls(body, rootUrl) {
    const dom = new JSDOM(body);
    const links = Array.from(dom.window.document.querySelectorAll("a")).map(
      (a) => a.href
    );
    const filteredUrls = links
      .map((link) => this._normalizeLink(link, rootUrl))
      .filter((url) => this._shouldAcceptUrl(url));

    return filteredUrls;
  }

  _removeAndBlacklist(link) {
    this._config.blacklisted_urls.push(link);
    const index = this._links.indexOf(link);
    if (index !== -1) {
      this._links.splice(index, 1);
    }
  }

  async _browseFromLinks(depth = 0) {
    const isDepthReached = depth >= this._config.max_depth;
    if (this._links.length === 0 || isDepthReached) {
      console.debug(chalk.red("Hit a dead end, moving to the next root URL"));
      return;
    }

    if (this._isTimeoutReached()) {
      throw new Crawler.CrawlerTimedOut();
    }

    const randomLink =
      this._links[Math.floor(Math.random() * this._links.length)];
    try {
      console.info(`${chalk.green.bold(`Visiting:`)} ${randomLink}`);
      const response = await this._request(randomLink);
      const subPage = response.data;
      const subLinks = this._extractUrls(subPage, randomLink);

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.random() * (this._config.max_sleep - this._config.min_sleep) +
            this._config.min_sleep
        )
      );

      if (subLinks.length > 1) {
        this._links = this._extractUrls(subPage, randomLink);
      } else {
        this._removeAndBlacklist(randomLink);
      }
    } catch (error) {
      console.debug(
        chalk.red(`Exception on URL: `) +
          chalk.bgRed(randomLink) +
          chalk.red(`, removing from list and trying again!`)
      );
      this._removeAndBlacklist(randomLink);
    }

    await this._browseFromLinks(depth + 1);
  }

  loadConfigFile(filePath) {
    const config = require(filePath);
    this.setConfig(config);
  }

  setConfig(config) {
    this._config = config;
  }

  setOption(option, value) {
    this._config[option] = value;
  }

  _isTimeoutReached() {
    const isTimeoutSet = this._config.timeout !== false;
    const endTime = new Date(
      this._startTime.getTime() + this._config.timeout * 1000
    );
    const isTimedOut = new Date() >= endTime;

    return isTimeoutSet && isTimedOut;
  }

  async crawl() {
    this._startTime = new Date();

    while (true) {
      const url =
        this._config.root_urls[
          Math.floor(Math.random() * this._config.root_urls.length)
        ];
      try {
        const response = await this._request(url);
        const body = response.data;
        this._links = this._extractUrls(body, url);
        console.debug(chalk.inverse(`found ${this._links.length} links`));
        await this._browseFromLinks();
      } catch (error) {
        return;
      }
    }
  }
}

module.exports = Crawler;
