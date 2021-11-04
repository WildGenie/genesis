'use strict';

const Command = require('../../models/Command.js');

const jokes = [
  'Joke\'s on you. Try again next time',
  'Lotus says it is certain',
  'Darvo says is decidedly so',
  'Without a doubt',
  'Yes - definitely',
  'You may rely on it',
  'As I see it, yes',
  'Most likely',
  'Outlook good',
  'Yes',
  'Signs point to yes',
  'Reply hazy, try again',
  'Ask again later',
  'Better not tell you now',
  'Cannot predict now',
  'Concentrate and ask again',
  'Don\'t count on it',
  'My reply is no',
  'My sources say no',
  'Outlook not so good',
  'Very doubtful',
];

/**
 * Tell a joke
 */
class EightBall extends Command {
  /**
   * Constructs a callable command
   * @param {Genesis} bot  The bot object
   */
  constructor(bot) {
    super(bot, 'silly.8ball', '8ball', 'Get your 8Ball question answered!', 'FUN');
    this.regex = /8ball ?(.*)?/;
  }

  async run(message) {
    if (message.strippedContent.replace(this.call, '').trim().length) {
      const resp = jokes[Math.floor(Math.random() * jokes.length)];
      await message.reply({ content: `:8ball: | ${resp}, **${message.member.displayName}**` });
      return this.messageManager.statuses.SUCCESS;
    }
    await message.reply({ content: `Gotta ask a question, **${message.member.displayName}**` });
    return this.messageManager.statuses.FAILURE;
  }
}

module.exports = EightBall;
