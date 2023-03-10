import Discord from 'discord.js'; // eslint-disable-line no-unused-vars
import FlatCache from 'flat-cache'; // eslint-disable-line no-unused-vars

import logger from '../utilities/Logger.js';
import { cachedEvents } from '../resources/index.js';
import webhook from '../utilities/Webhook.js';

export default class Broadcaster {
  #settings;
  #workerCache;
  #shardId;
  #shards;

  /**
   * Broadcast updates out to subscribing channels
   * @param {Database} settings settings object for fetching data
   *    information about current channel, guild, and bot settings
   * @param {FlatCache} workerCache cache for worker cached info
   * @param {number?} shardId  id of this shard
   */
  constructor({ settings = undefined, workerCache = undefined, shardId = undefined }) {
    this.#settings = settings;
    this.#workerCache = workerCache;
    this.#shardId = shardId;
    this.#shards = Number.parseInt(process.env.SHARDS || '0', 10);
  }

  /**
   * Broadcast embed to all channels for a platform and type
   * @param  {Discord.MessageEmbed} embed      Embed to send to a channel
   * @param  {string} platform   Platform of worldstate
   * @param  {string} type       Type of new data to notify
   * @param {string} locale locale string
   * @param  {Array}  [items=[]] Items to broadcast
   * @returns {Array.<Object>} values for successes
   */
  async broadcast(embed, { platform, type, items = [], locale }) {
    logger.silly(`broadcasting ${type} on ${platform}`);
    delete embed.bot;

    const guilds = {};
    Object.entries(this.#workerCache.getKey('guilds')).forEach(([guildId, channels]) => {
      if (typeof this.#shardId !== 'undefined' && this.#shards) {
        // eslint-disable-next-line no-bitwise
        if (this.#shardId === (guildId >> 22) % this.#shards) {
          guilds[guildId] = channels;
        }
      } else {
        guilds[guildId] = channels;
      }
    });
    const channels = cachedEvents.includes(type)
      ? this.#workerCache.getKey(`${type}:${platform}:${locale}`)
      : await this.#settings.getAgnosticNotifications({ type, platform, items, locale });
    if (!channels?.length) {
      logger.error(`No channels on ${platform}:${locale} tracking ${type}... continuing`, 'WS');
      return;
    }

    await Promise.all(
      channels.map(async ({ channelId, threadId }) => {
        if (typeof channelId === 'undefined' || !channelId.length) return;
        const ctx = await this.#settings.getCommandContext(channelId);
        ctx.threadId = threadId;

        // localeCompare should return 0 if equal, so non-zero's will be truthy
        if (embed.locale && ctx.language.localeCompare(embed.locale)) {
          return;
        }

        const guildList = Object.entries(guilds).filter(([, g]) => g.channels && g.channels.includes(channelId))[0];
        const guild = guildList && guildList.length ? guildList[1] : undefined;

        if (!guild) {
          logger.info(`couldn't find guild for ${type} on ${channelId}`);
          return;
        }

        try {
          const pingKey = `${guild.id}:${[type].concat((items || []).sort()).join(',')}`;
          /** @type {string} */
          const content = this.#workerCache.getKey('pings')[pingKey] || '';
          await webhook(ctx, { content, embeds: [embed] });
        } catch (e) {
          if (e.message) {
            if (e.message.includes('Unknown Webhook')) {
              logger.warn(`Wiping webhook context for ${channelId}`);
              await this.#settings.deleteWebhooksForChannel(channelId);
            }
            if (e.name === 'AbortError') {
              // ignore
            }
          } else {
            logger.error(e);
          }
        }
      })
    );
  }
}
